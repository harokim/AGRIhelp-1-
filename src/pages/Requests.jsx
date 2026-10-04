import { useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useRequests } from "../context/RequestContext";
import { MAX_FILE_SIZE } from "../utils";
import {
  saveDocument,
  fileToDataURL
} from "../services/documentService";

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
    text: "A pre-validation report signed by an Agricultural and Biosystems Engineer (ABE) in the P/C/MLGU is required. In the absence of an ABE in the respective LGU, the pre-validation report may be signed by the ABE in the province, at a minimum. This shall follow Annex C: Pre-Validation Report."
  },
  {
    title: "3. ABE Endorsement or Certification",
    text: "Endorsement or certification from a licensed Agricultural and Biosystems Engineer is required. The proponent may hire an ABE as an employee or consultant under limited practice or seek technical assistance from their respective LGUs if unable to hire one. The endorsement must state the ABE's commitment to supporting the proponent in operating and maintaining the project."
  },
  {
    title: "4. Utilization Proposal",
    text: "Utilization Proposal indicating the production area and volume, the general specification, including type and capacity, of the requested machinery and facilities, and the period of operation. This shall follow Annex C: Utilization Proposal."
  },
  {
    title: "5. Geotagged Photos",
    text: "Geotagged photos of the existing shed and/or ongoing construction of the shed based on the capacity of the approved requested machinery."
  },
  {
    title: "6. Authenticated Proof of Land",
    text: "Authenticated proof of land ownership or a copy of any of the following documents named to the requesting entity:",
    items: [
      "Certificate of Land Title, such as Transfer Certificate of Title (TCT) or Certificate of Land Ownership Award (CLOA).",
      "Usufruct or Lease Agreement based on the useful life of the type of project."
    ]
  },
  {
    title: "7. Letter of Intent",
    text: "Letter of Intent duly signed by the Head of the Agricultural and Biosystems Engineering Office (LGU) or President of the Agricultural Schools, State Universities and Colleges (SUCs), stating the following:",
    items: [
      "Machinery, equipment, or facilities to be requested.",
      "Explanation for the need and appropriateness of the machinery, equipment, or facilities.",
      "Commitment to shoulder the cost of operation and maintenance of the requested machinery, equipment, facilities, and machinery shed, if applicable.",
      "Name and technical qualifications of the designated operator.",
      "Authorized representative to sign any legal documents or documentary requirements with the Department of Agriculture on the project."
    ]
  },
  {
    title: "8. LGU Pre-Validation Report",
    text: "A pre-validation report signed by an Agricultural and Biosystems Engineer (ABE) in the P/C/MLGU is required. In cases where there is no existing ABE office in the LGU, the requesting LGU must provide a commitment through a Sangguniang Bayan Resolution stating the creation of an ABE Office or hiring of an ABE within two years upon receipt of the requested intervention. The ABE must also be engaged during the implementation of the project. This shall follow Annex D: Pre-Validation Report."
  },
  {
    title: "9. Placement Site Pre-Validation Report",
    text: "A pre-validation report signed by an Agricultural and Biosystems Engineer (ABE) in the P/C/MLGU where the requested agri-fisheries machinery and infrastructure should be placed is required. In the absence of an ABE in the respective LGU, the pre-validation report should be signed by the ABE in the province, at a minimum. This shall follow Annex D: Pre-Validation Report."
  }
];

export default function Requests() {
  const { user } = useAuth();

  const {
    requests,
    createRequest,
    deleteRequest
  } = useRequests();

  const [form, setForm] = useState({
    requestType: "",
    details: ""
  });

  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [requirementsRead, setRequirementsRead] =
    useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState("All");

  const [monthFilter, setMonthFilter] =
    useState("All");

  const [yearFilter, setYearFilter] =
    useState("All");

  const [previewFile, setPreviewFile] =
    useState(null);

  const updateForm = (name, value) => {
    setForm((previous) => ({
      ...previous,
      [name]: value
    }));
  };

  const changeFiles = async (event) => {
    const selected = Array.from(
      event.target.files || []
    );

    if (!selected.length) return;

    const invalid = selected.find(
  (file) =>
    file.size <= 0 ||
    file.size > MAX_FILE_SIZE
);

if (invalid) {
  alert(
    invalid.size > MAX_FILE_SIZE
      ? `"${invalid.name}" is larger than the allowed 5 MB file size.`
      : `"${invalid.name}" is empty.`
  );

  event.target.value = "";
  return;
}

const unsupported = selected.find(
  (file) =>
    ![
      "application/pdf",
      "image/jpeg",
      "image/png"
    ].includes(file.type) &&
    !/\.(pdf|jpe?g|png)$/i.test(
      file.name
    )
);

if (unsupported) {
  alert(
    `"${unsupported.name}" is not supported. Only PDF, JPG, and PNG files are allowed.`
  );

  event.target.value = "";
  return;
}

    if (invalid) {
      alert(
        `"${invalid.name}" is larger than the allowed 5 file size.`
      );

      event.target.value = "";
      return;
    }

    const fresh = selected.filter(
      (file) =>
        !files.some(
          (old) =>
            old.name === file.name &&
            old.size === file.size
        )
    );

    if (!fresh.length) {
      alert(
        "The selected files are already in the list."
      );

      event.target.value = "";
      return;
    }

    const nextPreviews = [];

    for (const file of fresh) {
      let url = null;

      if (
        file.type.startsWith("image/") ||
        file.type === "application/pdf"
      ) {
        try {
          url = await fileToDataURL(file);
        } catch {
          url = null;
        }
      }

      nextPreviews.push({
        name: file.name,
        type: file.type,
        url
      });
    }

    setFiles((previous) => [
      ...previous,
      ...fresh
    ]);

    setPreviews((previous) => [
      ...previous,
      ...nextPreviews
    ]);

    event.target.value = "";
  };

  const removeFile = (index) => {
    setFiles((previous) =>
      previous.filter((_, i) => i !== index)
    );

    setPreviews((previous) =>
      previous.filter((_, i) => i !== index)
    );
  };

  const submit = async (event) => {
    event.preventDefault();

    if (!requirementsRead) {
      alert(
        "Please read and acknowledge the minimum documentary requirements before submitting your request."
      );
      return;
    }

    if (!user?.id) {
      alert("Please sign in again.");
      return;
    }

    if (!user.association) {
      alert(
        "Your account does not have an assigned association."
      );
      return;
    }

    if (!form.requestType) {
      alert(
        "Please select a request type."
      );
      return;
    }

    if (!form.details.trim()) {
      alert(
        "Please provide a description for your request."
      );
      return;
    }

    if (files.length === 0) {
      alert(
        "Please attach at least one supporting document."
      );
      return;
    }

    try {
      const request = await createRequest({
        clientId: user.id,
        association: user.association,
        requestType: form.requestType,
        details: form.details.trim()
      });

      for (const file of files) {
        await saveDocument({
          file,
          requestId: request.id,
          clientId: user.id
        });
      }

      setForm({
        requestType: "",
        details: ""
      });

      setFiles([]);
      setPreviews([]);
      setRequirementsRead(false);

      alert(
        "Request submitted successfully."
      );
    }  catch (error) {
      alert(
        error?.userMessage ||
          error?.message ||
          "The request could not be submitted. Please check your information and try again."
      );
    }
  };

  const years = useMemo(() => {
    const values = requests
      .filter(
        (request) =>
          request.clientId === user?.id
      )
      .map((request) =>
        String(
          request.createdAt ||
            request.createdAtTimestamp ||
            ""
        ).slice(0, 4)
      )
      .filter(Boolean);

    return [...new Set(values)].sort(
      (a, b) => Number(b) - Number(a)
    );
  }, [requests, user?.id]);

  const mine = useMemo(() => {
    const searchValue =
      search.trim().toLowerCase();

    return requests
      .filter(
        (request) =>
          request.clientId === user?.id
      )
      .filter((request) => {
        if (statusFilter === "All") {
          return true;
        }

        return request.status === statusFilter;
      })
      .filter((request) => {
        if (monthFilter === "All") {
          return true;
        }

        const date = String(
          request.createdAt || ""
        );

        return (
          date.slice(5, 7) === monthFilter
        );
      })
      .filter((request) => {
        if (yearFilter === "All") {
          return true;
        }

        const date = String(
          request.createdAt || ""
        );

        return (
          date.slice(0, 4) === yearFilter
        );
      })
      .filter((request) => {
        if (!searchValue) return true;

        return `${request.referenceNumber || ""} ${
          request.association || ""
        } ${request.requestType || ""} ${
          request.details || ""
        }`
          .toLowerCase()
          .includes(searchValue);
      })
      .sort((a, b) =>
        String(
          a.association || ""
        ).localeCompare(
          String(b.association || ""),
          undefined,
          {
            sensitivity: "base"
          }
        )
      );
  }, [
    requests,
    user?.id,
    search,
    statusFilter,
    monthFilter,
    yearFilter
  ]);

  const handleDelete = async (request) => {
    if (
      request.clientId !== user?.id
    ) {
      return;
    }

    const confirmed = window.confirm(
      `Delete request ${
        request.referenceNumber ||
        request.id
      }? This will also remove its uploaded documents.`
    );

    if (!confirmed) return;

    try {
      await deleteRequest(request.id);

      alert(
        "Request deleted successfully."
      );
    } catch (error) {
      alert(
        error?.message ||
          "The request could not be deleted."
      );
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <span className="eyebrow">
          SERVICE REQUESTS
        </span>

        <h1>My Requests</h1>

        <p>
          Submit requests and keep your documents
          organized.
        </p>
      </div>

      <div className="two-column">
        <form
          className="card form-card"
          onSubmit={submit}
        >
          <div className="request-form-heading">
            <div>
              <h3>New service request</h3>
              <p>
                Review the documentary requirements
                before submitting your request.
              </p>
            </div>

            <span className="request-requirement-badge">
              Required
            </span>
          </div>

          <div className="request-requirements-panel">
            <div className="request-requirements-header">
              <div>
                <span className="eyebrow">
                  DOCUMENTARY REQUIREMENTS
                </span>

                <h3>
                  Minimum Requirements to be Submitted
                  by the Requesting Beneficiary
                </h3>
              </div>
            </div>

            <div className="request-requirements-list">
              {MINIMUM_REQUIREMENTS.map(
                (requirement, index) => (
                  <div
                    className="request-requirement-item"
                    key={requirement.title}
                  >
                    <div className="request-requirement-number">
                      {index + 1}
                    </div>

                    <div className="request-requirement-content">
                      <strong>
                        {requirement.title.replace(
                          /^\d+\.\s*/,
                          ""
                        )}
                      </strong>

                      <p>
                        {requirement.text}
                      </p>

                      {requirement.items && (
                        <ol>
                          {requirement.items.map(
                            (item) => (
                              <li key={item}>
                                {item}
                              </li>
                            )
                          )}
                        </ol>
                      )}
                    </div>
                  </div>
                )
              )}
            </div>

            <label className="requirements-checkbox">
              <input
                type="checkbox"
                checked={requirementsRead}
                onChange={(event) =>
                  setRequirementsRead(
                    event.target.checked
                  )
                }
              />

              <span>
                I have read and understand the minimum
                documentary requirements listed above.
              </span>
            </label>
          </div>

          <div className="assigned-association">
            <span>Assigned association</span>

            <strong>
              {user?.association ||
                "No association assigned"}
            </strong>
          </div>

          <label>
            Request type
          </label>

          <select
            value={form.requestType}
            onChange={(event) =>
              updateForm(
                "requestType",
                event.target.value
              )
            }
            required
          >
            <option value="">
              Select request type
            </option>

            <option value="Machinery">
              Machinery
            </option>

            <option value="Infrastructure">
              Infrastructure
            </option>
          </select>

          <label>
            Request details
          </label>

          <textarea
            rows="7"
            value={form.details}
            onChange={(event) =>
              updateForm(
                "details",
                event.target.value
              )
            }
            placeholder="Describe your request..."
            required
          />

          <label>
            Supporting documents
          </label>

          <p className="upload-help">
            At least one supporting document is
            required. Each file must be within the
            5 MB system upload limit.
          </p>

          <label className="file-upload-box">
            <span className="file-upload-icon">
              📁
            </span>

            <strong>
              Click to select documents
            </strong>

            <small>
              Maximum file size:{" "}
              {Math.round(
                MAX_FILE_SIZE / 1024 / 1024
              )}{" "}
              MB per file
            </small>

            <input
              type="file"
              multiple
              onChange={changeFiles}
            />
          </label>

          {files.length > 0 && (
            <div className="upload-section">
              <div className="upload-section-header">
                <strong>
                  Selected documents (
                  {files.length})
                </strong>

                <button
                  type="button"
                  className="text-btn"
                  onClick={() => {
                    setFiles([]);
                    setPreviews([]);
                  }}
                >
                  Clear all
                </button>
              </div>

              <div className="upload-file-list">
                {files.map(
                  (file, index) => {
                    const preview =
                      previews[index];

                    const image =
                      file.type.startsWith(
                        "image/"
                      );

                    return (
                      <div
                        className="upload-file-item"
                        key={`${file.name}-${file.size}-${index}`}
                      >
                        <div className="upload-thumbnail">
                          {image &&
                          preview?.url ? (
                            <img
                              src={
                                preview.url
                              }
                              alt={file.name}
                            />
                          ) : (
                            <span className="file-type-icon">
                              {file.type ===
                              "application/pdf"
                                ? "PDF"
                                : "FILE"}
                            </span>
                          )}
                        </div>

                        <div className="upload-file-info">
                          <strong
                            title={file.name}
                          >
                            {file.name}
                          </strong>

                          <small>
                            {(
                              file.size /
                              1024
                            ).toFixed(0)}{" "}
                            KB
                          </small>
                        </div>

                        <div className="upload-file-actions">
                          {preview?.url && (
                            <button
                              type="button"
                              className="secondary-btn small"
                              onClick={() =>
                                setPreviewFile(
                                  preview
                                )
                              }
                            >
                              Preview
                            </button>
                          )}

                          <button
                            type="button"
                            className="danger-btn small"
                            onClick={() =>
                              removeFile(
                                index
                              )
                            }
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            </div>
          )}

          <button
            type="submit"
            className="primary-btn full"
            disabled={!requirementsRead}
          >
            {requirementsRead
              ? "Submit request"
              : "Read requirements to continue"}
          </button>
        </form>

        <section>
          <div className="section-heading-row">
            <div>
              <h3>
                Submitted requests
              </h3>

              <p>
                Track your request status.
              </p>
            </div>
          </div>

          <div className="request-filter-bar">
            <input
              className="search-input request-search"
              placeholder="Search requests..."
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
            />

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value
                )
              }
            >
              <option value="All">
                All status
              </option>

              <option value="Submitted">
                Submitted
              </option>

              <option value="Under Review">
                Under Review
              </option>

              <option value="Documents Pending">
                Documents Pending
              </option>

              <option value="Approved">
                Approved
              </option>

              <option value="Rejected">
                Rejected
              </option>

              <option value="Scheduled for Validation">
                Scheduled for Validation
              </option>
            </select>

            <select
              value={monthFilter}
              onChange={(event) =>
                setMonthFilter(
                  event.target.value
                )
              }
            >
              <option value="All">
                Month
              </option>

              <option value="01">
                January
              </option>

              <option value="02">
                February
              </option>

              <option value="03">
                March
              </option>

              <option value="04">
                April
              </option>

              <option value="05">
                May
              </option>

              <option value="06">
                June
              </option>

              <option value="07">
                July
              </option>

              <option value="08">
                August
              </option>

              <option value="09">
                September
              </option>

              <option value="10">
                October
              </option>

              <option value="11">
                November
              </option>

              <option value="12">
                December
              </option>
            </select>

            <select
              value={yearFilter}
              onChange={(event) =>
                setYearFilter(
                  event.target.value
                )
              }
            >
              <option value="All">
                Year
              </option>

              {years.map((year) => (
                <option
                  key={year}
                  value={year}
                >
                  {year}
                </option>
              ))}
            </select>
          </div>

          {mine.map((request) => (
            <div
              className="card request-row"
              key={request.id}
            >
              <div className="request-row-content">
                <span className="request-id">
                  {request.referenceNumber ||
                    request.id}
                </span>

                <h3>
                  {request.association ||
                    "Service Request"}
                </h3>

                <div className="request-type-label">
                  {request.requestType ||
                    "Request type not specified"}
                </div>

                <p>
                  {request.details ||
                    "No request details provided."}
                </p>

                <small>
                  Submitted:{" "}
                  {request.createdAt ||
                    "Date unavailable"}
                </small>
              </div>

              <div className="request-row-actions">
                <span
                  className={`status ${String(
                    request.status
                  )
                    .toLowerCase()
                    .replaceAll(" ", "-")}`}
                >
                  {request.status}
                </span>

                <button
                  type="button"
                  className="request-delete-btn"
                  onClick={() =>
                    handleDelete(request)
                  }
                >
                  Delete
                </button>
              </div>
            </div>
          ))}

          {mine.length === 0 && (
            <div className="empty-state">
              No requests found.
            </div>
          )}
        </section>
      </div>

      {previewFile && (
        <div
          className="modal-backdrop"
          onClick={() =>
            setPreviewFile(null)
          }
        >
          <div
            className="modal card"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="modal-header">
              <h2>
                {previewFile.name}
              </h2>

              <button
                className="text-btn"
                onClick={() =>
                  setPreviewFile(null)
                }
              >
                Close
              </button>
            </div>

            {previewFile.type ===
            "application/pdf" ? (
              <iframe
                className="document-preview"
                src={previewFile.url}
                title={previewFile.name}
              />
            ) : (
              <img
                className="document-preview-image"
                src={previewFile.url}
                alt={previewFile.name}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}