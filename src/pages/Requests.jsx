import { useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useRequests } from "../context/RequestContext";
import { MAX_FILE_SIZE } from "../utils";
import {
  saveDocument,
  fileToDataURL
} from "../services/documentService";

export default function Requests() {
  const { user } = useAuth();

  const {
    requests,
    createRequest,
    deleteRequest
  } = useRequests();

  const [form, setForm] = useState({
    details: ""
  });

  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);

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
      (file) => file.size > MAX_FILE_SIZE
    );

    if (invalid) {
      alert(
        `"${invalid.name}" is larger than the allowed file size.`
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
        details: ""
      });

      setFiles([]);
      setPreviews([]);

      alert(
        "Request submitted successfully."
      );
    } catch (error) {
      alert(
        error?.message ||
          "The request could not be submitted."
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
        } ${request.details || ""}`
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
          <h3>New service request</h3>

          <div className="assigned-association">
            <span>Assigned association</span>

            <strong>
              {user?.association ||
                "No association assigned"}
            </strong>
          </div>

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
            system upload limit.
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
          >
            Submit request
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