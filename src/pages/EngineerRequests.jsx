
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
  const [pendingDecision, setPendingDecision] = useState(null);
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
        String(a.association || "").localeCompare(
          String(b.association || "")
        ) ||
        (requestDate(b)?.getTime() || 0) -
          (requestDate(a)?.getTime() || 0)
      );
  }, [requests, users, search, statusFilter, typeFilter]);

  const groups = useMemo(() => {
    const grouped = new Map();

    filteredRequests.forEach((request) => {
      const association =
        request.association || "Unassigned Association";

      if (!grouped.has(association)) {
        grouped.set(association, []);
      }

      grouped.get(association).push(request);
    });

    return [...grouped.entries()].map(([association, items]) => ({
      association,
      requests: items
    }));
  }, [filteredRequests]);

  const associationRequests = filteredRequests.filter(
    (request) =>
      (request.association || "Unassigned Association") ===
      selectedAssociation
  );

  const selectedRequest =
    requests.find((item) => item.id === selectedRequestId) || null;

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

    const tab = window.open(document.data, "_blank");

    if (!tab) {
      window.alert(
        "Your browser blocked the document tab. Allow pop-ups and try again."
      );
    }
  };

  const handleDecision = (request, status) => {
    if (!["Submitted", "Under Review"].includes(request.status)) {
      return;
    }

    if (status === "Rejected" || status === "Documents Pending") {
      setNoteRequest(request);
      setNoteStatus(status);
      setNote("");
      return;
    }

    if (status === "Approved") {
      setPendingDecision({
        request,
        status
      });
    }
  };

  const confirmDecision = async () => {
    if (!pendingDecision || busy) return;

    setBusy(true);

    try {
      await decide(
        pendingDecision.request.id,
        pendingDecision.status
      );

      setPendingDecision(null);
    } catch (error) {
      console.error("Request approval failed:", error);

      window.alert(
        error?.message || "The request could not be updated."
      );
    } finally {
      setBusy(false);
    }
  };

  const submitNote = async () => {
    if (!noteRequest || !note.trim()) {
      window.alert("Enter a reason or note before continuing.");
      return;
    }

    if (busy) return;

    setBusy(true);

    try {
      await decide(
        noteRequest.id,
        noteStatus,
        note.trim()
      );

      setNoteRequest(null);
      setNote("");
      setNoteStatus("");
    } catch (error) {
      console.error("Request update failed:", error);

      window.alert(
        error?.message || "The request could not be updated."
      );
    } finally {
      setBusy(false);
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
      console.error("Request deletion failed:", error);

      window.alert(
        error?.message || "The request could not be deleted."
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container page-container engineer-requests-page">
      <style>{`
        .engineer-delete-backdrop,
        .engineer-confirm-backdrop {
          position: fixed;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          background: rgba(0, 0, 0, 0.52);
          backdrop-filter: blur(5px);
          -webkit-backdrop-filter: blur(5px);
        }

        .engineer-delete-backdrop {
          z-index: 10000;
        }

        .engineer-confirm-backdrop {
          z-index: 10001;
        }

        .engineer-confirm-dialog {
          width: 100%;
          max-width: 440px;
          max-height: calc(100vh - 40px);
          overflow: hidden;
          border: 1px solid rgba(24, 91, 49, 0.25);
          border-radius: 15px;
          background: #ffffff;
          color: #17251c;
          box-shadow: 0 20px 55px rgba(0, 0, 0, 0.3);
          animation: engineerConfirmEnter 0.18s ease-out;
        }

        .engineer-confirm-header {
          min-height: 60px;
          padding: 12px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          background: #185b31;
          color: #ffffff;
        }

        .engineer-confirm-heading {
          display: flex;
          align-items: center;
          gap: 11px;
          font-size: 15px;
          font-weight: 750;
        }

        .engineer-confirm-icon {
          width: 30px;
          height: 30px;
          display: flex;
          flex-shrink: 0;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.17);
          font-size: 19px;
          font-weight: 800;
        }

        .engineer-confirm-close {
          width: 32px;
          height: 32px;
          border: 0;
          border-radius: 7px;
          background: transparent;
          color: #ffffff;
          font-size: 23px;
          cursor: pointer;
        }

        .engineer-confirm-close:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.15);
        }

        .engineer-confirm-body {
          padding: 24px 20px;
          background: #ffffff;
          color: #25342a;
          font-size: 14px;
          line-height: 1.6;
          overflow-wrap: anywhere;
        }

        .engineer-confirm-body strong {
          color: #185b31;
        }

        .engineer-confirm-footer {
          min-height: 68px;
          padding: 12px 20px;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          border-top: 1px solid #dce5dd;
          background: #ffffff;
        }

        .engineer-confirm-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
        }

        .engineer-confirm-actions button {
          min-width: 95px;
          min-height: 39px;
          padding: 9px 19px;
          border: 0;
          border-radius: 9px;
          font-size: 13px;
          font-weight: 750;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .engineer-confirm-actions button:disabled,
        .engineer-confirm-close:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .engineer-confirm-cancel {
          background: #edf1ed;
          color: #36513e;
        }

        .engineer-confirm-cancel:hover:not(:disabled) {
          background: #dfe8e0;
        }

        .engineer-confirm-approve {
          background: #27864e;
          color: #ffffff;
          box-shadow: 0 3px 9px rgba(39, 134, 78, 0.18);
        }

        .engineer-confirm-approve:hover:not(:disabled) {
          background: #1d6e3e;
          transform: translateY(-1px);
        }

        html[data-theme="dark"] .engineer-confirm-dialog {
          border-color: rgba(230, 185, 30, 0.25);
          background: #14291e;
          color: #f1f5f1;
        }

        html[data-theme="dark"] .engineer-confirm-body {
          background: #14291e;
          color: #e1eae3;
        }

        html[data-theme="dark"] .engineer-confirm-body strong {
          color: #e6b91e;
        }

        html[data-theme="dark"] .engineer-confirm-footer {
          border-top-color: #355341;
          background: #14291e;
        }

        html[data-theme="dark"] .engineer-confirm-cancel {
          background: #294333;
          color: #e8f0e9;
        }

        html[data-theme="dark"] .engineer-confirm-cancel:hover:not(:disabled) {
          background: #355740;
        }

        .engineer-delete-dialog {
          width: 100%;
          max-width: 440px;
          max-height: calc(100vh - 40px);
          overflow-y: auto;
          margin: auto;
          padding: 26px;
          border: 1px solid rgba(24, 91, 49, 0.18);
          border-radius: 16px;
          background: #ffffff;
          color: #17251c;
          box-shadow: 0 18px 55px rgba(0, 0, 0, 0.28);
          box-sizing: border-box;
        }

        .engineer-delete-dialog h2 {
          margin: 0;
          color: #123b25;
          font-size: 20px;
          font-weight: 700;
        }

        .engineer-delete-dialog p {
          margin: 14px 0 22px;
          color: #4b5b50;
          font-size: 14px;
          line-height: 1.6;
          overflow-wrap: anywhere;
        }

        .engineer-delete-dialog-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .engineer-delete-cancel {
          border: 0;
          background: transparent;
          color: #185b31;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          padding: 8px;
        }

        .engineer-delete-cancel:hover {
          color: #0c2b1b;
          text-decoration: underline;
        }

        .engineer-delete-actions {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .engineer-delete-actions button {
          min-height: 40px;
          padding: 10px 17px;
          border-radius: 9px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: background 0.2s ease, transform 0.2s ease;
        }

        .engineer-delete-actions button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .engineer-delete-confirm {
          border: 1px solid #dc4545;
          background: #dc4545;
          color: #ffffff;
        }

        .engineer-delete-confirm:hover:not(:disabled) {
          background: #bd3030;
          transform: translateY(-1px);
        }

        .engineer-delete-cancel-button {
          border: 1px solid #d5ded7;
          background: #f5f7f5;
          color: #244532;
        }

        .engineer-delete-cancel-button:hover:not(:disabled) {
          background: #e9eee9;
        }

        html[data-theme="dark"] .engineer-delete-dialog {
          border-color: rgba(230, 185, 30, 0.25);
          background: #14291e;
          color: #f1f5f1;
        }

        html[data-theme="dark"] .engineer-delete-dialog h2 {
          color: #f2f6f2;
        }

        html[data-theme="dark"] .engineer-delete-dialog p {
          color: #c5d2c8;
        }

        html[data-theme="dark"] .engineer-delete-cancel {
          color: #e6b91e;
        }

        html[data-theme="dark"] .engineer-delete-cancel:hover {
          color: #f5d66b;
        }

        html[data-theme="dark"] .engineer-delete-cancel-button {
          border-color: #496452;
          background: #203a2b;
          color: #edf4ee;
        }

        html[data-theme="dark"] .engineer-delete-cancel-button:hover:not(:disabled) {
          background: #2a4935;
        }

        @keyframes engineerConfirmEnter {
          from {
            opacity: 0;
            transform: translateY(8px) scale(0.98);
          }

          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @media (max-width: 480px) {
          .engineer-confirm-dialog {
            max-width: 100%;
          }

          .engineer-confirm-footer {
            padding: 12px 16px;
          }

          .engineer-delete-dialog {
            padding: 21px;
          }

          .engineer-delete-actions {
            flex-direction: column-reverse;
            align-items: stretch;
          }

          .engineer-delete-actions button {
            width: 100%;
          }
        }
      `}</style>

      <div className="page-header">
        <span className="eyebrow">REQUEST MANAGEMENT</span>
        <h1>Client Requests</h1>
        <p>
          Select an association to review its submitted requests and documents.
        </p>
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
              <option value="All">All</option>
              <option value="Submitted">Submitted</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
        </div>

        <p>
          {filteredRequests.length} matching requests across {groups.length} associations.
        </p>
      </div>

      <section className="request-report-list card">
        <div className="report-list-header">
          <div>
            <strong>Associations</strong>
            <small>Select an association to open its requests.</small>
          </div>
        </div>

        {groups.length === 0 ? (
          <div className="empty-state">
            No associations or requests match these filters.
          </div>
        ) : (
          <div className="report-request-items">
            {groups.map((group) => {
              const pending = group.requests.filter((item) =>
                [
                  "Submitted",
                  "Under Review",
                  "Documents Pending"
                ].includes(item.status)
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
                      {group.requests.length} request
                      {group.requests.length === 1 ? "" : "s"}
                    </span>

                    <strong>{group.association}</strong>

                    <span className="report-request-type">
                      {pending} awaiting review or documents
                    </span>

                    <small>
                      Latest submission: {formatDate(group.requests[0])}
                    </small>
                  </div>

                  <div className="report-request-side">
                    <span className="report-view-details">
                      View Requests →
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {selectedAssociation && (
        <div
          className="modal-backdrop report-details-backdrop"
          onClick={() => setSelectedAssociation("")}
        >
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

              <button
                type="button"
                className="text-btn"
                onClick={() => setSelectedAssociation("")}
              >
                Close
              </button>
            </div>

            {associationRequests.length === 0 ? (
              <div className="empty-state">
                No requests match the current filters.
              </div>
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

                        <strong>
                          {request.requestType || request.type || "Request"}
                        </strong>

                        <small>
                          {client?.name || "Unknown client"} · {formatDate(request)}
                        </small>

                        <small>
                          {count} document file{count === 1 ? "" : "s"}
                        </small>
                      </div>

                      <div className="report-request-side">
                        <span
                          className={`status ${String(
                            request.status || "Submitted"
                          ).toLowerCase().replaceAll(" ", "-")}`}
                        >
                          {request.status || "Submitted"}
                        </span>

                        <span className="report-view-details">
                          View Details →
                        </span>
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
        <div
          className="modal-backdrop report-details-backdrop"
          onClick={() => setSelectedRequestId("")}
        >
          <div
            className="modal card report-details-modal"
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header report-details-header">
              <div>
                <span className="eyebrow">REQUEST DETAILS</span>
                <h2>
                  {selectedRequest.referenceNumber || selectedRequest.id}
                </h2>
                <p>{selectedRequest.association}</p>
              </div>

              <button
                type="button"
                className="text-btn"
                onClick={() => setSelectedRequestId("")}
              >
                Close
              </button>
            </div>

            <div className="report-details-status-row">
              <span
                className={`status ${String(
                  selectedRequest.status || "Submitted"
                ).toLowerCase().replaceAll(" ", "-")}`}
              >
                {selectedRequest.status || "Submitted"}
              </span>

              <span>
                Date Submitted: {formatDate(selectedRequest)}
              </span>
            </div>

            <div className="report-section">
              <h3>Client Information</h3>
              <p>
                <strong>Name:</strong>{" "}
                {clientFor(selectedRequest.clientId)?.name || "Unknown"}
              </p>
              <p>
                <strong>Email:</strong>{" "}
                {clientFor(selectedRequest.clientId)?.email || "Not available"}
              </p>
              <p>
                <strong>Association:</strong>{" "}
                {selectedRequest.association || "Not provided"}
              </p>
              <p>
                <strong>Request Type:</strong>{" "}
                {selectedRequest.requestType ||
                  selectedRequest.type ||
                  "Not specified"}
              </p>
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
                  No document records were found for this request. If the
                  client saw an upload error, ask them to resubmit the missing
                  files.
                </div>
              ) : (
                <div className="report-request-items">
                  {currentDocuments.map((document) => (
                    <div className="report-request-item" key={document.id}>
                      <div className="report-request-main">
                        <strong>
                          {document.fileName || "Unnamed document"}
                        </strong>

                        <small>
                          {getDocumentRequirementLabel(
                            document.documentType
                          )}
                        </small>

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
                              window.alert(
                                "The document data could not be loaded. Refresh and try again."
                              );
                              return;
                            }

                            if (
                              document.contentType === "application/pdf" ||
                              /\.pdf$/i.test(document.fileName || "")
                            ) {
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

            {["Submitted", "Under Review"].includes(
              selectedRequest.status
            ) && (
              <div className="report-section">
                <h3>Actions</h3>

                <div className="engineer-table-actions">
                  <button
                    type="button"
                    className="primary-btn small"
                    onClick={() =>
                      handleDecision(selectedRequest, "Approved")
                    }
                  >
                    Approve
                  </button>

                  <button
                    type="button"
                    className="danger-btn small"
                    onClick={() =>
                      handleDecision(selectedRequest, "Rejected")
                    }
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
        <div
          className="modal-backdrop"
          onClick={() => setPreviewDocument(null)}
        >
          <div
            className="modal card"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <span className="eyebrow">DOCUMENT PREVIEW</span>
                <h2>{previewDocument.fileName}</h2>
              </div>

              <button
                type="button"
                className="text-btn"
                onClick={() => setPreviewDocument(null)}
              >
                Close
              </button>
            </div>

            {previewDocument.contentType?.startsWith("image/") ? (
              <img
                src={previewDocument.data}
                alt={previewDocument.fileName}
                style={{
                  display: "block",
                  width: "100%",
                  maxHeight: "75vh",
                  objectFit: "contain"
                }}
              />
            ) : (
              <iframe
                title={previewDocument.fileName}
                src={previewDocument.data}
                style={{
                  width: "100%",
                  height: "70vh",
                  border: 0
                }}
              />
            )}
          </div>
        </div>
      )}

      {noteRequest && (
        <div
          className="modal-backdrop"
          onClick={() => !busy && setNoteRequest(null)}
        >
          <div
            className="modal card"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <span className="eyebrow">REQUEST UPDATE</span>
                <h2>{noteStatus}</h2>
              </div>

              <button
                type="button"
                className="text-btn"
                disabled={busy}
                onClick={() => setNoteRequest(null)}
              >
                Close
              </button>
            </div>

            <label htmlFor="request-note">
              {noteStatus === "Rejected"
                ? "Reason for rejection"
                : "Documents or corrections required"}
            </label>

            <textarea
              id="request-note"
              rows={5}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Enter a clear explanation..."
              disabled={busy}
            />

            <button
              type="button"
              className="primary-btn full"
              onClick={submitNote}
              disabled={busy}
            >
              {busy ? "Processing..." : "Confirm"}
            </button>
          </div>
        </div>
      )}

      {pendingDecision && (
        <div
          className="engineer-confirm-backdrop"
          onClick={() => !busy && setPendingDecision(null)}
        >
          <div
            className="engineer-confirm-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="engineer-confirm-title"
            aria-describedby="engineer-confirm-description"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="engineer-confirm-header">
              <div className="engineer-confirm-heading">
                <span className="engineer-confirm-icon">!</span>

                <span id="engineer-confirm-title">
                  AGRIhelp Notification
                </span>
              </div>

              <button
                type="button"
                className="engineer-confirm-close"
                disabled={busy}
                onClick={() => setPendingDecision(null)}
                aria-label="Close confirmation"
              >
                ×
              </button>
            </div>

            <div
              className="engineer-confirm-body"
              id="engineer-confirm-description"
            >
              Set{" "}
              <strong>
                {pendingDecision.request.referenceNumber ||
                  pendingDecision.request.id}
              </strong>{" "}
              as{" "}
              <strong>{pendingDecision.status}</strong>?
            </div>

            <div className="engineer-confirm-footer">
              <div className="engineer-confirm-actions">
                <button
                  type="button"
                  className="engineer-confirm-cancel"
                  disabled={busy}
                  onClick={() => setPendingDecision(null)}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="engineer-confirm-approve"
                  disabled={busy}
                  onClick={confirmDecision}
                >
                  {busy ? "Processing..." : "Confirm"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {pendingDelete && (
        <div
          className="engineer-delete-backdrop"
          onClick={() => !busy && setPendingDelete(null)}
        >
          <div
            className="engineer-delete-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="engineer-delete-title"
            aria-describedby="engineer-delete-description"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="engineer-delete-dialog-header">
              <h2 id="engineer-delete-title">Delete request?</h2>

              <button
                type="button"
                className="engineer-delete-cancel"
                disabled={busy}
                onClick={() => setPendingDelete(null)}
              >
                Cancel
              </button>
            </div>

            <p id="engineer-delete-description">
              Delete{" "}
              <strong>
                {pendingDelete.referenceNumber || pendingDelete.id}
              </strong>{" "}
              and its associated documents? This action cannot be undone.
            </p>

            <div className="engineer-delete-actions">
              <button
                type="button"
                className="engineer-delete-cancel-button"
                disabled={busy}
                onClick={() => setPendingDelete(null)}
              >
                Keep Request
              </button>

              <button
                type="button"
                className="engineer-delete-confirm"
                disabled={busy}
                onClick={confirmDelete}
              >
                {busy ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
