import { createContext, useContext, useEffect, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db, firebaseConfigured } from "../firebase";
import { sendSemaphoreSMS } from "../services/semaphoreService";
import { useAuth } from "./AuthContext";

const RequestContext = createContext(null);

const MAX_DOCUMENT_SIZE =
  5 * 1024 * 1024;

function mapSnapshot(snapshot) {
  return {
    id: snapshot.id,
    ...snapshot.data(),
  };
}

async function notifyClient(
  clientId,
  title,
  message,
  requestId
) {
  await addDoc(
    collection(db, "notifications"),
    {
      userId: clientId,
      title,
      message,
      requestId,
      read: false,
      createdAt: serverTimestamp(),
    }
  );

  const client = await getDoc(
    doc(db, "users", clientId)
  );

  const phoneNumber = client.exists()
    ? client.data().contactNumber
    : "";

  if (phoneNumber) {
    try {
      await sendSemaphoreSMS({
        phoneNumber,
        message: `AGRIhelp: ${message}`,
      });
    } catch {}
  }
}

export function RequestProvider({ children }) {
  const { user } = useAuth();

  const [requests, setRequests] =
    useState([]);

  const [documents, setDocuments] =
    useState([]);

  const [reportDocuments, setReportDocuments] =
    useState([]);

  useEffect(() => {
    if (
      !firebaseConfigured ||
      !db ||
      !user?.id
    ) {
      setRequests([]);
      setDocuments([]);
      setReportDocuments([]);
      return;
    }

    const requestsRef =
      collection(db, "requests");

    const requestQuery =
      user.role === "engineer"
        ? requestsRef
        : query(
            requestsRef,
            where(
              "clientId",
              "==",
              user.id
            )
          );

    const unsubRequests =
      onSnapshot(
        requestQuery,
        (snapshot) => {
          setRequests(
            snapshot.docs
              .map(mapSnapshot)
              .sort((a, b) =>
                String(
                  b.createdAtTimestamp ||
                    b.createdAt ||
                    ""
                ).localeCompare(
                  String(
                    a.createdAtTimestamp ||
                      a.createdAt ||
                      ""
                  )
                )
              )
          );
        },
        () => {
          setRequests([]);
        }
      );

    const documentQuery =
      user.role === "engineer"
        ? collection(
            db,
            "documents"
          )
        : query(
            collection(
              db,
              "documents"
            ),
            where(
              "clientId",
              "==",
              user.id
            )
          );

    const unsubDocs =
      onSnapshot(
        documentQuery,
        (snapshot) => {
          setDocuments(
            snapshot.docs.map(
              mapSnapshot
            )
          );
        },
        () => {
          setDocuments([]);
        }
      );

    let unsubReportDocs =
      () => {};

    if (user.role === "engineer") {
      unsubReportDocs =
        onSnapshot(
          collection(
            db,
            "reportDocuments"
          ),
          (snapshot) => {
            setReportDocuments(
              snapshot.docs.map(
                mapSnapshot
              )
            );
          },
          () => {
            setReportDocuments([]);
          }
        );
    } else {
      setReportDocuments([]);
    }

    return () => {
      unsubRequests();
      unsubDocs();
      unsubReportDocs();
    };
  }, [
    user?.id,
    user?.role,
  ]);

  const createRequest = async (
    data
  ) => {
    if (
      !firebaseConfigured ||
      !db
    ) {
      throw new Error(
        "Firebase is not configured yet."
      );
    }

    const details =
      String(
        data?.details || ""
      ).trim();

    if (!details) {
      throw new Error(
        "A request description is required."
      );
    }

    const requestType =
      String(
        data?.requestType || ""
      ).trim();

    if (!requestType) {
      throw new Error(
        "A type of request is required."
      );
    }

    const referenceNumber =
      `REQ-${Date.now()
        .toString()
        .slice(-8)}`;

    const requestData = {
      ...data,
      details,
      requestType,
      referenceNumber,
      status: "Submitted",
      notes: "",
      createdAt:
        new Date()
          .toISOString()
          .slice(0, 10),
      createdAtTimestamp:
        serverTimestamp(),
      updatedAt:
        serverTimestamp(),
    };

    const requestRef =
      await addDoc(
        collection(
          db,
          "requests"
        ),
        requestData
      );

    return {
      id: requestRef.id,
      ...requestData,
    };
  };

  const decide = async (
    id,
    status,
    note = ""
  ) => {
    const current =
      requests.find(
        (request) =>
          request.id === id
      );

    if (
      !current ||
      ![
        "Submitted",
        "Under Review",
      ].includes(
        current.status
      )
    ) {
      return;
    }

    const requestDocuments =
      documents.filter(
        (document) =>
          document.requestId ===
          id
      );

    const hasDetails =
      Boolean(
        String(
          current.details || ""
        ).trim()
      );

    const hasDocuments =
      requestDocuments.length >
      0;

    if (
      status === "Approved" &&
      (!hasDetails ||
        !hasDocuments)
    ) {
      const rejectionNote =
        !hasDetails &&
        !hasDocuments
          ? "The application was rejected because it has no request description and no attached documents."
          : !hasDetails
          ? "The application was rejected because no request description was provided."
          : "The application was rejected because no supporting documents were attached.";

      await updateDoc(
        doc(
          db,
          "requests",
          id
        ),
        {
          status: "Rejected",
          notes:
            rejectionNote,
          updatedAt:
            serverTimestamp(),
        }
      );

      await notifyClient(
        current.clientId,
        "Request Rejected",
        rejectionNote,
        id
      );

      return;
    }

    await updateDoc(
      doc(
        db,
        "requests",
        id
      ),
      {
        status,
        notes:
          status ===
          "Documents Pending"
            ? note
            : current.notes ||
              "",
        updatedAt:
          serverTimestamp(),
      }
    );

    const label =
      status ===
      "Documents Pending"
        ? `Additional documents are needed. ${note}`
        : `Your request ${
            current.referenceNumber ||
            id
          } is now ${status}.`;

    await notifyClient(
      current.clientId,
      `Request ${status}`,
      label,
      id
    );
  };

  const updateRequest = async (
    id,
    patch
  ) => {
    if (
      !firebaseConfigured ||
      !db
    ) {
      throw new Error(
        "Firebase is not configured yet."
      );
    }

    await updateDoc(
      doc(
        db,
        "requests",
        id
      ),
      {
        ...patch,
        updatedAt:
          serverTimestamp(),
      }
    );
  };

  const deleteRequest = async (
    id
  ) => {
    if (
      !firebaseConfigured ||
      !db
    ) {
      throw new Error(
        "Firebase is not configured yet."
      );
    }

    const request =
      requests.find(
        (item) =>
          item.id === id
      );

    if (!request) {
      throw new Error(
        "The request could not be found."
      );
    }

    if (
      user?.role !==
        "engineer" &&
      request.clientId !==
        user?.id
    ) {
      throw new Error(
        "You are not allowed to delete this request."
      );
    }

    const documentQuery =
      query(
        collection(
          db,
          "documents"
        ),
        where(
          "requestId",
          "==",
          id
        )
      );

    const documentSnapshot =
      await getDocs(
        documentQuery
      );

    await Promise.all(
      documentSnapshot.docs.map(
        (documentSnapshot) =>
          deleteDoc(
            doc(
              db,
              "documents",
              documentSnapshot.id
            )
          )
      )
    );

    const reportDocumentQuery =
      query(
        collection(
          db,
          "reportDocuments"
        ),
        where(
          "requestId",
          "==",
          id
        )
      );

    const reportDocumentSnapshot =
      await getDocs(
        reportDocumentQuery
      );

    await Promise.all(
      reportDocumentSnapshot.docs.map(
        (
          reportDocumentSnapshot
        ) =>
          deleteDoc(
            doc(
              db,
              "reportDocuments",
              reportDocumentSnapshot.id
            )
          )
      )
    );

    await deleteDoc(
      doc(
        db,
        "requests",
        id
      )
    );
  };

  const addReportDocument =
    async (data) => {
      if (
        !firebaseConfigured ||
        !db
      ) {
        throw new Error(
          "Firebase is not configured yet."
        );
      }

      if (
        user?.role !==
        "engineer"
      ) {
        throw new Error(
          "Only engineers can add report documents."
        );
      }

      const requestId =
        String(
          data?.requestId || ""
        ).trim();

      if (!requestId) {
        throw new Error(
          "A request must be selected first."
        );
      }

      const request =
        requests.find(
          (item) =>
            item.id ===
            requestId
        );

      if (!request) {
        throw new Error(
          "The selected request could not be found."
        );
      }

      if (
        request.status !==
        "Approved"
      ) {
        throw new Error(
          "Report documents can only be added to approved requests."
        );
      }

      const fileName =
        String(
          data?.fileName || ""
        ).trim();

      if (!fileName) {
        throw new Error(
          "A file name is required."
        );
      }

      const fileData =
        String(
          data?.data || ""
        );

      if (!fileData) {
        throw new Error(
          "The selected file does not contain readable data."
        );
      }

      const fileSize =
        Number(
          data?.fileSize || 0
        );

      if (
        fileSize <= 0
      ) {
        throw new Error(
          "The selected file has an invalid size."
        );
      }

      if (
        fileSize >
        MAX_DOCUMENT_SIZE
      ) {
        throw new Error(
          "The selected file is larger than the 5 MB limit."
        );
      }

      const contentType =
        String(
          data?.contentType ||
            ""
        ).trim();

      const validTypes = [
        "application/pdf",
        "image/png",
        "image/jpeg",
      ];

      const validExtension =
        /\.(pdf|png|jpe?g)$/i.test(
          fileName
        );

      if (
        !validTypes.includes(
          contentType
        ) &&
        !validExtension
      ) {
        throw new Error(
          "Only PDF, PNG, and JPG files can be added."
        );
      }

      const reportDocument =
        {
          requestId,
          engineerId:
            user.id,
          fileName,
          contentType:
            contentType ||
            (
              fileName
                .toLowerCase()
                .endsWith(".pdf")
                ? "application/pdf"
                : fileName
                    .toLowerCase()
                    .endsWith(".png")
                ? "image/png"
                : "image/jpeg"
            ),
          fileSize,
          data: fileData,
          uploadedBy:
            user.id,
          uploadedByName:
            user.name ||
            user.displayName ||
            "Engineer",
          createdAt:
            serverTimestamp(),
        };

      const reportDocumentRef =
        await addDoc(
          collection(
            db,
            "reportDocuments"
          ),
          reportDocument
        );

      return {
        id:
          reportDocumentRef.id,
        ...reportDocument,
      };
    };

  const deleteReportDocument =
    async (id) => {
      if (
        !firebaseConfigured ||
        !db
      ) {
        throw new Error(
          "Firebase is not configured yet."
        );
      }

      if (
        user?.role !==
        "engineer"
      ) {
        throw new Error(
          "Only engineers can remove report documents."
        );
      }

      if (!id) {
        throw new Error(
          "The report document could not be identified."
        );
      }

      const reportDocument =
        reportDocuments.find(
          (item) =>
            item.id === id
        );

      if (!reportDocument) {
        throw new Error(
          "The report document could not be found."
        );
      }

      if (
        reportDocument.uploadedBy &&
        reportDocument.uploadedBy !==
          user.id
      ) {
        throw new Error(
          "You can only remove report documents that you uploaded."
        );
      }

      await deleteDoc(
        doc(
          db,
          "reportDocuments",
          id
        )
      );
    };

  return (
    <RequestContext.Provider
      value={{
        requests,
        documents,
        reportDocuments,
        createRequest,
        decide,
        updateRequest,
        deleteRequest,
        addReportDocument,
        deleteReportDocument,
      }}
    >
      {children}
    </RequestContext.Provider>
  );
}

export const useRequests =
  () =>
    useContext(
      RequestContext
    );