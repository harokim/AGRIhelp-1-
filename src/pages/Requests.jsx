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
    text: "A pre-validation report signed by an Agricultural and Biosystems Engineer (ABE) in the P/C/MLGU is required. In the absence of an ABE in the respective LGU, the pre-validation report may be signed by the ABE in the province, at a minimum."
  },
  {
    title: "3. ABE Endorsement or Certification",
    text: "Endorsement or certification from a licensed Agricultural and Biosystems Engineer is required."
  },
  {
    title: "4. Utilization Proposal",
    text: "Utilization Proposal indicating the production area and volume, the general specification, including type and capacity, of the requested machinery and facilities, and the period of operation."
  },
  {
    title: "5. Geotagged Photos",
    text: "Geotagged photos of the existing shed and/or ongoing construction of the shed based on the capacity of the approved requested machinery."
  },
  {
    title: "6. Authenticated Proof of Land",
    text: "Authenticated proof of land ownership or a copy of an accepted land-use document named to the requesting entity."
  },
  {
    title: "7. Letter of Intent",
    text: "Letter of Intent duly signed by the appropriate authorized representative stating the machinery, equipment, or facilities requested and the organization's commitment to the project."
  },
  {
    title: "8. LGU Pre-Validation Report",
    text: "A pre-validation report signed by an Agricultural and Biosystems Engineer in the P/C/MLGU."
  },
  {
    title: "9. Placement Site Pre-Validation Report",
    text: "A pre-validation report signed by an Agricultural and Biosystems Engineer in the P/C/MLGU where the requested intervention will be placed."
  }
];

export default function Requests() {
  const {
    user
  } = useAuth();

  const {
    requests,
    createRequest,
    deleteRequest
  } = useRequests();

  const [
    form,
    setForm
  ] = useState({
    requestType: "",
    details: ""
  });

  const [
    files,
    setFiles
  ] = useState([]);

  const [
    previews,
    setPreviews
  ] = useState([]);

  const [
    requirementsRead,
    setRequirementsRead
  ] = useState(false);

  const [
    search,
    setSearch
  ] = useState("");

  const [
    statusFilter,
    setStatusFilter
  ] = useState("All");

  const [
    monthFilter,
    setMonthFilter
  ] = useState("All");

  const [
    yearFilter,
    setYearFilter
  ] = useState("All");

  const [
    previewFile,
    setPreviewFile
  ] = useState(null);

  const updateForm = (
    name,
    value
  ) => {
    setForm(
      (previous) => ({
        ...previous,
        [name]: value
      })
    );
  };

  const changeFiles = async (
    event
  ) => {
    const selected =
      Array.from(
        event.target.files ||
          []
      );

    if (
      !selected.length
    ) {
      return;
    }

    const invalid =
      selected.find(
        (file) =>
          file.size <= 0 ||
          file.size >
            MAX_FILE_SIZE
      );

    if (invalid) {
      alert(
        invalid.size >
          MAX_FILE_SIZE
          ? `"${invalid.name}" is larger than the allowed 5 MB file size.`
          : `"${invalid.name}" is empty.`
      );

      event.target.value =
        "";

      return;
    }

    const unsupported =
      selected.find(
        (file) =>
          ![
            "application/pdf",
            "image/jpeg",
            "image/png"
          ].includes(
            file.type
          ) &&
          !/\.(pdf|jpe?g|png)$/i.test(
            file.name
          )
      );

    if (unsupported) {
      alert(
        `"${unsupported.name}" is not supported. Only PDF, JPG, and PNG files are allowed.`
      );

      event.target.value =
        "";

      return;
    }

    const fresh =
      selected.filter(
        (file) =>
          !files.some(
            (old) =>
              old.name ===
                file.name &&
              old.size ===
                file.size
          )
      );

    if (!fresh.length) {
      alert(
        "The selected files are already in the list."
      );

      event.target.value =
        "";

      return;
    }

    const nextPreviews =
      [];

    for (
      const file of fresh
    ) {
      let url = null;

      try {
        url =
          await fileToDataURL(
            file
          );
      } catch {
        url = null;
      }

      nextPreviews.push({
        name:
          file.name,
        type:
          file.type,
        url
      });
    }

    setFiles(
      (previous) => [
        ...previous,
        ...fresh
      ]
    );

    setPreviews(
      (previous) => [
        ...previous,
        ...nextPreviews
      ]
    );

    event.target.value =
      "";
  };

  const removeFile = (
    index
  ) => {
    setFiles(
      (previous) =>
        previous.filter(
          (_, i) =>
            i !== index
        )
    );

    setPreviews(
      (previous) =>
        previous.filter(
          (_, i) =>
            i !== index
        )
    );
  };

  const submit = async (
    event
  ) => {
    event.preventDefault();

    if (!requirementsRead) {
      alert(
        "Please read and acknowledge the minimum documentary requirements before submitting your request."
      );
      return;
    }

    if (!user?.id) {
      alert(
        "Please sign in again."
      );
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

    let request = null;

    try {
      request =
        await createRequest({
          clientId:
            user.id,
          association:
            user.association,
          requestType:
            form.requestType,
          details:
            form.details.trim()
        });

      for (
        const file of files
      ) {
        try {
          await saveDocument({
            file,
            requestId:
              request.id,
            clientId:
              user.id
          });
        } catch (fileError) {
          try {
            await deleteRequest(
              request.id
            );
          } catch {}

          throw new Error(
            fileError?.message ||
              `The document "${file.name}" could not be uploaded.`
          );
        }
      }

      setForm({
        requestType: "",
        details: ""
      });

      setFiles([]);
      setPreviews([]);
      setRequirementsRead(
        false
      );

      alert(
        "Request submitted successfully."
      );
    } catch (error) {
      alert(
        error?.userMessage ||
          error?.message ||
          "The request could not be submitted. Please try again."
      );
    }
  };

  const years = useMemo(
    () => {
      const values =
        requests
          .filter(
            (request) =>
              request.clientId ===
              user?.id
          )
          .map(
            (request) =>
              String(
                request.createdAt ||
                  ""
              ).slice(
                0,
                4
              )
          )
          .filter(Boolean);

      return [
        ...new Set(values)
      ].sort(
        (a, b) =>
          Number(b) -
          Number(a)
      );
    },
    [
      requests,
      user?.id
    ]
  );

  const mine = useMemo(
    () => {
      const searchValue =
        search
          .trim()
          .toLowerCase();

      return requests
        .filter(
          (request) =>
            request.clientId ===
            user?.id
        )
        .filter(
          (request) =>
            statusFilter ===
              "All" ||
            request.status ===
              statusFilter
        )
        .filter(
          (request) =>
            monthFilter ===
              "All" ||
            String(
              request.createdAt ||
                ""
            ).slice(
              5,
              7
            ) ===
              monthFilter
        )
        .filter(
          (request) =>
            yearFilter ===
              "All" ||
            String(
              request.createdAt ||
                ""
            ).slice(
              0,
              4
            ) ===
              yearFilter
        )
        .filter(
          (request) => {
            if (
              !searchValue
            ) {
              return true;
            }

            return `${request.referenceNumber || ""} ${
              request.association || ""
            } ${request.requestType || ""} ${
              request.details || ""
            }`
              .toLowerCase()
              .includes(
                searchValue
              );
          }
        )
        .sort(
          (a, b) =>
            String(
              b.createdAt ||
                ""
            ).localeCompare(
              String(
                a.createdAt ||
                  ""
              )
            )
        );
    },
    [
      requests,
      user?.id,
      search,
      statusFilter,
      monthFilter,
      yearFilter
    ]
  );

  const handleDelete =
    async (
      request
    ) => {
      if (
        request.clientId !==
        user?.id
      ) {
        return;
      }

      const confirmed =
        window.confirm(
          `Delete request ${
            request.referenceNumber ||
            request.id
          }? This will also remove its uploaded documents.`
        );

      if (!confirmed) {
        return;
      }

      try {
        await deleteRequest(
          request.id
        );

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
    <div className="page request-page">
      <div className="page-header">
        <span className="eyebrow">
          SERVICE REQUESTS
        </span>

        <h1>
          My Requests
        </h1>

        <p>
          Submit requests and
          keep your documents
          organized.
        </p>
      </div>

      <div className="two-column request-layout">
        <form
          className="card form-card request-form-card"
          onSubmit={submit}
        >
          <div className="request-form-heading">
            <div>
              <h3>
                New service
                request
              </h3>

              <p>
                Review the
                documentary
                requirements before
                submitting.
              </p>
            </div>

            <span className="request-requirement-badge">
              Review first
            </span>
          </div>

          <div className="request-requirements-panel">
            <div className="request-requirements-header">
              <span className="eyebrow">
                DOCUMENTARY
                REQUIREMENTS
              </span>

              <h3>
                Minimum Requirements
              </h3>
            </div>

            <div className="request-requirements-list">
              {MINIMUM_REQUIREMENTS.map(
                (
                  requirement,
                  index
                ) => (
                  <div
                    className="request-requirement-item"
                    key={
                      requirement.title
                    }
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
                        {
                          requirement.text
                        }
                      </p>

                      {requirement.items && (
                        <ol>
                          {requirement.items.map(
                            (
                              item
                            ) => (
                              <li
                                key={
                                  item
                                }
                              >
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
                checked={
                  requirementsRead
                }
                onChange={(
                  event
                ) =>
                  setRequirementsRead(
                    event.target
                      .checked
                  )
                }
              />

              <span>
                I have read and
                understand the
                minimum documentary
                requirements.
              </span>
            </label>
          </div>

          <div className="assigned-association">
            <span>
              Assigned association
            </span>

            <strong>
              {user?.association ||
                "No association assigned"}
            </strong>
          </div>

          <label>
            Request type
          </label>

          <select
            value={
              form.requestType
            }
            onChange={(
              event
            ) =>
              updateForm(
                "requestType",
                event.target
                  .value
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
            value={
              form.details
            }
            onChange={(
              event
            ) =>
              updateForm(
                "details",
                event.target
                  .value
              )
            }
            placeholder="Describe your request..."
            required
          />

          <label>
            Supporting documents
          </label>

          <p className="upload-help">
            Supporting documents
            are optional during
            initial submission.
            Each file must be
            5 MB or smaller.
          </p>

          <label className="file-upload-box">
            <span className="file-upload-icon">
              📁
            </span>

            <strong>
              Click to select
              documents
            </strong>

            <small>
              Optional · PDF, JPG,
              PNG · Maximum 5 MB
              per file
            </small>

            <input
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
              onChange={
                changeFiles
              }
            />
          </label>

          {files.length >
            0 && (
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
                  (
                    file,
                    index
                  ) => {
                    const preview =
                      previews[
                        index
                      ];

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
                              alt={
                                file.name
                              }
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
                            title={
                              file.name
                            }
                          >
                            {
                              file.name
                            }
                          </strong>

                          <small>
                            {(
                              file.size /
                              1024
                            ).toFixed(
                              0
                            )}{" "}
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
            className="primary-btn full"
            type="submit"
          >
            Submit request
          </button>
        </form>

        <section className="card request-list-card">
          <div className="request-list-heading">
            <div>
              <h3>
                Submitted requests
              </h3>

              <p>
                Search and manage
                your submitted
                requests.
              </p>
            </div>
          </div>

          <div className="request-filters">
            <input
              className="search-input"
              type="search"
              placeholder="Search requests..."
              value={search}
              onChange={(
                event
              ) =>
                setSearch(
                  event.target
                    .value
                )
              }
            />

            <select
              value={
                statusFilter
              }
              onChange={(
                event
              ) =>
                setStatusFilter(
                  event.target
                    .value
                )
              }
            >
              <option value="All">
                All statuses
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
            </select>

            <select
              value={
                monthFilter
              }
              onChange={(
                event
              ) =>
                setMonthFilter(
                  event.target
                    .value
                )
              }
            >
              <option value="All">
                All months
              </option>

              {[
                "01",
                "02",
                "03",
                "04",
                "05",
                "06",
                "07",
                "08",
                "09",
                "10",
                "11",
                "12"
              ].map(
                (month) => (
                  <option
                    value={
                      month
                    }
                    key={
                      month
                    }
                  >
                    {new Date(
                      2000,
                      Number(
                        month
                      ) - 1,
                      1
                    ).toLocaleDateString(
                      undefined,
                      {
                        month:
                          "long"
                      }
                    )}
                  </option>
                )
              )}
            </select>

            <select
              value={
                yearFilter
              }
              onChange={(
                event
              ) =>
                setYearFilter(
                  event.target
                    .value
                )
              }
            >
              <option value="All">
                All years
              </option>

              {years.map(
                (year) => (
                  <option
                    value={
                      year
                    }
                    key={
                      year
                    }
                  >
                    {year}
                  </option>
                )
              )}
            </select>
          </div>

          <div className="request-list">
            {mine.map(
              (request) => (
                <article
                  className="card request-row"
                  key={
                    request.id
                  }
                >
                  <div className="request-row-content">
                    <div className="request-reference">
                      {
                        request.referenceNumber ||
                        request.id
                      }
                    </div>

                    <h3>
                      {
                        request.requestType
                      }
                    </h3>

                    <p>
                      {
                        request.details
                      }
                    </p>

                    <small>
                      {
                        request.association
                      }{" "}
                      ·{" "}
                      {
                        request.createdAt
                      }
                    </small>
                  </div>

                  <div className="request-row-actions">
                    <span className="tag">
                      {
                        request.status
                      }
                    </span>

                    <button
                      type="button"
                      className="danger-btn small"
                      onClick={() =>
                        handleDelete(
                          request
                        )
                      }
                    >
                      Delete
                    </button>
                  </div>
                </article>
              )
            )}

            {mine.length ===
              0 && (
              <div className="empty-state">
                <strong>
                  No requests found.
                </strong>

                <span>
                  Try changing your
                  filters or submit
                  your first request.
                </span>
              </div>
            )}
          </div>
        </section>
      </div>

      {previewFile?.url && (
        <div
          className="modal-overlay"
          onClick={() =>
            setPreviewFile(
              null
            )
          }
        >
          <div
            className="modal-card request-preview-modal"
            onClick={(
              event
            ) =>
              event.stopPropagation()
            }
          >
            <div className="modal-header">
              <div>
                <span className="eyebrow">
                  DOCUMENT
                </span>

                <h2>
                  {
                    previewFile.name
                  }
                </h2>
              </div>

              <button
                type="button"
                className="modal-close"
                onClick={() =>
                  setPreviewFile(
                    null
                  )
                }
              >
                ×
              </button>
            </div>

            {previewFile.type?.startsWith(
              "image/"
            ) ? (
              <img
                className="request-preview-image"
                src={
                  previewFile.url
                }
                alt={
                  previewFile.name
                }
              />
            ) : (
              <iframe
                className="request-preview-frame"
                src={
                  previewFile.url
                }
                title={
                  previewFile.name
                }
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}