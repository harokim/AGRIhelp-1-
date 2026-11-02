
import { useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useRequests } from "../context/RequestContext";
import DocumentCompleteness from "../components/DocumentCompleteness";
import { getDocumentRequirementLabel } from "../utils/documentRequirements";

function requestDate(request) {
  const value = request.createdAtTimestamp || request.createdAt;
  if (value?.toDate) return value.toDate();
  if (value?.seconds) return new Date(value.seconds * 1000);

  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

function formatDate(request) {
  const date = requestDate(request);

  return date
    ? date.toLocaleString("en-PH", {
        timeZone: "Asia/Manila",
        dateStyle: "medium",
        timeStyle: "short"
      })
    : "Date unavailable";
}

export default function EngineerRequests() {
  const { requests, documents, decide, deleteRequest } = useRequests();
  const { users = [] } = useAuth();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [selectedAssociation, setSelectedAssociation] = useState("");
  const [selectedRequestId, setSelectedRequestId] = useState("");
  const [previewDocument, setPreviewDocument] = useState(null);
  const [noteRequest, setNoteRequest] = useState(null);
  const [note, setNote] = useState("");
  const [noteStatus, setNoteStatus] = useState("");
  const [pendingDelete, setPendingDelete] = useState(null);
  const [busy, setBusy] = useState(false);

  const clientFor = (id) => users.find((item) => item.id === id);

  const filteredRequests = useMemo(() => {
    const term = search.trim().toLowerCase();

    return requests
      .filter((request) => {
        if (statusFilter === "All") {
          if (request.status === "Approved") return false;
        } else if (request.status !== statusFilter) {
          return false;
        }

        if (
          typeFilter !== "All" &&
          (request.requestType || request.type) !== typeFilter
        ) {
          return false;
        }

        if (!term) return true;

        const client = users.find((item) => item.id === request.clientId);

        return [
          request.referenceNumber,
          request.id,
          request.association,
          request.requestType,
          request.type,
          request.details,
          request.status,
          client?.name,
          client?.email
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(term);
      })
      .sort((a, b) =>
        String(a.association || "").localeCompare(String(b.association || "")) ||
        (requestDate(b)?.getTime() || 0) - (requestDate(a)?.getTime() || 0)
      );
  }, [requests, users, search, statusFilter, typeFilter]);

  const groups = useMemo(() => {
    const grouped = new Map();

    filteredRequests.forEach((request) => {
      const association = request.association || "Unassigned Association";

      if (!grouped.has(association)) grouped.set(association, []);
      grouped.get(association).push(request);
    });

    return [...grouped.entries()].map(([association, items]) => ({
      association,
      requests: items
    }));
  }, [filteredRequests]);

  const associationRequests = filteredRequests.filter(
    (request) => (request.association || "Unassigned Association") === selectedAssociation
  );

  const selectedRequest = requests.find((item) => item.id === selectedRequestId) || null;

  const requestDocuments = (requestId) =>
    documents.filter((item) => item.requestId === requestId);

  const currentDocuments = selectedRequest
    ? requestDocuments(selectedRequest.id)
    : [];

  const openPdf = (document) => {
    if (!document?.data) {
      window.alert("This document has no readable file data.");
      return;
    }

    const url = document.data;
    const tab = window.open(url, "_blank");

    if (!tab) {
      window.alert("Your browser blocked the document tab. Allow pop-ups and try again.");
    }
  };

  const handleDecision = async (request, status) => {
    if (!["Submitted", "Under Review"].includes(request.status)) return;

    if (status === "Rejected" || status === "Documents Pending") {
      setNoteRequest(request);
      setNoteStatus(status);
      setNote("");
      return;
    }

    if (!window.confirm(`Set ${request.referenceNumber || request.id} as ${status}?`)) {
      return;
    }

    try {
      await decide(request.id, status);
    } catch (error) {
      window.alert(error?.message || "The request could not be updated.");
    }
  };

  const submitNote = async () => {
    if (!noteRequest || !note.trim()) {
      window.alert("Enter a reason or note before continuing.");
      return;
    }

    try {
      await decide(noteRequest.id, noteStatus, note.trim());
      setNoteRequest(null);
      setNote("");
      setNoteStatus("");
    } catch (error) {
      window.alert(error?.message || "The request could not be updated.");
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete || busy) return;

    setBusy(true);

    try {
      await deleteRequest(pendingDelete.id);

      if (selectedRequestId === pendingDelete.id) {
        setSelectedRequestId("");
      }

      setPendingDelete(null);
    } catch (error) {
      window.alert(error?.message || "The request could not be deleted.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container page-container">
      <div className="page-header">
        <span className="eyebrow">REQUEST MANAGEMENT</span>
        <h1>Client Requests</h1>
        <p>Select an association to review its submitted requests and documents.</p>
      </div>

      <div className="request-filters card engineer-request-filters">
        <div className="engineer-request-filter-row">
          <div className="engineer-request-search">
            <label htmlFor="engineer-request-search">Search</label>
            <input
              id="engineer-request-search"
              className="search-input"
              placeholder="Search association, client, or request..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <div className="engineer-request-filter-field">
            <label htmlFor="engineer-request-type">Type</label>
            <select
              id="engineer-request-type"
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
            >
              <option value="All">All types</option>
              <option value="Machinery">Machinery</option>
              <option value="Infrastructure">Infrastructure</option>
            </select>
          </div>

          <div className="engineer-request-filter-field">
            <label htmlFor="engineer-request-status">Status</label>
            <select
              id="engineer-request-status"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="All">All except approved</option>
              <option value="Submitted">Submitted</option>
              <option value="Under Review">Under Review</option>
              <option value="Documents Pending">Documents Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
        </div>

        <p>{filteredRequests.length} matching requests across {groups.length} associations.</p>
      </div>

      <section className="request-report-list card">
        <div className="report-list-header">
          <div>
            <strong>Associations</strong>
            <small>Select an association to open its requests.</small>
          </div>
        </div>

        {groups.length === 0 ? (
          <div className="empty-state">No associations or requests match these filters.</div>
        ) : (
          <div className="report-request-items">
            {groups.map((group) => {
              const pending = group.requests.filter((item) =>
                ["Submitted", "Under Review", "Documents Pending"].includes(item.status)
              ).length;

              return (
                <button
                  type="button"
                  key={group.association}
                  className="report-request-item report-request-clickable"
                  onClick={() => setSelectedAssociation(group.association)}
                >
                  <div className="report-request-main">
                    <span className="request-id">
                      {group.requests.length} request{group.requests.length === 1 ? "" : "s"}
                    </span>
                    <strong>{group.association}</strong>
                    <span className="report-request-type">{pending} awaiting review or documents</span>
                    <small>Latest submission: {formatDate(group.requests[0])}</small>
                  </div>

                  <div className="report-request-side">
                    <span className="report-view-details">View Requests →</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {selectedAssociation && (
        <div className="modal-backdrop report-details-backdrop" onClick={() => setSelectedAssociation("")}>
          <div
            className="modal card report-details-modal association-requests-modal"
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header report-details-header">
              <div>
                <span className="eyebrow">ASSOCIATION REQUESTS</span>
                <h2>{selectedAssociation}</h2>
                <p>{associationRequests.length} requests found</p>
              </div>
              <button type="button" className="text-btn" onClick={() => setSelectedAssociation("")}>
                Close
              </button>
            </div>

            {associationRequests.length === 0 ? (
              <div className="empty-state">No requests match the current filters.</div>
            ) : (
              <div className="report-request-items association-request-list">
                {associationRequests.map((request) => {
                  const client = clientFor(request.clientId);
                  const count = requestDocuments(request.id).length;

                  return (
                    <button
                      type="button"
                      key={request.id}
                      className="report-request-item report-request-clickable"
                      onClick={() => setSelectedRequestId(request.id)}
                    >
                      <div className="report-request-main">
                        <span className="request-id">
                          {request.referenceNumber || request.id}
                        </span>
                        <strong>{request.requestType || request.type || "Request"}</strong>
                        <small>{client?.name || "Unknown client"} · {formatDate(request)}</small>
                        <small>{count} document file{count === 1 ? "" : "s"}</small>
                      </div>

                      <div className="report-request-side">
                        <span className={`status ${String(request.status || "Submitted").toLowerCase().replaceAll(" ", "-")}`}>
                          {request.status || "Submitted"}
                        </span>
                        <span className="report-view-details">View Details →</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {selectedRequest && (
        <div className="modal-backdrop report-details-backdrop" onClick={() => setSelectedRequestId("")}>
          <div
            className="modal card report-details-modal"
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header report-details-header">
              <div>
                <span className="eyebrow">REQUEST DETAILS</span>
                <h2>{selectedRequest.referenceNumber || selectedRequest.id}</h2>
                <p>{selectedRequest.association}</p>
              </div>
              <button type="button" className="text-btn" onClick={() => setSelectedRequestId("")}>
                Close
              </button>
            </div>

            <div className="report-details-status-row">
              <span className={`status ${String(selectedRequest.status || "Submitted").toLowerCase().replaceAll(" ", "-")}`}>
                {selectedRequest.status || "Submitted"}
              </span>
              <span>Date Submitted: {formatDate(selectedRequest)}</span>
            </div>

            <div className="report-section">
              <h3>Client Information</h3>
              <p><strong>Name:</strong> {clientFor(selectedRequest.clientId)?.name || "Unknown"}</p>
              <p><strong>Email:</strong> {clientFor(selectedRequest.clientId)?.email || "Not available"}</p>
              <p><strong>Association:</strong> {selectedRequest.association || "Not provided"}</p>
              <p><strong>Request Type:</strong> {selectedRequest.requestType || selectedRequest.type || "Not specified"}</p>
            </div>

            <div className="report-section">
              <h3>Request Details</h3>
              <div className="request-report-text report-popup-description">
                {selectedRequest.details || "No details provided."}
              </div>
            </div>

            {selectedRequest.notes && (
              <div className="report-section">
                <h3>Engineer Notes / Rejection Reason</h3>
                <div className="request-report-text report-popup-description">
                  {selectedRequest.notes}
                </div>
              </div>
            )}

            <div className="report-section">
              <h3>Submitted Documents ({currentDocuments.length})</h3>

              <DocumentCompleteness
                title="Document requirements"
                documents={currentDocuments.map((item) => ({
                  fileName: item.fileName,
                  documentType: item.documentType || ""
                }))}
              />

              {currentDocuments.length === 0 ? (
                <div className="empty-state">
                  No document records were found for this request. If the client saw an upload error, ask them to resubmit the missing files.
                </div>
              ) : (
                <div className="report-request-items">
                  {currentDocuments.map((document) => (
                    <div className="report-request-item" key={document.id}>
                      <div className="report-request-main">
                        <strong>{document.fileName || "Unnamed document"}</strong>
                        <small>{getDocumentRequirementLabel(document.documentType)}</small>
                        <small>
                          {document.fileSize
                            ? `${(document.fileSize / 1024).toFixed(0)} KB`
                            : "Size unavailable"}
                        </small>
                      </div>

                      <div className="report-request-side">
                        <button
                          type="button"
                          className="secondary-btn small"
                          onClick={() => {
                            if (!document.data) {
                              window.alert("The document data could not be loaded. Refresh and try again.");
                              return;
                            }

                            if (document.contentType === "application/pdf" || /\.pdf$/i.test(document.fileName || "")) {
                              openPdf(document);
                            } else {
                              setPreviewDocument(document);
                            }
                          }}
                        >
                          View
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {["Submitted", "Under Review"].includes(selectedRequest.status) && (
              <div className="report-section">
                <h3>Actions</h3>
                <div className="engineer-table-actions">
                  <button
                    type="button"
                    className="primary-btn small"
                    onClick={() => handleDecision(selectedRequest, "Approved")}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    className="secondary-btn small"
                    onClick={() => handleDecision(selectedRequest, "Documents Pending")}
                  >
                    Request Documents
                  </button>
                  <button
                    type="button"
                    className="danger-btn small"
                    onClick={() => handleDecision(selectedRequest, "Rejected")}
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    className="danger-btn small"
                    onClick={() => setPendingDelete(selectedRequest)}
                  >
                    Delete Request
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {previewDocument?.data && (
        <div className="modal-backdrop" onClick={() => setPreviewDocument(null)}>
          <div className="modal card" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="eyebrow">DOCUMENT PREVIEW</span>
                <h2>{previewDocument.fileName}</h2>
              </div>
              <button type="button" className="text-btn" onClick={() => setPreviewDocument(null)}>
                Close
              </button>
            </div>
            {previewDocument.contentType?.startsWith("image/") ? (
              <img
                src={previewDocument.data}
                alt={previewDocument.fileName}
                style={{ display: "block", width: "100%", maxHeight: "75vh", objectFit: "contain" }}
              />
            ) : (
              <iframe
                title={previewDocument.fileName}
                src={previewDocument.data}
                style={{ width: "100%", height: "70vh", border: 0 }}
              />
            )}
          </div>
        </div>
      )}

      {noteRequest && (
        <div className="modal-backdrop" onClick={() => setNoteRequest(null)}>
          <div className="modal card" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="eyebrow">REQUEST UPDATE</span>
                <h2>{noteStatus}</h2>
              </div>
              <button type="button" className="text-btn" onClick={() => setNoteRequest(null)}>
                Close
              </button>
            </div>

            <label htmlFor="request-note">
              {noteStatus === "Rejected" ? "Reason for rejection" : "Documents or corrections required"}
            </label>
            <textarea
              id="request-note"
              rows={5}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Enter a clear explanation..."
            />

            <button type="button" className="primary-btn full" onClick={submitNote}>
              Confirm
            </button>
          </div>
        </div>
      )}

      {pendingDelete && (
        <div className="modal-backdrop" onClick={() => !busy && setPendingDelete(null)}>
          <div className="modal card" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h2>Delete request?</h2>
              <button type="button" className="text-btn" onClick={() => setPendingDelete(null)}>
                Cancel
              </button>
            </div>
            <p>
              Delete {pendingDelete.referenceNumber || pendingDelete.id} and its associated documents?
            </p>
            <button type="button" className="danger-btn full" disabled={busy} onClick={confirmDelete}>
              {busy ? "Deleting..." : "Confirm Delete"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
