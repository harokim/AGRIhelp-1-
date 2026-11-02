
import { useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useRequests } from "../context/RequestContext";
import { MAX_FILE_SIZE } from "../utils";
import { saveDocument } from "../services/documentService";
import { DOCUMENT_REQUIREMENTS } from "../utils/documentRequirements";

const REQUIRED_TYPES = DOCUMENT_REQUIREMENTS
  .filter((item) => item.required)
  .map((item) => item.id);

const ALLOWED_EXTENSIONS = /\.(pdf|jpe?g|png)$/i;

const MINIMUM_REQUIREMENTS = [
  {
    title: "1. Board Resolution",
    text: "Board Resolution duly signed by the majority of the board of directors of the organization stating the following:",
    items: [
      "Machinery, equipment, or facilities to be requested.",
      "Explanation for the need and appropriateness of the machinery, equipment, or facilities.",
      "Commitment to shoulder the cost of operation and maintenance of the requested machinery, equipment, facilities, and machinery shed, if applicable.",
      "Name and technical qualifications of the designated operator.",
      "Authorized representative to sign any legal documents or documentary requirements with the Department of Agriculture on the project.",
      "Total number of members with RSBSA Control Number that will benefit from the requested project."
    ]
  },
  {
    title: "2. Pre-Validation Report",
    text: "A pre-validation report signed by an Agricultural and Biosystems Engineer (ABE) in the P/C/MLGU is required. In the absence of an ABE in the respective LGU, the pre-validation report may be signed by the ABE in the province, at a minimum."
  },

  {
    title: "3. Authenticated Proof of Land",
    text: "Authenticated proof of land ownership or a copy of an accepted land-use document named to the requesting entity."
  },
  {
    title: "4. Letter of Intent",
    text: "Letter of Intent duly signed by the appropriate authorized representative stating the machinery, equipment, or facilities requested and the organization's commitment to the project."
  },
  {
    title: "5. Profile of the Organization",
    text: "Profile of the organization containing information about the organization, its membership, organizational structure, and relevant activities."
  },
  {
    title: "6. Other Documents / Certificates",
    text: "Other supporting documents or certificates relevant to the requested machinery, equipment, or facilities, as applicable."
  },
];

export default function Requests() {
  const { user } = useAuth();
  const { requests, createRequest, deleteRequest } = useRequests();

  const [form, setForm] = useState({
    requestType: "",
    details: ""
  });

  const [files, setFiles] = useState([]);
  const [requirementsRead, setRequirementsRead] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [previewFile, setPreviewFile] = useState(null);

  const updateFileCategory = (index, documentType) => {
    setFiles((current) =>
      current.map((item, i) =>
        i === index ? { ...item, documentType } : item
      )
    );
  };

  const changeFiles = (event) => {
    const selected = Array.from(event.target.files || []);
    event.target.value = "";

    if (!selected.length) return;

    const validFiles = [];

    for (const file of selected) {
      if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
        window.alert(
          `"${file.name}" must be larger than 0 bytes and no larger than ${
            MAX_FILE_SIZE / (1024 * 1024)
          } MB.`
        );
        continue;
      }

      if (
        !["application/pdf", "image/jpeg", "image/png"].includes(file.type) &&
        !ALLOWED_EXTENSIONS.test(file.name)
      ) {
        window.alert(`"${file.name}" is not supported. Use PDF, JPG, or PNG.`);
        continue;
      }

      const duplicate = files.some(
        (item) => item.file.name === file.name && item.file.size === file.size
      );

      const duplicateInSelection = validFiles.some(
        (item) => item.file.name === file.name && item.file.size === file.size
      );

      if (!duplicate && !duplicateInSelection) {
        validFiles.push({ file, documentType: "" });
      }
    }

    if (validFiles.length) {
      setFiles((current) => [...current, ...validFiles]);
    }
  };

  const removeFile = (index) => {
    setFiles((current) => current.filter((_, i) => i !== index));
  };

  const fileCountFor = (type) =>
    files.filter((item) => item.documentType === type).length;

  const missingRequirements = REQUIRED_TYPES.filter(
    (type) => fileCountFor(type) === 0
  );

  const mine = useMemo(() => {
    const term = search.trim().toLowerCase();

    return requests
      .filter((request) => request.clientId === user?.id)
      .filter((request) => {
        if (!term) return true;

        return [
          request.referenceNumber,
          request.association,
          request.requestType,
          request.details,
          request.status
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(term);
      })
      .sort((a, b) =>
        String(b.createdAtTimestamp || b.createdAt || "").localeCompare(
          String(a.createdAtTimestamp || a.createdAt || "")
        )
      );
  }, [requests, user?.id, search]);

  const submit = async (event) => {
    event.preventDefault();

    if (isSubmitting) return;

    if (!user?.id || !user.association) {
      window.alert("Your account or assigned association could not be identified.");
      return;
    }

    if (!requirementsRead) {
      window.alert("Please acknowledge the documentary requirements.");
      return;
    }

    if (!form.requestType || !form.details.trim()) {
      window.alert("Select a request type and enter request details.");
      return;
    }

    if (missingRequirements.length) {
      const labels = DOCUMENT_REQUIREMENTS
        .filter((item) => missingRequirements.includes(item.id))
        .map((item) => item.label);

      window.alert(`Please attach the following required documents:\n\n${labels.join("\n")}`);
      return;
    }

    setIsSubmitting(true);
    let createdRequest = null;

    try {
      createdRequest = await createRequest({
        clientId: user.id,
        association: user.association,
        requestType: form.requestType,
        details: form.details.trim()
      });

      for (const item of files) {
        await saveDocument({
          file: item.file,
          requestId: createdRequest.id,
          clientId: user.id,
          documentType: item.documentType
        });
      }

      setForm({ requestType: "", details: "" });
      setFiles([]);
      setRequirementsRead(false);

      window.alert("Request and documents submitted successfully.");
    } catch (error) {
      console.error("Request submission failed:", {
        code: error?.code,
        message: error?.message,
        requestId: createdRequest?.id
      });

      if (createdRequest?.id) {
        try {
          await deleteRequest(createdRequest.id);
        } catch (cleanupError) {
          console.error(
            "Request cleanup failed:",
            cleanupError?.code,
            cleanupError?.message
          );
        }
      }

      window.alert(
        error?.message ||
        "The request could not be fully submitted. Please check your connection and try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (request) => {
    const value = request.createdAtTimestamp || request.createdAt;
    let date = null;

    if (value?.toDate) date = value.toDate();
    else if (value?.seconds) date = new Date(value.seconds * 1000);
    else if (value) date = new Date(value);

    if (!date || Number.isNaN(date.getTime())) return "Date unavailable";

    return date.toLocaleString("en-PH", {
      timeZone: "Asia/Manila",
      dateStyle: "medium",
      timeStyle: "short"
    });
  };

  const handleDelete = async (request) => {
    if (request.clientId !== user?.id) return;

    if (!window.confirm(
      `Delete request ${request.referenceNumber || request.id}?`
    )) return;

    try {
      await deleteRequest(request.id);
    } catch (error) {
      window.alert(error?.message || "Could not delete the request.");
    }
  };

  return (
    <div className="page request-page">
      <div className="page-header">
        <span className="eyebrow">SERVICE REQUESTS</span>
        <h1>My Requests</h1>
        <p>Submit an association request and manage your submissions.</p>
      </div>

      <div className="two-column request-layout">
        <form className="card form-card request-form-card" onSubmit={submit}>
          <h3>New service request</h3>

          <div className="assigned-association">
            <span>Assigned association</span>
            <strong>{user?.association || "No association assigned"}</strong>
          </div>

          <div className="request-requirements-panel">
  <h3>Minimum Requirements</h3>
  <p>Review the documentary requirements before submitting your request.</p>

  {MINIMUM_REQUIREMENTS.map((requirement) => (
    <div className="request-requirement-item" key={requirement.title}>
      <div className="request-requirement-content">
        <strong>{requirement.title}</strong>
        <p>{requirement.text}</p>

        {requirement.items && (
          <ol>
            {requirement.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
        )}
      </div>
    </div>
  ))}

  <div className="request-requirements-list">
    {DOCUMENT_REQUIREMENTS.map((requirement) => (
      <div className="request-requirement-item" key={requirement.id}>
        <div className="request-requirement-content">
          <strong>{requirement.label}</strong>
          <p>
            {requirement.required ? "Required" : "Optional"}
            {requirement.multiple ? " · Multiple files allowed" : ""}
            {" · "}
            {fileCountFor(requirement.id)} attached
          </p>
        </div>
        <span>
          {fileCountFor(requirement.id) > 0
            ? "✓"
            : requirement.required
              ? "Missing"
              : "Optional"}
        </span>
      </div>
    ))}
  </div>
</div>

          <label className="requirements-checkbox">
            <input
              type="checkbox"
              checked={requirementsRead}
              onChange={(event) => setRequirementsRead(event.target.checked)}
            />
            <span>I have read and understood the documentary requirements.</span>
          </label>

          <label htmlFor="request-type">Request type</label>
          <select
            id="request-type"
            required
            value={form.requestType}
            onChange={(event) =>
              setForm((current) => ({ ...current, requestType: event.target.value }))
            }
          >
            <option value="">Select request type</option>
            <option value="Machinery">Machinery</option>
            <option value="Infrastructure">Infrastructure</option>
          </select>

          <label htmlFor="request-details">Request details</label>
          <textarea
            id="request-details"
            rows={5}
            required
            value={form.details}
            placeholder="Describe your request..."
            onChange={(event) =>
              setForm((current) => ({ ...current, details: event.target.value }))
            }
          />

          <label htmlFor="request-files">Documents</label>
          <p className="upload-help">
            PDF, JPG, or PNG. Maximum {MAX_FILE_SIZE / (1024 * 1024)} MB per file.
          </p>

          <input
            id="request-files"
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
            onChange={changeFiles}
          />

          {files.length > 0 && (
            <div className="upload-file-list">
              {files.map((item, index) => (
                <div
                  className="upload-file-item"
                  key={`${item.file.name}-${item.file.size}-${index}`}
                >
                  <div className="upload-file-info">
                    <strong>{item.file.name}</strong>
                    <small>{(item.file.size / 1024).toFixed(0)} KB</small>
                  </div>

                  <div className="upload-file-category">
                    <label htmlFor={`document-category-${index}`}>
                      Document category
                    </label>
                    <select
                      id={`document-category-${index}`}
                      required
                      value={item.documentType}
                      onChange={(event) =>
                        updateFileCategory(index, event.target.value)
                      }
                    >
                      <option value="">Select category</option>
                      {DOCUMENT_REQUIREMENTS.map((requirement) => (
                        <option key={requirement.id} value={requirement.id}>
                          {requirement.label}
                          {requirement.required ? "" : " (Optional)"}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="button"
                    className="danger-btn small"
                    onClick={() => removeFile(index)}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            className="primary-btn full"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Submitting..." : "Submit request"}
          </button>
        </form>

        <section className="card request-list-card">
          <h3>Submitted requests</h3>

          <input
            className="search-input"
            type="search"
            placeholder="Search requests..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

          <div className="request-list">
            {mine.map((request) => (
              <article className="card request-row" key={request.id}>
                <div className="request-row-content">
                  <span className="request-reference">
                    {request.referenceNumber || request.id}
                  </span>
                  <h3>{request.requestType || request.type || "Request"}</h3>
                  <p>{request.details || "No details provided."}</p>
                  <small>
                    {request.association} · {formatDate(request)}
                  </small>
                </div>

              </article>
            ))}

            {mine.length === 0 && (
              <div className="empty-state">
                <strong>No requests found.</strong>
                <span>Your submitted requests will appear here.</span>
              </div>
            )}
          </div>
        </section>
      </div>

      {previewFile && (
        <div className="modal-overlay" onClick={() => setPreviewFile(null)}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h2>{previewFile.name}</h2>
              <button type="button" className="modal-close" onClick={() => setPreviewFile(null)}>
                ×
              </button>
            </div>
            <iframe
              title={previewFile.name}
              src={previewFile.url}
              style={{ width: "100%", height: "70vh", border: 0 }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
