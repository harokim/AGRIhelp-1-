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

  const [requests, setRequests] = useState([]);
  const [documents, setDocuments] = useState([]);

  useEffect(() => {
    if (
      !firebaseConfigured ||
      !db ||
      !user?.id
    ) {
      setRequests([]);
      setDocuments([]);
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

    return () => {
      unsubRequests();
      unsubDocs();
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

    const referenceNumber =
      `REQ-${Date.now()
        .toString()
        .slice(-8)}`;

    const requestData = {
      ...data,
      details,
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

    await deleteDoc(
      doc(
        db,
        "requests",
        id
      )
    );
  };

  return (
    <RequestContext.Provider
      value={{
        requests,
        documents,
        createRequest,
        decide,
        updateRequest,
        deleteRequest,
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