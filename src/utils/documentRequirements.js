
export const DOCUMENT_REQUIREMENTS = [
  { id: "board-resolution", label: "Board Resolution", required: true },
  { id: "pre-validation-report", label: "Pre-Validation Report", required: true },
  { id: "abe-endorsement", label: "ABE Endorsement or Certification", required: true },
  { id: "utilization-proposal", label: "Utilization Proposal", required: true },
  { id: "geotagged-photos", label: "Geotagged Photos", required: true },
  { id: "proof-of-land", label: "Authenticated Proof of Land", required: true },
  { id: "letter-of-intent", label: "Letter of Intent", required: true },
  { id: "lgu-pre-validation", label: "LGU Pre-Validation Report", required: true },
  { id: "placement-site-report", label: "Placement Site Pre-Validation Report", required: true }
];

function normalizeDocumentType(value) {
  return String(value || "").trim().toLowerCase();
}

export function getDocumentCompleteness(documents = []) {
  const validDocuments = documents.filter(
    (document) =>
      document &&
      typeof document.fileName === "string" &&
      document.fileName.trim() !== "" &&
      typeof document.documentType === "string" &&
      document.documentType.trim() !== ""
  );

  const submittedTypes = new Set(
    validDocuments.map((document) =>
      normalizeDocumentType(document.documentType)
    )
  );

  const items = DOCUMENT_REQUIREMENTS.map((requirement) => ({
    ...requirement,
    complete: submittedTypes.has(normalizeDocumentType(requirement.id))
  }));

  const requiredItems = items.filter((item) => item.required);
  const completedCount = requiredItems.filter((item) => item.complete).length;
  const totalCount = requiredItems.length;

  const missingRequirements = requiredItems
    .filter((item) => !item.complete)
    .map((item) => ({
      id: item.id,
      label: item.label
    }));

  return {
    items,
    completedCount,
    totalCount,
    missingRequirements,
    isComplete: totalCount > 0 && completedCount === totalCount
  };
}

export function isValidDocumentType(documentType) {
  const normalizedType = normalizeDocumentType(documentType);

  return DOCUMENT_REQUIREMENTS.some(
    (requirement) =>
      normalizeDocumentType(requirement.id) === normalizedType
  );
}

export function getDocumentRequirementLabel(documentType) {
  const normalizedType = normalizeDocumentType(documentType);

  const requirement = DOCUMENT_REQUIREMENTS.find(
    (item) => normalizeDocumentType(item.id) === normalizedType
  );

  return requirement?.label || "Unassigned document";
}
