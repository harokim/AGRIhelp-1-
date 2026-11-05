
export const DOCUMENT_REQUIREMENTS = [
  {
    id: "board-resolution",
    label: "Board Resolution",
    required: true,
    multiple: false
  },
  {
    id: "proof-of-land",
    label: "Authenticated Proof of Land",
    required: true,
    multiple: false
  },
  {
    id: "letter-of-intent",
    label: "Letter of Intent",
    required: true,
    multiple: false
  },
  {
    id: "organization-profile",
    label: "Profile of the Organization",
    required: true,
    multiple: true
  },
  {
    id: "other-documents",
    label: "Other Documents / Certificates",
    required: false,
    multiple: true
  },
];

function normalizeDocumentType(value) {
  const normalized = String(value || "").trim().toLowerCase();

  const aliases = {
    "profile-of-organization": "organization-profile",
    "organization profile": "organization-profile",
    "profile of the organization": "organization-profile",
    "authenticated-proof-of-land": "proof-of-land",
    "authenticated proof of land": "proof-of-land",
    "letter of intent": "letter-of-intent",
    "board resolution": "board-resolution",
    "other documents": "other-documents",
    "other documents / certificates": "other-documents"
  };

  return aliases[normalized] || normalized;
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

  const items = DOCUMENT_REQUIREMENTS.map((requirement) => {
    const count = validDocuments.filter(
      (document) =>
        normalizeDocumentType(document.documentType) === requirement.id
    ).length;

    return {
      ...requirement,
      count,
      complete: count > 0
    };
  });

  const requiredItems = items.filter((item) => item.required);
  const completedCount = requiredItems.filter((item) => item.complete).length;
  const totalCount = requiredItems.length;

  const missingRequirements = requiredItems
    .filter((item) => !item.complete)
    .map(({ id, label }) => ({ id, label }));

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
    (requirement) => requirement.id === normalizedType
  );
}

export function getDocumentRequirementLabel(documentType) {
  const normalizedType = normalizeDocumentType(documentType);

  const requirement = DOCUMENT_REQUIREMENTS.find(
    (item) => item.id === normalizedType
  );

  return requirement?.label || "Unassigned document";
}
