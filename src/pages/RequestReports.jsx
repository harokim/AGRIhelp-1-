import { useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useRequests } from "../context/RequestContext";
import { formatDate } from "../utils";

export default function RequestReports() {
  const { user, users } = useAuth();
  const { requests } = useRequests();

  const [selectedId, setSelectedId] =
    useState(null);

  const [search, setSearch] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("All");

  const filteredRequests = useMemo(() => {
    const value =
      search.trim().toLowerCase();

    return requests
      .filter((request) => {
        if (
          statusFilter !== "All" &&
          request.status !== statusFilter
        ) {
          return false;
        }

        if (!value) {
          return true;
        }

        return `${request.referenceNumber || ""} ${
          request.association || ""
        } ${request.requestType || ""} ${
          request.details || ""
        } ${request.clientId || ""}`
          .toLowerCase()
          .includes(value);
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
    search,
    statusFilter
  ]);

  const selectedRequest =
    requests.find(
      (request) =>
        request.id === selectedId
    ) || null;

  const selectedClient =
    users.find(
      (item) =>
        item.id ===
        selectedRequest?.clientId
    ) || null;

  const statusList = [
    "All",
    "Submitted",
    "Under Review",
    "Documents Pending",
    "Approved",
    "Rejected",
    "Scheduled for Validation"
  ];

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
        <span className="eyebrow">
          ENGINEER REPORTS
        </span>

        <h1>Request Reports</h1>

        <p>
          Review submitted client requests and
          their related information.
        </p>
      </div>

      <div className="request-report-toolbar card">
        <input
          className="search-input"
          value={search}
          onChange={(event) =>
            setSearch(event.target.value)
          }
          placeholder="Search request..."
        />

        <select
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(
              event.target.value
            )
          }
          className="report-filter"
        >
          {statusList.map((status) => (
            <option
              key={status}
              value={status}
            >
              {status}
            </option>
          ))}
        </select>
      </div>

      <section className="request-report-list card">
        <div className="report-list-header">
          <div>
            <strong>
              Submitted Requests
            </strong>

            <small>
              {filteredRequests.length} request
              {filteredRequests.length === 1
                ? ""
                : "s"}
            </small>
          </div>
        </div>

        {filteredRequests.length === 0 ? (
          <div className="empty-state">
            No requests found.
          </div>
        ) : (
          <div className="report-request-items">
            {filteredRequests.map(
              (request) => (
                <button
                  type="button"
                  key={request.id}
                  className="report-request-item report-request-clickable"
                  onClick={() =>
                    setSelectedId(
                      request.id
                    )
                  }
                >
                  <div className="report-request-main">
                    <span className="request-id">
                      {request.referenceNumber ||
                        request.id}
                    </span>

                    <strong>
                      {request.association ||
                        "No association"}
                    </strong>

                    <span className="report-request-type">
                      {request.requestType ||
                        "Type not specified"}
                    </span>

                    <small>
                      Date Submitted:{" "}
                      {formatDate(
                        request.createdAt
                      ) ||
                        "Not available"}
                    </small>
                  </div>

                  <div className="report-request-side">
                    <span
                      className={`status ${String(
                        request.status ||
                          "Submitted"
                      )
                        .toLowerCase()
                        .replaceAll(
                          " ",
                          "-"
                        )}`}
                    >
                      {request.status ||
                        "Submitted"}
                    </span>

                    <span className="report-view-details">
                      View Details →
                    </span>
                  </div>
                </button>
              )
            )}
          </div>
        )}
      </section>

      {selectedRequest && (
        <div
          className="modal-backdrop report-details-backdrop"
          onClick={() =>
            setSelectedId(null)
          }
        >
          <div
            className="modal card report-details-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="modal-header report-details-header">
              <div>
                <span className="eyebrow">
                  REQUEST DETAILS
                </span>

                <h2>
                  {selectedRequest.referenceNumber ||
                    selectedRequest.id}
                </h2>
              </div>

              <button
                type="button"
                className="text-btn"
                onClick={() =>
                  setSelectedId(null)
                }
              >
                Close
              </button>
            </div>

            <div className="report-details-status-row">
              <span
                className={`status ${String(
                  selectedRequest.status ||
                    "Submitted"
                )
                  .toLowerCase()
                  .replaceAll(
                    " ",
                    "-"
                  )}`}
              >
                {selectedRequest.status ||
                  "Submitted"}
              </span>

              <span>
                Date Submitted:{" "}
                {formatDate(
                  selectedRequest.createdAt
                ) || "Not available"}
              </span>
            </div>

            <div className="report-section">
              <h3>
                Request Information
              </h3>

              <div className="report-detail-grid">
                <ReportField
                  label="Reference Number"
                  value={
                    selectedRequest.referenceNumber ||
                    selectedRequest.id
                  }
                />

                <ReportField
                  label="Type of Request"
                  value={
                    selectedRequest.requestType ||
                    "Not specified"
                  }
                />

                <ReportField
                  label="Association"
                  value={
                    selectedRequest.association ||
                    "Not provided"
                  }
                />

                <ReportField
                  label="Status"
                  value={
                    selectedRequest.status ||
                    "Submitted"
                  }
                />

                <ReportField
                  label="Date Submitted"
                  value={
                    formatDate(
                      selectedRequest.createdAt
                    ) || "Not available"
                  }
                />
              </div>
            </div>

            <div className="report-section">
              <h3>
                Client Information
              </h3>

              <div className="report-detail-grid">
                <ReportField
                  label="Full Name"
                  value={
                    selectedClient?.name ||
                    "Not available"
                  }
                />

                <ReportField
                  label="Email"
                  value={
                    selectedClient?.email ||
                    "Not available"
                  }
                />

                <ReportField
                  label="Contact Number"
                  value={
                    selectedClient?.contactNumber ||
                    "Not available"
                  }
                />

                <ReportField
                  label="Barangay"
                  value={
                    selectedClient?.barangay ||
                    "Not available"
                  }
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
              <h3>
                Request Details
              </h3>

              <div className="request-report-text report-popup-description">
                {selectedRequest.details ||
                  "No request details provided."}
              </div>
            </div>

            {selectedRequest.notes && (
              <div className="report-section">
                <h3>
                  Engineer Notes
                </h3>

                <div className="request-report-text report-popup-description">
                  {selectedRequest.notes}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ReportField({
  label,
  value
}) {
  return (
    <div className="report-field">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}