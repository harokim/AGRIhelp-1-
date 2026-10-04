import {
  createContext,
  useContext,
  useEffect,
  useState
} from "react";
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
  where
} from "firebase/firestore";
import {
  db,
  firebaseConfigured
} from "../firebase";
import {
  sendSemaphoreSMS
} from "../services/semaphoreService";
import {
  loadDocumentData
} from "../services/documentService";
import { useAuth } from "./AuthContext";

const RequestContext =
  createContext(null);

const MAX_DOCUMENT_SIZE =
  5 * 1024 * 1024;

const ALLOWED_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg"
];

const ALLOWED_EXTENSIONS =
  /\.(pdf|png|jpe?g)$/i;

function mapSnapshot(snapshot) {
  return {
    id: snapshot.id,
    ...snapshot.data()
  };
}

function localDateISO() {
  const date = new Date();

  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1
    ).padStart(2, "0");

  const day =
    String(
      date.getDate()
    ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

async function notifyClient(
  clientId,
  title,
  message,
  requestId
) {
  if (!clientId) {
    return;
  }

  await addDoc(
    collection(
      db,
      "notifications"
    ),
    {
      userId: clientId,
      title,
      message,
      requestId,
      read: false,
      createdAt:
        serverTimestamp()
    }
  );

  try {
    const client =
      await getDoc(
        doc(
          db,
          "users",
          clientId
        )
      );

    const phoneNumber =
      client.exists()
        ? client.data()
            .contactNumber
        : "";

    if (phoneNumber) {
      try {
        await sendSemaphoreSMS({
          phoneNumber,
          message: `AGRIhelp: ${message}`
        });
      } catch {}
    }
  } catch {}
}

export function RequestProvider({
  children
}) {
  const { user } =
    useAuth();

  const [
    requests,
    setRequests
  ] = useState([]);

  const [
    documents,
    setDocuments
  ] = useState([]);

  const [
    reportDocuments,
    setReportDocuments
  ] = useState([]);

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
      collection(
        db,
        "requests"
      );

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

    const unsubscribeRequests =
      onSnapshot(
        requestQuery,
        (snapshot) => {
          const next =
            snapshot.docs
              .map(mapSnapshot)
              .sort(
                (a, b) =>
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
              );

          setRequests(next);
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

    const unsubscribeDocuments =
      onSnapshot(
        documentQuery,
        async (snapshot) => {
          const next =
            snapshot.docs.map(
              mapSnapshot
            );

          const withData =
            await Promise.all(
              next.map(
                async (
                  document
                ) => {
                  try {
                    const data =
                      await loadDocumentData(
                        document
                      );

                    return {
                      ...document,
                      data
                    };
                  } catch {
                    return document;
                  }
                }
              )
            );

          setDocuments(
            withData
          );
        },
        () => {
          setDocuments([]);
        }
      );

    let unsubscribeReportDocuments =
      () => {};

    if (
      user.role === "engineer"
    ) {
      unsubscribeReportDocuments =
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
    }

    return () => {
      unsubscribeRequests();
      unsubscribeDocuments();
      unsubscribeReportDocuments();
    };
  }, [
    user?.id,
    user?.role
  ]);

  const createRequest =
    async (data) => {
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

      const requestType =
        String(
          data?.requestType ||
            ""
        ).trim();

      if (!details) {
        throw new Error(
          "A request description is required."
        );
      }

      if (!requestType) {
        throw new Error(
          "A request type is required."
        );
      }

      if (!data?.clientId) {
        throw new Error(
          "The client account could not be identified."
        );
      }

      if (!data?.association) {
        throw new Error(
          "Your account does not have an assigned association."
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
          localDateISO(),
        createdAtTimestamp:
          serverTimestamp(),
        updatedAt:
          serverTimestamp()
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
        ...requestData
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
        "Under Review"
      ].includes(
        current.status
      )
    ) {
      return;
    }

    const requestDocuments =
      documents.filter(
        (document) =>
          document.requestId === id
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
            serverTimestamp()
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

    const cleanNote =
      String(
        note || ""
      ).trim();

    if (
      status ===
        "Documents Pending" &&
      !cleanNote
    ) {
      throw new Error(
        "Please explain which documents or corrections are needed."
      );
    }

    const notes =
      status ===
      "Documents Pending" ||
      status === "Rejected"
        ? cleanNote
        : current.notes ||
          "";

    await updateDoc(
      doc(
        db,
        "requests",
        id
      ),
      {
        status,
        notes,
        updatedAt:
          serverTimestamp()
      }
    );

    let message;

    if (
      status ===
      "Documents Pending"
    ) {
      message =
        `Additional documents or corrections are needed: ${cleanNote}`;
    } else if (
      status === "Rejected"
    ) {
      message =
        `Your request was rejected. Reason: ${cleanNote}`;
    } else {
      message =
        `Your request ${
          current.referenceNumber ||
          id
        } is now ${status}.`;
    }

    await notifyClient(
      current.clientId,
      `Request ${status}`,
      message,
      id
    );
  };

  const updateRequest =
    async (
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
            serverTimestamp()
        }
      );
    };

  const deleteRequest =
    async (id) => {
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

      const documentSnapshot =
        await getDocs(
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
          )
        );

      await Promise.all(
        documentSnapshot.docs.map(
          async (
            documentSnapshot
          ) => {
            const chunkSnapshot =
              await getDocs(
                collection(
                  db,
                  "documents",
                  documentSnapshot.id,
                  "chunks"
                )
              );

            await Promise.all(
              chunkSnapshot.docs.map(
                (chunk) =>
                  deleteDoc(
                    doc(
                      db,
                      "documents",
                      documentSnapshot.id,
                      "chunks",
                      chunk.id
                    )
                  )
              )
            );

            await deleteDoc(
              doc(
                db,
                "documents",
                documentSnapshot.id
              )
            );
          }
        )
      );

      const reportSnapshot =
        await getDocs(
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
          )
        );

      await Promise.all(
        reportSnapshot.docs.map(
          (
            snapshot
          ) =>
            deleteDoc(
              doc(
                db,
                "reportDocuments",
                snapshot.id
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
            item.id === requestId
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

      const fileData =
        String(
          data?.data || ""
        );

      const fileSize =
        Number(
          data?.fileSize || 0
        );

      const contentType =
        String(
          data?.contentType ||
            ""
        ).trim();

      if (!fileName) {
        throw new Error(
          "A file name is required."
        );
      }

      if (!fileData) {
        throw new Error(
          "The selected file could not be read."
        );
      }

      if (
        fileSize <= 0 ||
        fileSize >
          MAX_DOCUMENT_SIZE
      ) {
        throw new Error(
          "The selected file must be between 1 byte and 5 MB."
        );
      }

      const validType =
        ALLOWED_TYPES.includes(
          contentType
        );

      const validExtension =
        ALLOWED_EXTENSIONS.test(
          fileName
        );

      if (
        !validType &&
        !validExtension
      ) {
        throw new Error(
          "Only PDF, PNG, and JPG files can be added."
        );
      }

      const separator =
        fileData.indexOf(",");

      if (
        separator === -1
      ) {
        throw new Error(
          "The selected file could not be processed."
        );
      }

      const header =
        fileData.slice(
          0,
          separator
        );

      const body =
        fileData.slice(
          separator + 1
        );

      const chunkSize =
        500 * 1024;

      const chunkCount =
        Math.ceil(
          body.length /
            chunkSize
        );

      const reportDocument = {
        requestId,
        engineerId:
          user.id,
        fileName,
        contentType:
          contentType ||
          "application/octet-stream",
        fileSize,
        dataHeader: header,
        chunkCount,
        uploadedBy:
          user.id,
        uploadedByName:
          user.name ||
          user.displayName ||
          "Engineer",
        createdAt:
          serverTimestamp()
      };

      const reportRef =
        await addDoc(
          collection(
            db,
            "reportDocuments"
          ),
          reportDocument
        );

      for (
        let index = 0;
        index < chunkCount;
        index++
      ) {
        const start =
          index *
          chunkSize;

        await updateDoc(
          doc(
            db,
            "reportDocuments",
            reportRef.id
          ),
          {
            updatedAt:
              serverTimestamp()
          }
        );

        await addDoc(
          collection(
            db,
            "reportDocuments",
            reportRef.id,
            "chunks"
          ),
          {
            index,
            data: body.slice(
              start,
              start +
                chunkSize
            )
          }
        );
      }

      return {
        id:
          reportRef.id,
        ...reportDocument
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

      const report =
        reportDocuments.find(
          (item) =>
            item.id === id
        );

      if (!report) {
        throw new Error(
          "The report document could not be found."
        );
      }

      if (
        report.uploadedBy &&
        report.uploadedBy !==
          user.id
      ) {
        throw new Error(
          "You can only remove report documents that you uploaded."
        );
      }

      const chunks =
        await getDocs(
          collection(
            db,
            "reportDocuments",
            id,
            "chunks"
          )
        );

      await Promise.all(
        chunks.docs.map(
          (chunk) =>
            deleteDoc(
              doc(
                db,
                "reportDocuments",
                id,
                "chunks",
                chunk.id
              )
            )
        )
      );

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
        deleteReportDocument
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