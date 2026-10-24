
export const DOCUMENT_REQUIREMENTS = [
  {
    id: "board-resolution",
    label: "Board Resolution"
  },
  {
    id: "pre-validation-report",
    label: "Pre-Validation Report"
  },
  {
    id: "abe-endorsement",
    label: "ABE Endorsement or Certification"
  },
  {
    id: "utilization-proposal",
    label: "Utilization Proposal"
  },
  {
    id: "geotagged-photos",
    label: "Geotagged Photos"
  },
  {
    id: "proof-of-land",
    label: "Authenticated Proof of Land"
  },
  {
    id: "letter-of-intent",
    label: "Letter of Intent"
  },
  {
    id: "lgu-pre-validation",
    label: "LGU Pre-Validation Report"
  },
  {
    id: "placement-site-report",
    label: "Placement Site Pre-Validation Report"
  }
];

export function getDocumentCompleteness(documents = []) {
  const submittedTypes = new Set(
    documents
      .filter((document) => document?.fileName)
      .map((document) => document.documentType)
      .filter(Boolean)
  );

  const items = DOCUMENT_REQUIREMENTS.map((requirement) => ({
    ...requirement,
    complete: submittedTypes.has(requirement.id)
  }));

  const completedCount = items.filter(
    (item) => item.complete
  ).length;

  return {
    items,
    completedCount,
    totalCount: items.length,
    isComplete: completedCount === items.length
  };
}
