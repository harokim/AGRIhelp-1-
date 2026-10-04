import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db, firebaseConfigured } from "../firebase";
import { MAX_FILE_SIZE } from "../utils";

export function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export async function saveDocument({ file, requestId, clientId, documentType = "Supporting Document" }) {
  if (!firebaseConfigured || !db) throw new Error("Firebase is not configured yet.");
  if (!file || file.size > MAX_FILE_SIZE) throw new Error("Each document must be 5 MB or smaller because AGRIhelp is not using Firebase Storage.");
  const data = await fileToDataURL(file);
  const documentData = { requestId, clientId, documentType, fileName: file.name, contentType: file.type || "application/octet-stream", fileSize: file.size, data, status: "Pending Review", engineerRemarks: "", uploadedAt: serverTimestamp() };
  const ref = await addDoc(collection(db, "documents"), documentData);
  return { id: ref.id, ...documentData };
}
