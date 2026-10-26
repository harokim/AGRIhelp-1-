import { useMemo, useState } from "react";
import { useRequests } from "../context/RequestContext";
import { useAuth } from "../context/AuthContext";
import DocumentCompleteness from "../components/DocumentCompleteness";

export default function EngineerRequests() {
  const {
    requests,
    documents,
    decide,
    deleteRequest
  } = useRequests();

  const { users } = useAuth();

  const [pendingDelete, setPendingDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
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
  const [detailsRequest, setDetailsRequest] = useState(null);

  const clientFor = (id) =>
    users.find((user) => user.id === id);

  const getRequestDate = (request) => {
    const value = request.createdAt || request.createdAtTimestamp;

    if (!value) return null;

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

    return Number.isNaN(date.getTime()) ? null : date;
  };

  const formatRequestDate = (request) => {
    const date = getRequestDate(request);

    if (!date) return "Not available";

    return date.toLocaleDateString("en-PH", {
      timeZone: "Asia/Manila",
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  };

  const getRequestType = (request) =>
    request.requestType || request.type || "Not specified";

  const documentsFor = (requestId) =>
    documents.filter((document) => document.requestId === requestId);

  const availableYears = useMemo(() => {
    const years = requests
      .map((request) => {
        const date = getRequestDate(request);
        return date ? date.getFullYear() : null;
      })
      .filter(Boolean);

    return [...new Set(years)].sort((a, b) => b - a);
  }, [requests]);

  const filteredRequests = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();

    return [...requests]
      .filter((request) => {
        const client = users.find(
          (user) => user.id === request.clientId
        );

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
          !searchTerm || searchableText.includes(searchTerm);

        const requestType =
          request.requestType || request.type || "";

        const matchesStatus =
          statusFilter === "All"
            ? request.status !== "Approved"
            : request.status === statusFilter;

        const matchesType =
          typeFilter === "All" ||
          requestType === typeFilter;

        const requestDate = getRequestDate(request);

        const matchesMonth =
          monthFilter === "All" ||
          (
            requestDate &&
            requestDate.getMonth() + 1 === Number(monthFilter)
          );

        const matchesYear =
          yearFilter === "All" ||
          (
            requestDate &&
            requestDate.getFullYear() === Number(yearFilter)
          );

        return (
          matchesSearch &&
          matchesStatus &&
          matchesType &&
          matchesMonth &&
          matchesYear
        );
      })
      .sort((a, b) =>
        String(a.association || "").localeCompare(
          String(b.association || "")
        )
      );
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
    if (!["Submitted", "Under Review"].includes(request.status)) {
      return;
    }

    if (status === "Documents Pending" || status === "Rejected") {
      setSelected(request);
      setNote("");
      setNoteType(status);
      return;
    }

    if (
      window.confirm(
        `Set ${request.referenceNumber || request.id} as ${status}?`
      )
    ) {
      decide(request.id, status);
    }
  };

  const confirmPending = async () => {
    if (!note.trim()) {
      window.alert(
        noteType === "Rejected"
          ? "A rejection reason is required."
          : "An internal note is required."
      );
      return;
    }

    try {
      await decide(selected.id, noteType, note.trim());

      setSelected(null);
      setNote("");
      setNoteType("");
    } catch (error) {
      window.alert(
        error?.message || "The request could not be updated."
      );
    }
  };

  const handleDelete = (request) => {
    setPendingDelete(request);
  };

  const confirmDelete = async () => {
    if (!pendingDelete || isDeleting) return;

    const request = pendingDelete;

    try {
      setIsDeleting(true);

      await deleteRequest(request.id);

      if (selectedRequest?.id === request.id) {
        setSelectedRequest(null);
      }

      if (detailsRequest?.id === request.id) {
        setDetailsRequest(null);
      }

      setPendingDelete(null);
    } catch (error) {
      window.alert(
        error?.message || "The request could not be deleted."
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const openDocuments = (request) => {
    setSelectedRequest(request);
  };

  const openDetails = (request) => {
    setDetailsRequest(request);
  };

  const openPdfInNewTab = (file) => {
    try {
      if (!file?.url) {
        window.alert("The PDF document has no available file data.");
        return;
      }

      let pdfUrl = file.url;
      let generatedBlobUrl = false;

      if (file.url.startsWith("data:")) {
        const commaIndex = file.url.indexOf(",");

        if (commaIndex === -1) {
          throw new Error("Invalid PDF data URL.");
        }

        const header = file.url.slice(0, commaIndex);
        const content = file.url.slice(commaIndex + 1);

        let blob;

        if (header.includes(";base64")) {
          const binary = window.atob(content);
          const bytes = new Uint8Array(binary.length);

          for (let i = 0; i < binary.length; i += 1) {
            bytes[i] = binary.charCodeAt(i);
          }

          blob = new Blob([bytes], {
            type: "application/pdf"
          });
        } else {
          blob = new Blob(
            [decodeURIComponent(content)],
            { type: "application/pdf" }
          );
        }

        pdfUrl = URL.createObjectURL(blob);
        generatedBlobUrl = true;
      }

      const newTab = window.open(pdfUrl, "_blank");

      if (!newTab) {
        if (generatedBlobUrl) {
          URL.revokeObjectURL(pdfUrl);
        }

        window.alert(
          "Your browser blocked the PDF tab. Allow pop-ups for this website and click View again."
        );
        return;
      }

      try {
        newTab.opener = null;
      } catch {
        // The document can still open if opener cannot be changed.
      }
    } catch (error) {
      console.error("Could not open PDF:", error);

      window.alert(
        "The PDF could not be opened. The saved document may be invalid."
      );
    }
  };

  const selectedDocuments = selectedRequest
    ? documentsFor(selectedRequest.id)
    : [];

  const detailsDocuments = detailsRequest
    ? documentsFor(detailsRequest.id)
    : [];

  const completenessDocuments = (requestDocuments) =>
    requestDocuments.map((document) => ({
      fileName: document.fileName,
      documentType: document.documentType || ""
    }));

  return (
    <div className="container page-container">
      <div className="page-header">
        <div>
          <span className="eyebrow">REQUEST MANAGEMENT</span>
          <h1>Client requests</h1>
          <p>Review requests and manage submitted documents.</p>
        </div>
      </div>

      <div className="request-filters card engineer-request-filters">
        <div className="engineer-request-filter-row">
          <div className="engineer-request-search">
            <label htmlFor="request-search">Search</label>
            <input
              id="request-search"
              className="search-input"
              placeholder="Search reference, association, client..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <div className="engineer-request-filter-field">
            <label htmlFor="type-filter">Type</label>
            <select
              id="type-filter"
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
            >
              <option value="All">All</option>
              <option value="Machinery">Machinery</option>
              <option value="Infrastructure">Infrastructure</option>
            </select>
          </div>

          <div className="engineer-request-filter-field">
            <label htmlFor="status-filter">Status</label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="All">All</option>
              <option value="Submitted">Submitted</option>
            
              <option value="Documents Pending">Documents Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>

          <div className="engineer-request-filter-field">
            <label htmlFor="month-filter">Month</label>
            <select
              id="month-filter"
              value={monthFilter}
              onChange={(event) => setMonthFilter(event.target.value)}
            >
              <option value="All">All</option>
              <option value="1">January</option>
              <option value="2">February</option>
              <option value="3">March</option>
              <option value="4">April</option>
              <option value="5">May</option>
              <option value="6">June</option>
              <option value="7">July</option>
              <option value="8">August</option>
              <option value="9">September</option>
              <option value="10">October</option>
              <option value="11">November</option>
              <option value="12">December</option>
            </select>
          </div>

          <div className="engineer-request-filter-field">
            <label htmlFor="year-filter">Year</label>
            <select
              id="year-filter"
              value={yearFilter}
              onChange={(event) => setYearFilter(event.target.value)}
            >
              <option value="All">All</option>
              {availableYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            className="engineer-clear-filters"
            onClick={clearFilters}
            disabled={!hasActiveFilters}
          >
            Clear
          </button>
        </div>

        <div className="request-filter-results">
          <strong>{filteredRequests.length}</strong>{" "}
          {filteredRequests.length === 1 ? "request" : "requests"} found
        </div>
      </div>

      <div className="engineer-request-table-card card">
        <div className="engineer-request-table-wrapper">
          <table className="engineer-request-table">
            <thead>
              <tr>
                <th>Association</th>
                <th>Client</th>
                <th>Type</th>
                <th>Date Submitted</th>
                <th>Status</th>
                <th>Documents</th>
                <th>Requirements</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredRequests.map((request) => {
                const client = clientFor(request.clientId);
                const docs = documentsFor(request.id);

                return (
                  <tr key={request.id}>
                    <td>
                      <strong>
                        {request.association || "Not provided"}
                      </strong>
                    </td>

                    <td>
                      <div className="engineer-table-client">
                        <strong>{client?.name || "Unknown"}</strong>
                        <small>{client?.email || "No email"}</small>
                      </div>
                    </td>

                    <td>
                      <span className="engineer-request-type">
                        {getRequestType(request)}
                      </span>
                    </td>

                    <td>
                      <span className="engineer-request-date">
                        {formatRequestDate(request)}
                      </span>
                    </td>

                    <td>
                      <span
                        className={`status ${String(
                          request.status || "Submitted"
                        ).toLowerCase().replaceAll(" ", "-")}`}
                      >
                        {request.status || "Submitted"}
                      </span>
                    </td>

                    <td>
                      <button
                        type="button"
                        className="engineer-document-count"
                        onClick={() => {
                          if (docs.length > 0) {
                            openDocuments(request);
                          }
                        }}
                        disabled={docs.length === 0}
                      >
                        {docs.length} {docs.length === 1 ? "file" : "files"}
                      </button>
                    </td>

                    <td>
                      <DocumentCompleteness
                        title="Requirements"
                        documents={completenessDocuments(docs)}
                      />
                    </td>

                    <td>
                      <div className="engineer-table-actions">
                        <button
                          type="button"
                          className="secondary-btn small"
                          onClick={() => openDetails(request)}
                        >
                          View
                        </button>

                        {["Submitted", "Under Review"].includes(
                          request.status
                        ) && (
                          <>
                            <button
                              type="button"
                              className="primary-btn small"
                              onClick={() => setDecision(request, "Approved")}
                            >
                              Approve
                            </button>

                            <button
                              type="button"
                              className="danger-btn small"
                              onClick={() => setDecision(request, "Rejected")}
                            >
                              Reject
                            </button>
                          </>
                        )}

                        <button
                          type="button"
                          className="engineer-delete-request"
                          onClick={() => handleDelete(request)}
                          aria-label={`Delete request ${
                            request.referenceNumber || request.id
                          }`}
                          title="Delete request"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="19"
                            height="19"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <path d="M3 6h18" />
                            <path d="M8 6V4h8v2" />
                            <path d="M19 6l-1 14H6L5 6" />
                            <path d="M10 11v5" />
                            <path d="M14 11v5" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredRequests.length === 0 && (
            <div className="empty-state engineer-request-empty">
              {hasActiveFilters
                ? "No requests match your search or filters."
                : "No requests found."}
            </div>
          )}
        </div>
      </div>

      {detailsRequest && (
        <div
          className="modal-backdrop"
          onClick={() => setDetailsRequest(null)}
        >
          <div
            className="modal card engineer-request-details-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <span className="eyebrow">REQUEST DETAILS</span>
                <h2>
                  {detailsRequest.referenceNumber || detailsRequest.id}
                </h2>
                <p>{detailsRequest.association || "No association"}</p>
              </div>

              <button
                type="button"
                className="text-btn"
                onClick={() => setDetailsRequest(null)}
              >
                Close
              </button>
            </div>

            <div className="engineer-request-detail-grid">
              <div>
                <span>Association</span>
                <strong>
                  {detailsRequest.association || "Not provided"}
                </strong>
              </div>

              <div>
                <span>Request Type</span>
                <strong>{getRequestType(detailsRequest)}</strong>
              </div>

              <div>
                <span>Date Submitted</span>
                <strong>{formatRequestDate(detailsRequest)}</strong>
              </div>

              <div>
                <span>Status</span>
                <strong>{detailsRequest.status || "Submitted"}</strong>
              </div>

              <div>
                <span>Client</span>
                <strong>
                  {clientFor(detailsRequest.clientId)?.name || "Unknown"}
                </strong>
              </div>

              <div>
                <span>Email</span>
                <strong>
                  {clientFor(detailsRequest.clientId)?.email || "Not available"}
                </strong>
              </div>
            </div>

            <div className="engineer-request-detail-section">
              <h3>Request Description</h3>
              <div className="engineer-request-description">
                {detailsRequest.details || "No request description provided."}
              </div>
            </div>

            {detailsRequest.notes && (
              <div className="engineer-request-detail-section">
                <h3>Engineer Notes</h3>
                <div className="engineer-request-description">
                  {detailsRequest.notes}
                </div>
              </div>
            )}

            <div className="engineer-request-detail-section">
              <h3>Document Requirement Status</h3>
              <DocumentCompleteness
                title="Required documents"
                documents={completenessDocuments(detailsDocuments)}
              />
            </div>

            <div className="engineer-request-detail-section">
              <div className="engineer-detail-documents-header">
                <div>
                  <h3>Submitted Documents</h3>
                  <span>
                    {detailsDocuments.length}{" "}
                    {detailsDocuments.length === 1
                      ? "document"
                      : "documents"}
                  </span>
                </div>

                {detailsDocuments.length > 0 && (
                  <button
                    type="button"
                    className="secondary-btn small"
                    onClick={() => {
                      const request = detailsRequest;
                      setDetailsRequest(null);
                      openDocuments(request);
                    }}
                  >
                    View Documents
                  </button>
                )}
              </div>

              {detailsDocuments.length > 0 ? (
                <div className="engineer-detail-document-list">
                  {detailsDocuments.map((document) => (
                    <div
                      key={document.id}
                      className="engineer-detail-document"
                    >
                      <span>📄</span>
                      <div>
                        <strong>{document.fileName}</strong>
                        <small>
                          {document.documentType || "Supporting Document"}
                        </small>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="engineer-no-documents">
                  No documents submitted.
                </div>
              )}
            </div>

            <div className="engineer-request-detail-actions">
              {["Submitted", "Under Review"].includes(detailsRequest.status) && (
                <>
                  <button
                    type="button"
                    className="primary-btn"
                    onClick={() => {
                      const request = detailsRequest;
                      setDetailsRequest(null);
                      setDecision(request, "Approved");
                    }}
                  >
                    Approve
                  </button>

                  <button
                    type="button"
                    className="danger-btn"
                    onClick={() => {
                      const request = detailsRequest;
                      setDetailsRequest(null);
                      setDecision(request, "Rejected");
                    }}
                  >
                    Reject
                  </button>

                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={() => {
                      const request = detailsRequest;
                      setDetailsRequest(null);
                      setDecision(request, "Documents Pending");
                    }}
                  >
                    Documents Pending
                  </button>
                </>
              )}

              <button
                type="button"
                className="danger-outline-btn"
                onClick={() => handleDelete(detailsRequest)}
              >
                Delete request
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedRequest && (
        <div
          className="modal-backdrop"
          onClick={() => setSelectedRequest(null)}
        >
          <div
            className="modal card engineer-documents-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <span className="eyebrow">CLIENT DOCUMENTS</span>
                <h2>
                  {selectedRequest.referenceNumber || selectedRequest.id}
                </h2>
                <p>{selectedRequest.association}</p>
              </div>

              <button
                type="button"
                className="modal-close-x"
                onClick={() => setSelectedRequest(null)}
                aria-label="Close documents popup"
                title="Close"
              >
                ×
              </button>
            </div>

            {selectedDocuments.length === 0 ? (
              <div className="documents-empty-state">
                No documents were found for this request.
              </div>
            ) : (
              <div className="client-document-list">
                {selectedDocuments.map((document) => {
                  const isImage =
                    document.contentType?.startsWith("image/");

                  const isPdf =
                    document.contentType === "application/pdf" ||
                    document.fileName?.toLowerCase().endsWith(".pdf");

                  const canPreview =
                    Boolean(document.data) && (isImage || isPdf);

                  return (
                    <div
                      className="client-document-item"
                      key={document.id}
                    >
                      <div className="client-document-icon">
                        {isPdf ? "PDF" : isImage ? "IMG" : "FILE"}
                      </div>

                      <div className="client-document-info">
                        <strong title={document.fileName}>
                          {document.fileName}
                        </strong>

                        <small>
                          {document.documentType || "Supporting Document"}
                        </small>

                        {document.fileSize && (
                          <small>
                            {(document.fileSize / 1024).toFixed(0)} KB
                          </small>
                        )}

                        {document.engineerRemarks && (
                          <small>
                            Engineer remarks: {document.engineerRemarks}
                          </small>
                        )}
                      </div>

                      {canPreview ? (
                        <button
                          type="button"
                          className="secondary-btn small document-view-button"
                          onClick={() => {
                            const file = {
                              name: document.fileName || "Document",
                              type: isPdf
                                ? "application/pdf"
                                : document.contentType,
                              url: document.data
                            };

                            if (isPdf) {
                              openPdfInNewTab(file);
                            } else {
                              setPreviewFile(file);
                            }
                          }}
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
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {previewFile && (
        <div
          className="modal-backdrop document-viewer-overlay"
          onClick={() => setPreviewFile(null)}
        >
          <div
            className="modal card document-viewer-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <h2>{previewFile.name}</h2>

              <button
                type="button"
                className="modal-close-x"
                onClick={() => setPreviewFile(null)}
                aria-label="Close file preview"
                title="Close"
              >
                ×
              </button>
            </div>

            <div className="document-viewer-content">
              {previewFile.type?.startsWith("image/") ? (
                <img
                  className="document-image-preview"
                  src={previewFile.url}
                  alt={previewFile.name}
                />
              ) : (
                <div className="document-preview-unavailable">
                  This file type cannot be previewed in the image viewer.
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
              onChange={(event) => setNote(event.target.value)}
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
                  noteType === "Rejected" ? "danger-btn" : "primary-btn"
                }
                onClick={confirmPending}
              >
                {noteType === "Rejected" ? "Reject request" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingDelete && (
        <div
          className="modal-backdrop engineer-delete-backdrop"
          onClick={() => {
            if (!isDeleting) setPendingDelete(null);
          }}
        >
          <div
            className="engineer-delete-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-confirm-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="engineer-delete-icon">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M3 6h18" />
                <path d="M8 6V4h8v2" />
                <path d="M19 6l-1 14H6L5 6" />
                <path d="M10 11v5" />
                <path d="M14 11v5" />
              </svg>
            </div>

            <span className="engineer-delete-eyebrow">
              DELETE REQUEST
            </span>

            <h2 id="delete-confirm-title">Are you sure?</h2>

            <p className="engineer-delete-description">
              You are about to permanently delete this request and its
              associated documents. This action cannot be undone.
            </p>

            <div className="engineer-delete-reference">
              <span>Request reference</span>
              <strong>
                {pendingDelete.referenceNumber || pendingDelete.id}
              </strong>
              <span className="engineer-delete-association">
                {pendingDelete.association || "No association specified"}
              </span>
            </div>

            <div className="engineer-delete-actions">
              <button
                type="button"
                className="engineer-delete-cancel"
                disabled={isDeleting}
                onClick={() => setPendingDelete(null)}
              >
                Cancel
              </button>

              <button
                type="button"
                className="engineer-delete-confirm"
                disabled={isDeleting}
                onClick={confirmDelete}
              >
                {isDeleting ? (
                  <>
                    <span className="engineer-delete-spinner" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="17"
                      height="17"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M3 6h18" />
                      <path d="M8 6V4h8v2" />
                      <path d="M19 6l-1 14H6L5 6" />
                    </svg>
                    Delete permanently
                  </>
                )}
              </button>
            </div>

            <div className="engineer-delete-footer">
              <span className="engineer-delete-footer-dot" />
              Please verify the request before continuing.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}