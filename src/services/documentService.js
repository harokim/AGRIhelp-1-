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

const FIRESTORE_CHUNK_SIZE = 700000;

export function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(reader.result);

    reader.onerror = () =>
      reject(
        new Error(
          "The selected file could not be read."
        )
      );

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
      `"${file.name}" is larger than the allowed 5 MB file size.`
    );
  }

  const validType =
    ALLOWED_TYPES.includes(file.type);

  const validExtension =
    ALLOWED_EXTENSIONS.test(file.name);

  if (!validType && !validExtension) {
    throw new Error(
      `"${file.name}" is not supported. Only PDF, JPG, and PNG files are allowed.`
    );
  }
}

function splitDataUrl(dataUrl) {
  const commaIndex =
    dataUrl.indexOf(",");

  if (commaIndex === -1) {
    throw new Error(
      "The file data could not be processed."
    );
  }

  const header =
    dataUrl.slice(0, commaIndex);

  const body =
    dataUrl.slice(commaIndex + 1);

  if (!header || !body) {
    throw new Error(
      "The file data is incomplete."
    );
  }

  return {
    header,
    body
  };
}

function createChunks(value) {
  const chunks = [];

  for (
    let index = 0;
    index < value.length;
    index += FIRESTORE_CHUNK_SIZE
  ) {
    chunks.push(
      value.slice(
        index,
        index + FIRESTORE_CHUNK_SIZE
      )
    );
  }

  return chunks;
}

function dataUrlToBytes(dataUrl) {
  const { body } =
    splitDataUrl(dataUrl);

  const normalized =
    body +
    "=".repeat(
      (4 - (body.length % 4)) % 4
    );

  let binary;

  try {
    binary = atob(normalized);
  } catch {
    throw new Error(
      "The generated file data is invalid."
    );
  }

  const bytes =
    new Uint8Array(binary.length);

  for (
    let index = 0;
    index < binary.length;
    index += 1
  ) {
    bytes[index] =
      binary.charCodeAt(index);
  }

  return bytes;
}

export async function saveDocument({
  file,
  requestId,
  clientId,
  documentType = "Supporting Document"
}) {
  if (!firebaseConfigured || !db) {
    throw new Error(
      "Firebase is not configured yet."
    );
  }

  if (!requestId) {
    throw new Error(
      "The request could not be identified."
    );
  }

  if (!clientId) {
    throw new Error(
      "The client account could not be identified."
    );
  }

  validateFile(file);

  const data =
    await fileToDataURL(file);

  if (
    !data ||
    typeof data !== "string"
  ) {
    throw new Error(
      `"${file.name}" could not be read.`
    );
  }

  const bytes =
    dataUrlToBytes(data);

  if (bytes.length !== file.size) {
    throw new Error(
      `"${file.name}" was not read completely. Please select the file again.`
    );
  }

  const {
    header,
    body
  } = splitDataUrl(data);

  const chunks =
    createChunks(body);

  const documentReference =
    doc(collection(db, "documents"));

  const batch = writeBatch(db);

  const documentData = {
    requestId,
    clientId,
    documentType,
    fileName: file.name,
    contentType:
      file.type ||
      "application/octet-stream",
    fileSize: file.size,
    data: "",
    dataHeader: header,
    chunked: true,
    chunkCount: chunks.length,
    status: "Pending Review",
    engineerRemarks: "",
    uploadedAt: serverTimestamp()
  };

  batch.set(
    documentReference,
    documentData
  );

  chunks.forEach(
    (chunkData, index) => {
      const chunkReference =
        doc(
          collection(
            db,
            "documents",
            documentReference.id,
            "chunks"
          )
        );

      batch.set(
        chunkReference,
        {
          index,
          data: chunkData
        }
      );
    }
  );

  await batch.commit();

  return {
    id: documentReference.id,
    ...documentData
  };
}

export async function loadDocumentData(
  document
) {
  if (!document) {
    return null;
  }

  if (
    document.data &&
    typeof document.data === "string"
  ) {
    return document.data;
  }

  if (
    !firebaseConfigured ||
    !db ||
    !document.id
  ) {
    return null;
  }

  try {
    const chunkSnapshot =
      await getDocs(
        collection(
          db,
          "documents",
          document.id,
          "chunks"
        )
      );

    if (chunkSnapshot.empty) {
      return null;
    }

    const chunks =
      chunkSnapshot.docs
        .map((item) => ({
          id: item.id,
          ...item.data()
        }))
        .sort(
          (a, b) =>
            Number(a.index || 0) -
            Number(b.index || 0)
        );

    const header =
      document.dataHeader || "";

    const body =
      chunks
        .map(
          (chunk) =>
            chunk.data || ""
        )
        .join("");

    if (!header || !body) {
      return null;
    }

    const dataUrl =
      `${header},${body}`;

    try {
      const bytes =
        dataUrlToBytes(dataUrl);

      if (
        document.fileSize &&
        bytes.length !==
          Number(document.fileSize)
      ) {
        return null;
      }
    } catch {
      return null;
    }

    return dataUrl;
  } catch {
    return null;
  }
}

export async function deleteDocumentWithChunks(
  documentId
) {
  if (
    !firebaseConfigured ||
    !db ||
    !documentId
  ) {
    return;
  }

  const chunks =
    await getDocs(
      collection(
        db,
        "documents",
        documentId,
        "chunks"
      )
    );

  const batch =
    writeBatch(db);

  chunks.docs.forEach(
    (chunk) => {
      batch.delete(
        doc(
          db,
          "documents",
          documentId,
          "chunks",
          chunk.id
        )
      );
    }
  );

  batch.delete(
    doc(
      db,
      "documents",
      documentId
    )
  );

  await batch.commit();
}

