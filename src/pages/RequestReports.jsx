
import { useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useRequests } from "../context/RequestContext";

function getRequestDate(request) {
  const value = request?.createdAt || request?.createdAtTimestamp;

  if (!value) return null;

  if (typeof value.toDate === "function") {
    return value.toDate();
  }

  if (typeof value.seconds === "number") {
    return new Date(value.seconds * 1000);
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

function formatRequestDate(request) {
  const date = getRequestDate(request);

  if (!date) return "Not available";

  return date.toLocaleDateString("en-PH", {
    timeZone: "Asia/Manila",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatRequestDateTime(request) {
  const date = getRequestDate(request);

  if (!date) return "Not available";

  return date.toLocaleString("en-PH", {
    timeZone: "Asia/Manila",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getRequestType(request) {
  return request?.requestType || request?.type || "Not specified";
}

function getRequestStatus(request) {
  return request?.status || "Submitted";
}

function getStatusClass(status) {
  return String(status || "Submitted")
    .toLowerCase()
    .replaceAll(" ", "-");
}

function getAssociationName(request) {
  return (
    request?.association?.trim() ||
    "No association"
  );
}

function ReportField({ label, value }) {
  return (
    <div className="report-field">
      <span>{label}</span>
      <strong>{value || "Not available"}</strong>
    </div>
  );
}

export default function RequestReports() {
  const { user, users } = useAuth();
  const { requests } = useRequests();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedAssociation, setSelectedAssociation] = useState(null);
  const [selectedId, setSelectedId] = useState(null);

  const statusList = [
    "All",
    "Submitted",
    "Under Review",
    "Documents Pending",
    "Approved",
    "Rejected",
    "Scheduled for Validation",
  ];

  const filteredRequests = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();

    return requests.filter((request) => {
      const status = getRequestStatus(request);

      if (statusFilter !== "All" && status !== statusFilter) {
        return false;
      }

      const client = users.find(
        (item) => item.id === request.clientId
      );

      const searchableText = [
        request.referenceNumber,
        request.id,
        request.association,
        request.requestType,
        request.type,
        request.details,
        request.item,
        request.project,
        request.justification,
        request.barangay,
        request.contactPerson,
        request.notes,
        client?.name,
        client?.email,
        client?.contactNumber,
        client?.association,
        client?.barangay,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return !searchTerm || searchableText.includes(searchTerm);
    });
  }, [requests, users, search, statusFilter]);

  const associationGroups = useMemo(() => {
    const groups = new Map();

    filteredRequests.forEach((request) => {
      const association = getAssociationName(request);

      if (!groups.has(association)) {
        groups.set(association, []);
      }

      groups.get(association).push(request);
    });

    return Array.from(groups.entries())
      .map(([association, associationRequests]) => ({
        association,
        requests: [...associationRequests].sort((a, b) => {
          const dateA = getRequestDate(a)?.getTime() || 0;
          const dateB = getRequestDate(b)?.getTime() || 0;

          return dateB - dateA;
        }),
      }))
      .sort((a, b) =>
        a.association.localeCompare(b.association, undefined, {
          sensitivity: "base",
        })
      );
  }, [filteredRequests]);

  const selectedAssociationRequests = useMemo(() => {
    if (!selectedAssociation) return [];

    return filteredRequests
      .filter(
        (request) =>
          getAssociationName(request) === selectedAssociation
      )
      .sort((a, b) => {
        const dateA = getRequestDate(a)?.getTime() || 0;
        const dateB = getRequestDate(b)?.getTime() || 0;

        return dateB - dateA;
      });
  }, [filteredRequests, selectedAssociation]);

  const selectedRequest =
    requests.find((request) => request.id === selectedId) || null;

  const selectedClient = selectedRequest
    ? users.find((item) => item.id === selectedRequest.clientId) || null
    : null;

  const closeAssociationModal = () => {
    setSelectedAssociation(null);
  };

  const closeRequestModal = () => {
    setSelectedId(null);
  };

  if (user?.role !== "engineer") {
    return (
      <div className="page">
        <div className="empty-state">
          This page is available to engineers only.
        </div>
      </div>
    );
  }

  return (
    <div className="page request-reports-page">
      <div className="page-header">
        <span className="eyebrow">ENGINEER REPORTS</span>
        <h1>Request Reports</h1>
        <p>
          Browse associations, review their submitted requests, and inspect
          request and client information.
        </p>
      </div>

      <div className="request-report-toolbar card">
        <input
          className="search-input"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search association, request, or client..."
          aria-label="Search associations and requests"
        />

        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="report-filter"
          aria-label="Filter requests by status"
        >
          {statusList.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </div>

      <section className="request-report-list card">
        <div className="report-list-header">
          <div>
            <strong>Associations</strong>
            <small>
              {associationGroups.length} association
              {associationGroups.length === 1 ? "" : "s"} ·{" "}
              {filteredRequests.length} request
              {filteredRequests.length === 1 ? "" : "s"}
            </small>
          </div>
        </div>

        {associationGroups.length === 0 ? (
          <div className="empty-state">
            No associations or requests match your search or filters.
          </div>
        ) : (
          <div className="report-request-items">
            {associationGroups.map((group) => {
              const approvedCount = group.requests.filter(
                (request) => getRequestStatus(request) === "Approved"
              ).length;

              const pendingCount = group.requests.filter((request) =>
                ["Submitted", "Under Review"].includes(
                  getRequestStatus(request)
                )
              ).length;

              return (
                <button
                  type="button"
                  key={group.association}
                  className="report-request-item report-request-clickable"
                  onClick={() =>
                    setSelectedAssociation(group.association)
                  }
                >
                  <div className="report-request-main">
                    <span className="request-id">
                      {group.requests.length} request
                      {group.requests.length === 1 ? "" : "s"}
                    </span>

                    <strong>{group.association}</strong>

                    <span className="report-request-type">
                      {pendingCount} pending · {approvedCount} approved
                    </span>

                    <small>
                      Latest submission:{" "}
                      {formatRequestDate(group.requests[0])}
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
          onClick={closeAssociationModal}
        >
          <div
            className="modal card report-details-modal association-requests-modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="association-requests-title"
          >
            <div className="modal-header report-details-header">
              <div>
                <span className="eyebrow">ASSOCIATION REQUESTS</span>
                <h2 id="association-requests-title">
                  {selectedAssociation}
                </h2>
                <p>
                  {selectedAssociationRequests.length} request
                  {selectedAssociationRequests.length === 1 ? "" : "s"} found
                </p>
              </div>

              <button
                type="button"
                className="text-btn"
                onClick={closeAssociationModal}
              >
                Close
              </button>
            </div>

            {selectedAssociationRequests.length === 0 ? (
              <div className="empty-state">
                No requests found for this association with the current
                filters.
              </div>
            ) : (
              <div className="report-request-items association-request-list">
                {selectedAssociationRequests.map((request) => (
                  <button
                    type="button"
                    key={request.id}
                    className="report-request-item report-request-clickable"
                    onClick={() => {
                      setSelectedAssociation(null);
                      setSelectedId(request.id);
                    }}
                  >
                    <div className="report-request-main">
                      <span className="request-id">
                        {request.referenceNumber || request.id}
                      </span>

                      <strong>{getRequestType(request)}</strong>

                      <small>
                        Date Submitted: {formatRequestDate(request)}
                      </small>
                    </div>

                    <div className="report-request-side">
                      <span
                        className={`status ${getStatusClass(
                          getRequestStatus(request)
                        )}`}
                      >
                        {getRequestStatus(request)}
                      </span>

                      <span className="report-view-details">
                        View Details →
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {selectedRequest && (
        <div
          className="modal-backdrop report-details-backdrop"
          onClick={closeRequestModal}
        >
          <div
            className="modal card report-details-modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="request-details-title"
          >
            <div className="modal-header report-details-header">
              <div>
                <span className="eyebrow">REQUEST DETAILS</span>
                <h2 id="request-details-title">
                  {selectedRequest.referenceNumber || selectedRequest.id}
                </h2>
                <p>{getAssociationName(selectedRequest)}</p>
              </div>

              <button
                type="button"
                className="text-btn"
                onClick={closeRequestModal}
              >
                Close
              </button>
            </div>

            <div className="report-details-status-row">
              <span
                className={`status ${getStatusClass(
                  getRequestStatus(selectedRequest)
                )}`}
              >
                {getRequestStatus(selectedRequest)}
              </span>

              <span>
                Date Submitted: {formatRequestDateTime(selectedRequest)}
              </span>
            </div>

            <div className="report-section">
              <h3>Request Information</h3>

              <div className="report-detail-grid">
                <ReportField
                  label="Reference Number"
                  value={
                    selectedRequest.referenceNumber || selectedRequest.id
                  }
                />

                <ReportField
                  label="Type of Request"
                  value={getRequestType(selectedRequest)}
                />

                <ReportField
                  label="Association"
                  value={getAssociationName(selectedRequest)}
                />

                <ReportField
                  label="Status"
                  value={getRequestStatus(selectedRequest)}
                />

                <ReportField
                  label="Date Submitted"
                  value={formatRequestDateTime(selectedRequest)}
                />

                <ReportField
                  label="Barangay"
                  value={
                    selectedRequest.barangay ||
                    selectedClient?.barangay ||
                    "Not available"
                  }
                />

                <ReportField
                  label="Contact Person"
                  value={
                    selectedRequest.contactPerson ||
                    selectedClient?.name ||
                    "Not available"
                  }
                />

                <ReportField
                  label="Item / Project"
                  value={
                    selectedRequest.item ||
                    selectedRequest.project ||
                    "Not specified"
                  }
                />
              </div>
            </div>

            <div className="report-section">
              <h3>Client Information</h3>

              <div className="report-detail-grid">
                <ReportField
                  label="Full Name"
                  value={selectedClient?.name || "Not available"}
                />

                <ReportField
                  label="Email"
                  value={selectedClient?.email || "Not available"}
                />

                <ReportField
                  label="Contact Number"
                  value={
                    selectedClient?.contactNumber ||
                    selectedClient?.phone ||
                    "Not available"
                  }
                />

                <ReportField
                  label="Barangay"
                  value={selectedClient?.barangay || "Not available"}
                />

                <ReportField
                  label="Association"
                  value={
                    selectedClient?.association ||
                    selectedRequest.association ||
                    "Not available"
                  }
                />
              </div>
            </div>

            <div className="report-section">
              <h3>Request Details</h3>

              <div className="request-report-text report-popup-description">
                {selectedRequest.details ||
                  selectedRequest.justification ||
                  "No request details provided."}
              </div>
            </div>

            {selectedRequest.notes && (
              <div className="report-section">
                <h3>Engineer Notes</h3>

                <div className="request-report-text report-popup-description">
                  {selectedRequest.notes}
                </div>
              </div>
            )}

            {selectedRequest.engineerRemarks && (
              <div className="report-section">
                <h3>Engineer Remarks</h3>

                <div className="request-report-text report-popup-description">
                  {selectedRequest.engineerRemarks}
                </div>
              </div>
            )}

            {selectedRequest.justification &&
              selectedRequest.details && (
                <div className="report-section">
                  <h3>Justification</h3>

                  <div className="request-report-text report-popup-description">
                    {selectedRequest.justification}
                  </div>
                </div>
              )}
          </div>
        </div>
      )}
    </div>
  );
}
