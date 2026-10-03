import { addDoc, collection, deleteDoc, doc } from "firebase/firestore";
import { db, firebaseConfigured } from "../firebase";
import { fileToDataURL } from "./documentService";
import { MAX_FILE_SIZE } from "../utils";

export async function saveReportDocument({ file, requestId, engineerId }) {
  if (!firebaseConfigured || !db) throw new Error("Firebase is not configured yet.");
  if (!file || file.size > MAX_FILE_SIZE) throw new Error("Each document must be 600 KB or smaller.");
  if (!["application/pdf", "image/png", "image/jpeg"].includes(file.type)) throw new Error("Only PDF, PNG, and JPG files are supported.");
  const data = await fileToDataURL(file);
  const documentData = { requestId, engineerId, fileName: file.name, contentType: file.type, fileSize: file.size, data, uploadedAt: new Date().toISOString() };
  const ref = await addDoc(collection(db, "reportDocuments"), documentData);
  return { id: ref.id, ...documentData };
}

export async function deleteReportDocument(id) {
  if (!firebaseConfigured || !db) throw new Error("Firebase is not configured yet.");
  await deleteDoc(doc(db, "reportDocuments", id));
}
