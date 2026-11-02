
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  writeBatch
} from "firebase/firestore";
import { db, firebaseConfigured } from "../firebase";
import { MAX_FILE_SIZE } from "../utils";

const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png"
];

const ALLOWED_EXTENSIONS = /\.(pdf|jpe?g|png)$/i;
const FIRESTORE_CHUNK_SIZE = 450000;
const MAX_WRITES_PER_BATCH = 400;

export function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(reader.result);

    reader.onerror = () =>
      reject(new Error("The selected file could not be read."));

    reader.readAsDataURL(file);
  });
}

function validateFile(file) {
  if (!file) {
    throw new Error("No file was selected.");
  }

  if (file.size <= 0) {
    throw new Error(`"${file.name}" is empty.`);
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error(
      `"${file.name}" exceeds the allowed ${MAX_FILE_SIZE / (1024 * 1024)} MB file size.`
    );
  }

  if (
    !ALLOWED_TYPES.includes(file.type) &&
    !ALLOWED_EXTENSIONS.test(file.name)
  ) {
    throw new Error(
      `"${file.name}" is not supported. Only PDF, JPG, and PNG files are allowed.`
    );
  }
}

function splitDataUrl(dataUrl) {
  const commaIndex = dataUrl.indexOf(",");

  if (commaIndex === -1) {
    throw new Error("The file data could not be processed.");
  }

  const header = dataUrl.slice(0, commaIndex);
  const body = dataUrl.slice(commaIndex + 1);

  if (!header || !body) {
    throw new Error("The file data is incomplete.");
  }

  return { header, body };
}

function dataUrlToBytes(dataUrl) {
  const { body } = splitDataUrl(dataUrl);
  const normalized = body + "=".repeat((4 - (body.length % 4)) % 4);

  let binary;

  try {
    binary = atob(normalized);
  } catch {
    throw new Error("The generated file data is invalid.");
  }

  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function createChunks(value) {
  const chunks = [];

  for (let index = 0; index < value.length; index += FIRESTORE_CHUNK_SIZE) {
    chunks.push(value.slice(index, index + FIRESTORE_CHUNK_SIZE));
  }

  return chunks;
}

async function deletePartialDocument(documentId) {
  const chunksSnapshot = await getDocs(
    collection(db, "documents", documentId, "chunks")
  );

  for (
    let start = 0;
    start < chunksSnapshot.docs.length;
    start += MAX_WRITES_PER_BATCH
  ) {
    const batch = writeBatch(db);

    chunksSnapshot.docs
      .slice(start, start + MAX_WRITES_PER_BATCH)
      .forEach((chunk) => batch.delete(chunk.ref));

    await batch.commit();
  }

  await deleteDoc(doc(db, "documents", documentId));
}

export async function saveDocument({
  file,
  requestId,
  clientId,
  documentType = ""
}) {
  if (!firebaseConfigured || !db) {
    throw new Error("Firebase is not configured yet.");
  }

  if (!requestId || !clientId) {
    throw new Error("The request or client account could not be identified.");
  }

  const normalizedType = String(documentType || "").trim();

  if (!normalizedType) {
    throw new Error(`Select a document category for "${file?.name || "file"}".`);
  }

  validateFile(file);

  const data = await fileToDataURL(file);

  if (!data || typeof data !== "string") {
    throw new Error(`"${file.name}" could not be read.`);
  }

  const bytes = dataUrlToBytes(data);

  if (bytes.length !== file.size) {
    throw new Error(
      `"${file.name}" was not read completely. Please select it again.`
    );
  }

  const { header, body } = splitDataUrl(data);
  const chunks = createChunks(body);
  const documentReference = doc(collection(db, "documents"));

  const documentData = {
    requestId,
    clientId,
    documentType: normalizedType,
    fileName: file.name,
    contentType: file.type || "application/octet-stream",
    fileSize: file.size,
    data: "",
    dataHeader: header,
    chunked: true,
    chunkCount: chunks.length,
    status: "Pending Review",
    engineerRemarks: "",
    uploadedAt: serverTimestamp()
  };

  let parentCreated = false;

  try {
    await writeBatch(db)
      .set(documentReference, documentData)
      .commit();

    parentCreated = true;

    for (let start = 0; start < chunks.length; start += MAX_WRITES_PER_BATCH) {
      const batch = writeBatch(db);
      const currentChunks = chunks.slice(start, start + MAX_WRITES_PER_BATCH);

      currentChunks.forEach((chunkData, offset) => {
        const index = start + offset;
        const chunkReference = doc(
          db,
          "documents",
          documentReference.id,
          "chunks",
          String(index)
        );

        batch.set(chunkReference, {
          index,
          data: chunkData
        });
      });

      await batch.commit();
    }

    return {
      id: documentReference.id,
      ...documentData
    };
  } catch (error) {
    if (parentCreated) {
      try {
        await deletePartialDocument(documentReference.id);
      } catch (cleanupError) {
        console.error(
          "Partial document cleanup failed:",
          cleanupError?.code,
          cleanupError?.message
        );
      }
    }

    console.error(
      "Document upload failed:",
      error?.code,
      error?.message
    );

    if (
      error?.code === "permission-denied" ||
      error?.code === "firestore/permission-denied"
    ) {
      throw new Error(
        `Firestore denied saving "${file.name}". Check the documents and chunks security rules.`
      );
    }

    throw error;
  }
}

export async function loadDocumentData(document) {
  if (!document) {
    return null;
  }

  if (document.data && typeof document.data === "string") {
    return document.data;
  }

  if (!firebaseConfigured || !db || !document.id) {
    return null;
  }

  try {
    const chunkSnapshot = await getDocs(
      collection(db, "documents", document.id, "chunks")
    );

    if (chunkSnapshot.empty) {
      return null;
    }

    const chunks = chunkSnapshot.docs
      .map((item) => ({ id: item.id, ...item.data() }))
      .sort((a, b) => Number(a.index || 0) - Number(b.index || 0));

    const header = document.dataHeader || "";
    const body = chunks.map((chunk) => chunk.data || "").join("");

    if (!header || !body) {
      return null;
    }

    const dataUrl = `${header},${body}`;

    if (document.fileSize) {
      const bytes = dataUrlToBytes(dataUrl);

      if (bytes.length !== Number(document.fileSize)) {
        return null;
      }
    }

    return dataUrl;
  } catch (error) {
    console.error(
      "Could not load document data:",
      error?.code,
      error?.message
    );
    return null;
  }
}

export async function deleteDocumentWithChunks(documentId) {
  if (!firebaseConfigured || !db || !documentId) {
    return;
  }

  await deletePartialDocument(documentId);
}
