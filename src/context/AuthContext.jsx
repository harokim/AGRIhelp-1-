
import {
  createContext,
  useContext,
  useEffect,
  useState
} from "react";

import {
  createUserWithEmailAndPassword,
  deleteUser as deleteFirebaseUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile as updateAuthProfile
} from "firebase/auth";

import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch
} from "firebase/firestore";

import {
  auth,
  db,
  secondaryAuth,
  firebaseConfigured
} from "../firebase";

const AuthContext = createContext(null);

function mapUser(snapshot) {
  return {
    id: snapshot.id,
    ...snapshot.data()
  };
}

function friendlyFirebaseError(error) {
  const code = error?.code || "";

  if (
    code === "permission-denied" ||
    code === "PERMISSION_DENIED" ||
    code === "firestore/permission-denied"
  ) {
    return new Error(
      "You do not have permission to perform this action. Check your account role and Firestore security rules."
    );
  }

  if (code === "auth/invalid-credential") {
    return new Error("Invalid email or password.");
  }

  if (code === "auth/user-not-found") {
    return new Error("No account was found with this email.");
  }

  if (code === "auth/wrong-password") {
    return new Error("Invalid email or password.");
  }

  if (code === "auth/too-many-requests") {
    return new Error(
      "Too many login attempts. Please try again later."
    );
  }

  if (code === "auth/email-already-in-use") {
    return new Error(
      "An account with this email already exists."
    );
  }

  if (code === "auth/invalid-email") {
    return new Error("Please enter a valid email address.");
  }

  if (code === "auth/weak-password") {
    return new Error("The password is too weak.");
  }

  if (code === "auth/network-request-failed") {
    return new Error(
      "Network error. Check your internet connection and try again."
    );
  }

  if (error?.message) {
    return new Error(error.message);
  }

  return new Error("Something went wrong. Please try again.");
}

async function deleteRefsInBatches(refs) {
  if (!db || !refs?.length) {
    return;
  }

  const uniqueRefs = Array.from(
    new Map(refs.map((ref) => [ref.path, ref])).values()
  );

  const batchSize = 450;

  for (
    let start = 0;
    start < uniqueRefs.length;
    start += batchSize
  ) {
    const batch = writeBatch(db);
    const currentRefs = uniqueRefs.slice(
      start,
      start + batchSize
    );

    currentRefs.forEach((ref) => batch.delete(ref));
    await batch.commit();
  }
}

async function deleteSubcollection(collectionPath, parentId) {
  if (!db || !parentId) {
    return;
  }

  const snapshot = await getDocs(
    collection(db, collectionPath, parentId, "chunks")
  );

  if (!snapshot.empty) {
    await deleteRefsInBatches(
      snapshot.docs.map((item) =>
        doc(
          db,
          collectionPath,
          parentId,
          "chunks",
          item.id
        )
      )
    );
  }
}

async function deleteDocumentRecords(documents) {
  if (!db || !documents?.length) {
    return;
  }

  const refs = [];

  for (const item of documents) {
    const chunks = await getDocs(
      collection(db, "documents", item.id, "chunks")
    );

    chunks.docs.forEach((chunk) => {
      refs.push(
        doc(db, "documents", item.id, "chunks", chunk.id)
      );
    });

    refs.push(doc(db, "documents", item.id));
  }

  await deleteRefsInBatches(refs);
}

async function deleteReportDocumentRecords(reports) {
  if (!db || !reports?.length) {
    return;
  }

  const refs = [];

  for (const item of reports) {
    const chunks = await getDocs(
      collection(db, "reportDocuments", item.id, "chunks")
    );

    chunks.docs.forEach((chunk) => {
      refs.push(
        doc(
          db,
          "reportDocuments",
          item.id,
          "chunks",
          chunk.id
        )
      );
    });

    refs.push(doc(db, "reportDocuments", item.id));
  }

  await deleteRefsInBatches(refs);
}

async function deleteClientData(clientId) {
  if (!db || !clientId) {
    return;
  }

  const requestSnapshot = await getDocs(
    query(
      collection(db, "requests"),
      where("clientId", "==", clientId)
    )
  );

  const requestIds = requestSnapshot.docs.map(
    (item) => item.id
  );

  const documentMap = new Map();

  const clientDocumentsSnapshot = await getDocs(
    query(
      collection(db, "documents"),
      where("clientId", "==", clientId)
    )
  );

  clientDocumentsSnapshot.docs.forEach((item) => {
    documentMap.set(item.id, item);
  });

  for (const requestId of requestIds) {
    const requestDocumentsSnapshot = await getDocs(
      query(
        collection(db, "documents"),
        where("requestId", "==", requestId)
      )
    );

    requestDocumentsSnapshot.docs.forEach((item) => {
      documentMap.set(item.id, item);
    });
  }

  await deleteDocumentRecords(
    Array.from(documentMap.values())
  );

  const reportMap = new Map();

  for (const requestId of requestIds) {
    const reportSnapshot = await getDocs(
      query(
        collection(db, "reportDocuments"),
        where("requestId", "==", requestId)
      )
    );

    reportSnapshot.docs.forEach((item) => {
      reportMap.set(item.id, item);
    });
  }

  await deleteReportDocumentRecords(
    Array.from(reportMap.values())
  );

  if (requestSnapshot.docs.length) {
    await deleteRefsInBatches(
      requestSnapshot.docs.map((item) =>
        doc(db, "requests", item.id)
      )
    );
  }

  const appointmentSnapshot = await getDocs(
    query(
      collection(db, "appointments"),
      where("clientId", "==", clientId)
    )
  );

  const appointmentIds = appointmentSnapshot.docs.map(
    (item) => item.id
  );

  const appointmentNotificationRefs = [];

  for (const appointmentId of appointmentIds) {
    const notificationSnapshot = await getDocs(
      query(
        collection(db, "notifications"),
        where("appointmentId", "==", appointmentId)
      )
    );

    notificationSnapshot.docs.forEach((item) => {
      appointmentNotificationRefs.push(
        doc(db, "notifications", item.id)
      );
    });
  }

  if (appointmentSnapshot.docs.length) {
    await deleteRefsInBatches(
      appointmentSnapshot.docs.map((item) =>
        doc(db, "appointments", item.id)
      )
    );
  }

  const notificationSnapshot = await getDocs(
    query(
      collection(db, "notifications"),
      where("userId", "==", clientId)
    )
  );

  const notificationRefs = notificationSnapshot.docs.map(
    (item) => doc(db, "notifications", item.id)
  );

  await deleteRefsInBatches([
    ...notificationRefs,
    ...appointmentNotificationRefs
  ]);

  const messageSnapshot = await getDocs(
    query(
      collection(db, "messages"),
      where("participants", "array-contains", clientId)
    )
  );

  if (!messageSnapshot.empty) {
    await deleteRefsInBatches(
      messageSnapshot.docs.map((item) =>
        doc(db, "messages", item.id)
      )
    );
  }
}

async function deleteEngineerData(engineerId) {
  if (!db || !engineerId) {
    return;
  }

  const appointmentSnapshot = await getDocs(
    query(
      collection(db, "appointments"),
      where("createdBy", "==", engineerId)
    )
  );

  const appointmentIds = appointmentSnapshot.docs.map(
    (item) => item.id
  );

  const appointmentNotificationRefs = [];

  for (const appointmentId of appointmentIds) {
    const notificationSnapshot = await getDocs(
      query(
        collection(db, "notifications"),
        where("appointmentId", "==", appointmentId)
      )
    );

    notificationSnapshot.docs.forEach((item) => {
      appointmentNotificationRefs.push(
        doc(db, "notifications", item.id)
      );
    });
  }

  if (appointmentSnapshot.docs.length) {
    await deleteRefsInBatches(
      appointmentSnapshot.docs.map((item) =>
        doc(db, "appointments", item.id)
      )
    );
  }

  const reportMap = new Map();

  const uploadedReportsSnapshot = await getDocs(
    query(
      collection(db, "reportDocuments"),
      where("uploadedBy", "==", engineerId)
    )
  );

  uploadedReportsSnapshot.docs.forEach((item) => {
    reportMap.set(item.id, item);
  });

  const engineerReportsSnapshot = await getDocs(
    query(
      collection(db, "reportDocuments"),
      where("engineerId", "==", engineerId)
    )
  );

  engineerReportsSnapshot.docs.forEach((item) => {
    reportMap.set(item.id, item);
  });

  await deleteReportDocumentRecords(
    Array.from(reportMap.values())
  );

  const notificationSnapshot = await getDocs(
    query(
      collection(db, "notifications"),
      where("userId", "==", engineerId)
    )
  );

  const notificationRefs = notificationSnapshot.docs.map(
    (item) => doc(db, "notifications", item.id)
  );

  await deleteRefsInBatches([
    ...notificationRefs,
    ...appointmentNotificationRefs
  ]);

  const messageSnapshot = await getDocs(
    query(
      collection(db, "messages"),
      where("participants", "array-contains", engineerId)
    )
  );

  if (!messageSnapshot.empty) {
    await deleteRefsInBatches(
      messageSnapshot.docs.map((item) =>
        doc(db, "messages", item.id)
      )
    );
  }

  const blockedDateSnapshot = await getDocs(
    query(
      collection(db, "blockedDates"),
      where("createdBy", "==", engineerId)
    )
  );

  if (!blockedDateSnapshot.empty) {
    await deleteRefsInBatches(
      blockedDateSnapshot.docs.map((item) =>
        doc(db, "blockedDates", item.id)
      )
    );
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firebaseConfigured || !auth || !db) {
      setUser(null);
      setLoading(false);
      return undefined;
    }

    return onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const snapshot = await getDoc(
          doc(db, "users", firebaseUser.uid)
        );

        
        if (!snapshot.exists()) {
          await signOut(auth);
          setUser(null);
          setLoading(false);
          return;
        }

        const profile = mapUser(snapshot);

        if (profile.status === "inactive") {
          if (profile.role === "client") {
            try {
              await deleteClientData(firebaseUser.uid);
            } catch (cleanupError) {
              console.error(
                "Could not clean up inactive client data:",
                cleanupError
              );
            }
          }

          await signOut(auth);
          setUser(null);
        } else {
          setUser(profile);
        }
      } catch (error) {
        console.error("Could not load user profile:", error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    });
  }, []);

  useEffect(() => {
    if (!firebaseConfigured || !db || !user?.id) {
      setUsers([]);
      return undefined;
    }

    const usersRef = collection(db, "users");

    const userQuery =
      user.role === "engineer"
        ? usersRef
        : query(usersRef, where("role", "==", "engineer"));

    return onSnapshot(
      userQuery,
      (snapshot) => {
        const mappedUsers = snapshot.docs.map(mapUser);

        setUsers(
          mappedUsers.filter(
            (item) => item.status !== "inactive"
          )
        );
      },
      (error) => {
        console.error("Could not load users:", error);
        setUsers([]);
      }
    );
  }, [user?.id, user?.role]);

  const login = async (email, password) => {
    if (!firebaseConfigured || !auth || !db) {
      throw new Error(
        "Firebase is not configured yet. Create a .env file from .env.example and add your Firebase Web App settings."
      );
    }

    try {
      const credential = await signInWithEmailAndPassword(
        auth,
        String(email).trim().toLowerCase(),
        password
      );

      const snapshot = await getDoc(
        doc(db, "users", credential.user.uid)
      );

      if (!snapshot.exists()) {
        await signOut(auth);
        throw new Error(
          "Your account profile has not been created."
        );
      }

      const profile = mapUser(snapshot);

      if (profile.status === "inactive") {
        if (profile.role === "client") {
          try {
            await deleteClientData(credential.user.uid);
          } catch (cleanupError) {
            console.error(
              "Could not clean up inactive client data:",
              cleanupError
            );
          }
        }

        await signOut(auth);
        throw new Error("This account is inactive.");
      }

      setUser(profile);
      return profile;
    } catch (error) {
      throw friendlyFirebaseError(error);
    }
  };

  
  const register = async (data, role) => {
    if (!firebaseConfigured || !auth || !db) {
      throw new Error(
        "Firebase is not configured yet. Create a .env file from .env.example and add your Firebase Web App settings."
      );
    }

    const email = String(data.email || "")
      .trim()
      .toLowerCase();

    let credential = null;

    try {
      credential = await createUserWithEmailAndPassword(
        auth,
        email,
        data.password
      );

      const profile = {
        name: data.name || "",
        email,
        role,
        contactNumber: data.contactNumber || "",
        association: data.association || "",
        address: data.address || data.officeAddress || "",
        officeAddress: data.officeAddress || "",
        barangay: data.barangay || "",
        municipality: data.municipality || "",
        province: data.province || "",
        region: data.region || "",
        position: data.position || "",
        profileBio: data.profileBio || "",
        status: "active",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await setDoc(
        doc(db, "users", credential.user.uid),
        profile
      );

      await updateAuthProfile(credential.user, {
        displayName: profile.name
      });

      await signOut(auth);

      return {
        id: credential.user.uid,
        ...profile
      };
    } catch (error) {
      if (credential?.user) {
        try {
          await deleteFirebaseUser(credential.user);
        } catch (cleanupError) {
          console.error(
            "Could not clean up registration account:",
            cleanupError
          );
        }
      }

      if (auth.currentUser) {
        try {
          await signOut(auth);
        } catch (signOutError) {
          console.error(
            "Could not sign out after registration failure:",
            signOutError
          );
        }
      }

      throw friendlyFirebaseError(error);
    }
  };

  const registerClientByEngineer = async (data) => {
    if (
      !firebaseConfigured ||
      !auth ||
      !secondaryAuth ||
      !db
    ) {
      throw new Error("Firebase is not configured.");
    }

    const engineer = auth.currentUser;

    if (!engineer) {
      throw new Error(
        "You must be signed in as an engineer."
      );
    }

    let credential = null;
    let profileCreated = false;

    try {
      const engineerSnapshot = await getDoc(
        doc(db, "users", engineer.uid)
      );

      if (
        !engineerSnapshot.exists() ||
        engineerSnapshot.data().role !== "engineer" ||
        engineerSnapshot.data().status !== "active"
      ) {
        throw new Error(
          "Only an active engineer can create client accounts."
        );
      }

      const email = String(data.email || "")
        .trim()
        .toLowerCase();

      const fullName = String(
        data.name ||
          [
            data.firstName,
            data.middleName,
            data.lastName
          ]
            .filter(Boolean)
            .join(" ")
      ).trim();

      if (!fullName) {
        throw new Error(
          "Please enter the client's full name."
        );
      }

      if (!email) {
        throw new Error(
          "Please enter the client's email address."
        );
      }

      if (!data.password) {
        throw new Error(
          "Please enter a password for the client."
        );
      }

      const contactNumber = String(
        data.contactNumber || ""
      ).replace(/\D/g, "");

      if (!/^09\d{9}$/.test(contactNumber)) {
        throw new Error(
          "The contact number must contain 11 digits and start with 09."
        );
      }

      
      credential = await createUserWithEmailAndPassword(
        secondaryAuth,
        email,
        data.password
      );

      const year =
        data.year === "" ||
        data.year === undefined ||
        data.year === null
          ? null
          : Number(data.year);

      if (year !== null && !Number.isFinite(year)) {
        throw new Error("Please provide a valid year.");
      }

      const members = Number(data.members) || 0;

      if (!Number.isFinite(members) || members < 0) {
        throw new Error(
          "Please provide a valid member count."
        );
      }

      const profile = {
        name: fullName,
        email,
        role: "client",
        contactNumber,
        association: String(data.association || ""),
        address: String(
          data.address || data.officeAddress || ""
        ),
        officeAddress: String(data.officeAddress || ""),
        barangay: String(data.barangay || ""),
        municipality: String(data.municipality || ""),
        province: String(data.province || ""),
        region: String(data.region || ""),
        position: String(data.position || ""),
        members,
        year,
        status: "active",
        createdBy: engineer.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await setDoc(
        doc(db, "users", credential.user.uid),
        profile
      );

      profileCreated = true;

      await updateAuthProfile(credential.user, {
        displayName: fullName
      });

      await signOut(secondaryAuth);

      return {
        id: credential.user.uid,
        ...profile
      };
    } catch (error) {
      if (credential?.user && profileCreated) {
        try {
          await deleteDoc(
            doc(db, "users", credential.user.uid)
          );
        } catch (cleanupError) {
          console.error(
            "Could not remove the partially created client profile:",
            cleanupError
          );
        }
      }

      if (credential?.user) {
        try {
          await deleteFirebaseUser(credential.user);
        } catch (cleanupError) {
          console.error(
            "Could not clean up the new client Auth account:",
            cleanupError
          );
        }
      }

      if (secondaryAuth.currentUser) {
        try {
          await signOut(secondaryAuth);
        } catch (signOutError) {
          console.error(
            "Could not sign out secondary authentication:",
            signOutError
          );
        }
      }

      throw friendlyFirebaseError(error);
    }
  };

  const registerClient = (data) =>
    register(data, "client");

  const registerEngineer = (data) =>
    register(data, "engineer");

  const updateProfile = async (id, patch) => {
    if (!firebaseConfigured || !db) {
      throw new Error(
        "Firebase is not configured yet."
      );
    }

    try {
      const targetSnapshot = await getDoc(
        doc(db, "users", id)
      );

      if (!targetSnapshot.exists()) {
        throw new Error(
          "The account could not be found."
        );
      }

      const target = targetSnapshot.data();

      if (
        target.role === "client" &&
        patch.status === "inactive"
      ) {
        await deleteClientData(id);
      }

      if (
        target.role === "engineer" &&
        patch.status === "inactive"
      ) {
        await deleteEngineerData(id);
      }

      await updateDoc(doc(db, "users", id), {
        ...patch,
        updatedAt: serverTimestamp()
      });

      if (id === user?.id) {
        setUser((current) => ({
          ...current,
          ...patch
        }));
      }
    } catch (error) {
      throw friendlyFirebaseError(error);
    }
  };

  const deleteUser = async (id) => {
    if (!firebaseConfigured || !db || !auth) {
      throw new Error(
        "Firebase is not configured yet."
      );
    }

    if (!id || id === auth.currentUser?.uid) {
      return;
    }

    try {
      const targetSnapshot = await getDoc(
        doc(db, "users", id)
      );

      if (!targetSnapshot.exists()) {
        throw new Error(
          "The account could not be found."
        );
      }

      const target = targetSnapshot.data();

      if (target.status === "inactive") {
        return;
      }

      if (target.role === "client") {
        await deleteClientData(id);
      }

      if (target.role === "engineer") {
        await deleteEngineerData(id);
      }

      await updateDoc(doc(db, "users", id), {
        status: "inactive",
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      throw friendlyFirebaseError(error);
    }
  };

  const logout = () =>
    auth ? signOut(auth) : Promise.resolve();

  return (
    <AuthContext.Provider
      value={{
        user,
        users,
        loading,
        login,
        logout,
        registerClient,
        registerEngineer,
        registerClientByEngineer,
        updateProfile,
        deleteUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
