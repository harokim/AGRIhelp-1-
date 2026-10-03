import { useMemo, useState } from "react";
import { useRequests } from "../context/RequestContext";
import { useAuth } from "../context/AuthContext";

export default function EngineerRequests() {
  const {
    requests,
    documents,
    decide,
    deleteRequest
  } = useRequests();

  const { users } = useAuth();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [monthFilter, setMonthFilter] = useState("All");
  const [yearFilter, setYearFilter] = useState("All");
  const [note, setNote] = useState("");
  const [selected, setSelected] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);
  const [noteType, setNoteType] = useState("");

  const clientFor = (id) =>
    users.find((user) => user.id === id);

  const getRequestDate = (request) => {
    const value = request.createdAt;

    if (!value) {
      return null;
    }

    if (
      typeof value === "object" &&
      typeof value.toDate === "function"
    ) {
      return value.toDate();
    }

    if (
      typeof value === "object" &&
      typeof value.seconds === "number"
    ) {
      return new Date(value.seconds * 1000);
    }

    const date = new Date(value);

    return Number.isNaN(date.getTime())
      ? null
      : date;
  };

  const availableYears = useMemo(() => {
    const years = requests
      .map((request) => {
        const date = getRequestDate(request);
        return date ? date.getFullYear() : null;
      })
      .filter(Boolean);

    return [...new Set(years)].sort(
      (a, b) => b - a
    );
  }, [requests]);

  const filteredRequests = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();

    return requests.filter((request) => {
      const client = clientFor(request.clientId);

      const searchableText = [
        request.referenceNumber,
        request.id,
        request.association,
        request.details,
        request.requestType,
        request.type,
        request.item,
        request.project,
        request.justification,
        request.barangay,
        request.contactPerson,
        client?.name,
        client?.email,
        client?.association,
        client?.barangay
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !searchTerm ||
        searchableText.includes(searchTerm);

      const matchesStatus =
        statusFilter === "All" ||
        request.status === statusFilter;

      const requestType =
        request.requestType ||
        request.type ||
        "";

      const matchesType =
        typeFilter === "All" ||
        requestType === typeFilter;

      const requestDate =
        getRequestDate(request);

      const matchesMonth =
        monthFilter === "All" ||
        (
          requestDate &&
          requestDate.getMonth() + 1 ===
            Number(monthFilter)
        );

      const matchesYear =
        yearFilter === "All" ||
        (
          requestDate &&
          requestDate.getFullYear() ===
            Number(yearFilter)
        );

      return (
        matchesSearch &&
        matchesStatus &&
        matchesType &&
        matchesMonth &&
        matchesYear
      );
    });
  }, [
    requests,
    users,
    search,
    statusFilter,
    typeFilter,
    monthFilter,
    yearFilter
  ]);

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("All");
    setTypeFilter("All");
    setMonthFilter("All");
    setYearFilter("All");
  };

  const hasActiveFilters =
    search.trim() !== "" ||
    statusFilter !== "All" ||
    typeFilter !== "All" ||
    monthFilter !== "All" ||
    yearFilter !== "All";

  const setDecision = (request, status) => {
    if (
      !["Submitted", "Under Review"].includes(
        request.status
      )
    ) {
      return;
    }

    if (
      status === "Documents Pending" ||
      status === "Rejected"
    ) {
      setSelected(request);
      setNote("");
      setNoteType(status);
      return;
    }

    if (
      confirm(
        `Set ${
          request.referenceNumber || request.id
        } as ${status}?`
      )
    ) {
      decide(request.id, status);
    }
  };

  const confirmPending = async () => {
    if (!note.trim()) {
      alert(
        noteType === "Rejected"
          ? "A rejection reason is required."
          : "An internal note is required."
      );
      return;
    }

    try {
      await decide(
        selected.id,
        noteType,
        note.trim()
      );

      setSelected(null);
      setNote("");
      setNoteType("");
    } catch (error) {
      alert(
        error?.message ||
          "The request could not be updated."
      );
    }
  };

  const handleDelete = async (request) => {
    if (
      !confirm(
        `Delete ${
          request.referenceNumber || request.id
        } and all of its documents? This cannot be undone.`
      )
    ) {
      return;
    }

    try {
      await deleteRequest(request.id);

      if (
        selectedRequest?.id === request.id
      ) {
        setSelectedRequest(null);
      }

      alert(
        "Request and its documents were deleted."
      );
    } catch (error) {
      alert(
        error?.message ||
          "The request could not be deleted."
      );
    }
  };

  const openDocuments = (request) => {
    setSelectedRequest(request);
  };

  const selectedDocuments = selectedRequest
    ? documents.filter(
        (document) =>
          document.requestId ===
          selectedRequest.id
      )
    : [];

  return (
    <div className="container page-container">
      <div className="page-header">
        <div>
          <span className="eyebrow">
            REQUEST MANAGEMENT
          </span>

          <h1>Client requests</h1>

          <p>
            Review requests and manage submitted
            documents.
          </p>
        </div>
      </div>

      <div className="request-filters card">
        <div className="request-search-section">
          <label htmlFor="request-search">
            Search requests
          </label>

          <input
            id="request-search"
            className="search-input wide-search"
            placeholder="Search reference number, association, client, email, barangay..."
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
          />
        </div>

        <div className="request-filter-row">
          <div className="request-filter-field">
            <label htmlFor="status-filter">
              Status
            </label>

            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value)
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
          </div>

          <div className="request-filter-field">
            <label htmlFor="type-filter">
              Request Type
            </label>

            <select
              id="type-filter"
              value={typeFilter}
              onChange={(e) =>
                setTypeFilter(e.target.value)
              }
            >
              <option value="All">
                All request types
              </option>
              <option value="Machinery">
                Machinery
              </option>
              <option value="Infrastructure">
                Infrastructure
              </option>
            </select>
          </div>

          <div className="request-filter-field">
            <label htmlFor="month-filter">
              Month
            </label>

            <select
              id="month-filter"
              value={monthFilter}
              onChange={(e) =>
                setMonthFilter(e.target.value)
              }
            >
              <option value="All">
                All months
              </option>
              <option value="1">
                January
              </option>
              <option value="2">
                February
              </option>
              <option value="3">
                March
              </option>
              <option value="4">
                April
              </option>
              <option value="5">
                May
              </option>
              <option value="6">
                June
              </option>
              <option value="7">
                July
              </option>
              <option value="8">
                August
              </option>
              <option value="9">
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
          </div>

          <div className="request-filter-field">
            <label htmlFor="year-filter">
              Year
            </label>

            <select
              id="year-filter"
              value={yearFilter}
              onChange={(e) =>
                setYearFilter(e.target.value)
              }
            >
              <option value="All">
                All years
              </option>

              {availableYears.map((year) => (
                <option
                  key={year}
                  value={year}
                >
                  {year}
                </option>
              ))}
            </select>
          </div>

          <div className="request-filter-actions">
            <button
              type="button"
              className="secondary-btn"
              onClick={clearFilters}
              disabled={!hasActiveFilters}
            >
              Clear Filters
            </button>
          </div>
        </div>

        <div className="request-filter-results">
          <strong>
            {filteredRequests.length}
          </strong>{" "}
          {filteredRequests.length === 1
            ? "request"
            : "requests"}{" "}
          found
        </div>
      </div>

      <div className="request-list">
        {filteredRequests.map((request) => {
          const client = clientFor(
            request.clientId
          );

          const docs = documents.filter(
            (document) =>
              document.requestId === request.id
          );

          return (
            <div
              className="card request-review"
              key={request.id}
            >
              <div className="request-top">
                <div className="request-review-info">
                  <span className="request-id">
                    {request.referenceNumber ||
                      request.id}
                  </span>

                  <h3>{request.association}</h3>

                  <p>{request.details}</p>

                  <small>
                    Client:{" "}
                    {client?.name || "Unknown"}{" "}
                    · {client?.email || ""}
                  </small>
                </div>

                <span
                  className={`status ${String(
                    request.status
                  )
                    .toLowerCase()
                    .replaceAll(" ", "-")}`}
                >
                  {request.status}
                </span>
              </div>

              <div className="engineer-request-documents">
                <div className="engineer-documents-summary">
                  <div>
                    <strong>
                      Submitted documents
                    </strong>

                    <span>
                      {docs.length}{" "}
                      {docs.length === 1
                        ? "document"
                        : "documents"}
                    </span>
                  </div>

                  {docs.length > 0 && (
                    <button
                      type="button"
                      className="secondary-btn small"
                      onClick={() =>
                        openDocuments(request)
                      }
                    >
                      View Documents
                    </button>
                  )}
                </div>

                {docs.length > 0 ? (
                  <div className="file-list">
                    {docs.map((document) => (
                      <span
                        key={document.id}
                        title={document.fileName}
                      >
                        📄 {document.fileName}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="engineer-no-documents">
                    No documents submitted.
                  </div>
                )}
              </div>

              <div className="request-actions-row">
                <div className="request-decision-area">
                  {["Submitted", "Under Review"].includes(
                    request.status
                  ) ? (
                    <div className="decision-actions">
                      <button
                        className="primary-btn"
                        onClick={() =>
                          setDecision(
                            request,
                            "Approved"
                          )
                        }
                      >
                        Approve
                      </button>

                      <button
                        className="danger-btn"
                        onClick={() =>
                          setDecision(
                            request,
                            "Rejected"
                          )
                        }
                      >
                        Reject
                      </button>

                      <button
                        className="secondary-btn"
                        onClick={() =>
                          setDecision(
                            request,
                            "Documents Pending"
                          )
                        }
                      >
                        Documents Pending
                      </button>
                    </div>
                  ) : (
                    <div className="locked-note">
                      Current status:{" "}
                      {request.status}.{" "}
                      {request.notes &&
                        `Note: ${request.notes}`}
                    </div>
                  )}
                </div>

                <div className="request-delete-area">
                  <button
                    type="button"
                    className="danger-outline-btn engineer-delete-request"
                    onClick={() =>
                      handleDelete(request)
                    }
                  >
                    Delete request
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {filteredRequests.length === 0 && (
          <div className="empty-state">
            {hasActiveFilters
              ? "No requests match your search or filters."
              : "No requests found."}
          </div>
        )}
      </div>

      {selectedRequest && (
        <div
          className="modal-backdrop"
          onClick={() =>
            setSelectedRequest(null)
          }
        >
          <div
            className="modal card engineer-documents-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="modal-header">
              <div>
                <span className="eyebrow">
                  CLIENT DOCUMENTS
                </span>

                <h2>
                  {selectedRequest.referenceNumber ||
                    selectedRequest.id}
                </h2>

                <p>
                  {selectedRequest.association}
                </p>
              </div>

              <button
                type="button"
                className="text-btn"
                onClick={() =>
                  setSelectedRequest(null)
                }
              >
                Close
              </button>
            </div>

            {selectedDocuments.length === 0 ? (
              <div className="documents-empty-state">
                No documents were found for this
                request.
              </div>
            ) : (
              <div className="client-document-list">
                {selectedDocuments.map(
                  (document) => {
                    const isImage =
                      document.contentType?.startsWith(
                        "image/"
                      );

                    const canPreview =
                      Boolean(document.data) &&
                      (isImage ||
                        document.contentType ===
                          "application/pdf");

                    return (
                      <div
                        className="client-document-item"
                        key={document.id}
                      >
                        <div className="client-document-icon">
                          {document.contentType ===
                          "application/pdf"
                            ? "PDF"
                            : isImage
                            ? "IMG"
                            : "FILE"}
                        </div>

                        <div className="client-document-info">
                          <strong
                            title={
                              document.fileName
                            }
                          >
                            {document.fileName}
                          </strong>

                          <small>
                            {document.documentType ||
                              "Supporting Document"}
                          </small>

                          {document.fileSize && (
                            <small>
                              {(
                                document.fileSize /
                                1024
                              ).toFixed(0)}{" "}
                              KB
                            </small>
                          )}

                          {document.engineerRemarks && (
                            <small>
                              Engineer remarks:{" "}
                              {
                                document.engineerRemarks
                              }
                            </small>
                          )}
                        </div>

                        {canPreview ? (
                          <button
                            type="button"
                            className="secondary-btn small document-view-button"
                            onClick={() =>
                              setPreviewFile({
                                name:
                                  document.fileName,
                                type:
                                  document.contentType,
                                url: document.data
                              })
                            }
                          >
                            View
                          </button>
                        ) : (
                          <span className="document-preview-unavailable">
                            No preview
                          </span>
                        )}
                      </div>
                    );
                  }
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {previewFile && (
        <div
          className="modal-backdrop document-viewer-overlay"
          onClick={() =>
            setPreviewFile(null)
          }
        >
          <div
            className="modal card document-viewer-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="modal-header">
              <h2>{previewFile.name}</h2>

              <button
                type="button"
                className="text-btn"
                onClick={() =>
                  setPreviewFile(null)
                }
              >
                Close
              </button>
            </div>

            <div className="document-viewer-content">
              {previewFile.type ===
              "application/pdf" ? (
                <iframe
                  className="document-pdf-preview"
                  src={previewFile.url}
                  title={previewFile.name}
                />
              ) : previewFile.type?.startsWith(
                  "image/"
                ) ? (
                <img
                  className="document-image-preview"
                  src={previewFile.url}
                  alt={previewFile.name}
                />
              ) : (
                <div className="document-preview-unavailable">
                  This file type cannot be previewed.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {selected && (
        <div className="modal-backdrop">
          <div className="modal card">
            <h2>
              {noteType === "Rejected"
                ? "Reject request"
                : "Request additional documents"}
            </h2>

            <p>
              {noteType === "Rejected"
                ? "Provide a reason why this request is being rejected. The client will be able to see this reason."
                : "Add an internal note explaining what the client needs to provide."}
            </p>

            <textarea
              rows="5"
              value={note}
              onChange={(e) =>
                setNote(e.target.value)
              }
              placeholder={
                noteType === "Rejected"
                  ? "Reason for rejection..."
                  : "Internal note..."
              }
            />

            <div className="form-actions">
              <button
                type="button"
                className="secondary-btn"
                onClick={() => {
                  setSelected(null);
                  setNote("");
                  setNoteType("");
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                className={
                  noteType === "Rejected"
                    ? "danger-btn"
                    : "primary-btn"
                }
                onClick={confirmPending}
              >
                {noteType === "Rejected"
                  ? "Reject request"
                  : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
