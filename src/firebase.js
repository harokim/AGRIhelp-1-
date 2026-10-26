
import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const firebaseConfigured =
  Object.values(firebaseConfig).every(Boolean);

let app = null;
let auth = null;
let db = null;
let secondaryAuth = null;

if (firebaseConfigured) {
  app = getApps().find((item) => item.name === "[DEFAULT]") ||
    initializeApp(firebaseConfig);

  auth = getAuth(app);
  db = getFirestore(app);

  const secondaryAppName = "agrihelp-secondary-auth";

  const secondaryApp =
    getApps().find((item) => item.name === secondaryAppName) ||
    initializeApp(firebaseConfig, secondaryAppName);

  secondaryAuth = getAuth(secondaryApp);
}

export { auth, db, secondaryAuth };
export default app;
