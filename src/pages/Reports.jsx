import { useMemo, useState } from "react";
import { useRequests } from "../context/RequestContext";
import { useAppointments } from "../context/AppointmentContext";
import { useAuth } from "../context/AuthContext";

const statuses = [
  "All",
  "Submitted",
  "Under Review",
  "Documents Pending",
  "Approved",
];

function escapeCsv(value) {
  return `"${String(
    value ?? ""
  ).replaceAll('"', '""')}"`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll(
      "'",
      "&#039;"
    );
}

function getRequestDate(request) {
  const value =
    request.createdAtTimestamp?.toDate
      ? request.createdAtTimestamp.toDate()
      : request.createdAt ||
        request.date;

  if (!value) {
    return "";
  }

  const date =
    value instanceof Date
      ? value
      : new Date(value);

  return Number.isNaN(
    date.getTime()
  )
    ? String(value).slice(
        0,
        10
      )
    : date
        .toISOString()
        .slice(0, 10);
}

function isImage(document) {
  return String(
    document?.contentType || ""
  ).startsWith(
    "image/"
  );
}

function isPdf(document) {
  return (
    document?.contentType ===
    "application/pdf"
  );
}

function formatFileSize(size) {
  if (!size) {
    return "";
  }

  const kb =
    size / 1024;

  if (kb < 1024) {
    return `${kb.toFixed(
      0
    )} KB`;
  }

  return `${(
    kb / 1024
  ).toFixed(2)} MB`;
}

function getDocumentHtml(document) {
  const fileName =
    escapeHtml(
      document.fileName ||
        "Uploaded document"
    );

  const fileSize =
    escapeHtml(
      formatFileSize(
        document.fileSize
      )
    );

  const data =
    document.data || "";

  if (!data) {
    return `
      <div class="attachment-file">
        <div class="attachment-icon">FILE</div>
        <div>
          <strong>${fileName}</strong>
          <span>${fileSize}</span>
          <small>File content is not available.</small>
        </div>
      </div>
    `;
  }

  if (isImage(document)) {
    return `
      <div class="attachment-card">
        <div class="attachment-header">
          <div>
            <strong>${fileName}</strong>
            <span>${fileSize}</span>
          </div>
          <span class="attachment-type">IMAGE</span>
        </div>
        <div class="attachment-image-wrap">
          <img src="${data}" alt="${fileName}" />
        </div>
      </div>
    `;
  }

  if (isPdf(document)) {
    return `
      <div class="attachment-card pdf-card">
        <div class="attachment-header">
          <div>
            <strong>${fileName}</strong>
            <span>${fileSize}</span>
          </div>
          <span class="attachment-type">PDF</span>
        </div>
        <iframe src="${data}" title="${fileName}"></iframe>
      </div>
    `;
  }

  return `
    <div class="attachment-file">
      <div class="attachment-icon">FILE</div>
      <div>
        <strong>${fileName}</strong>
        <span>${fileSize}</span>
        <small>${escapeHtml(
          document.contentType ||
            "Document"
        )}</small>
      </div>
    </div>
  `;
}

export default function Reports() {
  const {
    requests,
    documents,
  } = useRequests();

  const {
    appointments,
  } = useAppointments();

  const { users } =
    useAuth();

  const [status, setStatus] =
    useState("All");

  const [from, setFrom] =
    useState("");

  const [to, setTo] =
    useState("");

  const [
    selectedRequest,
    setSelectedRequest,
  ] = useState(null);

  const filtered =
    useMemo(
      () =>
        requests
          .filter(
            (request) =>
              request.status !==
              "Rejected"
          )
          .filter(
            (request) => {
              const requestDate =
                getRequestDate(
                  request
                );

              return (
                (status ===
                  "All" ||
                  request.status ===
                    status) &&
                (!from ||
                  requestDate >=
                    from) &&
                (!to ||
                  requestDate <=
                    to)
              );
            }
          )
          .sort((a, b) =>
            String(
              a.association ||
                ""
            ).localeCompare(
              String(
                b.association ||
                  ""
              )
            )
          ),
      [
        requests,
        status,
        from,
        to,
      ]
    );

  const getClient =
    (id) =>
      users.find(
        (user) =>
          user.id === id
      );

  const getRequestDocuments =
    (requestId) =>
      documents.filter(
        (document) =>
          document.requestId ===
          requestId
      );

  const approved =
    filtered.filter(
      (request) =>
        request.status ===
        "Approved"
    ).length;

  const pending =
    filtered.filter(
      (request) =>
        ![
          "Approved",
        ].includes(
          request.status
        )
    ).length;

  const printReport = () => {
    const rows =
      filtered
        .map(
          (request) => {
            const client =
              getClient(
                request.clientId
              );

            const requestDocuments =
              getRequestDocuments(
                request.id
              );

            return `
              <div class="request-report">
                <div class="request-header">
                  <div>
                    <h2>${escapeHtml(
                      request.association ||
                        "Service Request"
                    )}</h2>

                    <p>
                      Client:
                      ${escapeHtml(
                        client?.name ||
                          "Unknown"
                      )}
                    </p>
                  </div>

                  <div class="status-box">
                    ${escapeHtml(
                      request.status ||
                        ""
                    )}
                  </div>
                </div>

                <div class="request-details">
                  <div>
                    <span>Reference</span>
                    <strong>${escapeHtml(
                      request.referenceNumber ||
                        request.id
                    )}</strong>
                  </div>

                  <div>
                    <span>Client Name</span>
                    <strong>${escapeHtml(
                      client?.name ||
                        "Unknown"
                    )}</strong>
                  </div>

                  <div>
                    <span>Email Address</span>
                    <strong>${escapeHtml(
                      client?.email ||
                        "Not provided"
                    )}</strong>
                  </div>

                  <div>
                    <span>Contact Number</span>
                    <strong>${escapeHtml(
                      client?.contactNumber ||
                        "Not provided"
                    )}</strong>
                  </div>

                  <div>
                    <span>Association</span>
                    <strong>${escapeHtml(
                      request.association ||
                        ""
                    )}</strong>
                  </div>

                  <div>
                    <span>Date Submitted</span>
                    <strong>${escapeHtml(
                      getRequestDate(
                        request
                      )
                    )}</strong>
                  </div>
                </div>

                <div class="request-description">
                  <h3>Request Details</h3>
                  <p>${escapeHtml(
                    request.details ||
                      "No request details provided."
                  )}</p>
                </div>

                <div class="request-attachments">
                  <h3>Client Documents and Images</h3>

                  ${
                    requestDocuments.length >
                    0
                      ? requestDocuments
                          .map(
                            getDocumentHtml
                          )
                          .join("")
                      : `
                        <div class="no-attachments">
                          No documents or images were uploaded for this request.
                        </div>
                      `
                  }
                </div>
              </div>
            `;
          }
        )
        .join("");

    const reportWindow =
      window.open(
        "",
        "_blank",
        "width=1200,height=900"
      );

    if (!reportWindow) {
      alert(
        "The report window was blocked by your browser. Please allow pop-ups for AGRIhelp."
      );
      return;
    }

    reportWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>AGRIhelp Request Report</title>

          <style>
            * {
              box-sizing: border-box;
            }

            body {
              margin: 0;
              padding: 32px;
              font-family: Arial, sans-serif;
              color: #17231a;
              background: #ffffff;
            }

            .report-container {
              max-width: 1100px;
              margin: 0 auto;
            }

            .report-title {
              margin-bottom: 4px;
              color: #0c2b1b;
              font-size: 28px;
            }

            .report-meta {
              color: #68756b;
              font-size: 12px;
              line-height: 1.6;
            }

            .summary {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 14px;
              margin: 26px 0 30px;
            }

            .summary-card {
              padding: 16px;
              border: 1px solid #dbe4dc;
              border-radius: 10px;
              background: #f7faf7;
            }

            .summary-card span {
              display: block;
              margin-bottom: 7px;
              color: #68756b;
              font-size: 11px;
              font-weight: 700;
              text-transform: uppercase;
            }

            .summary-card strong {
              color: #0c2b1b;
              font-size: 24px;
            }

            .request-report {
              margin-bottom: 35px;
              padding: 25px;
              border: 1px solid #d6dfd8;
              border-radius: 12px;
              page-break-inside: avoid;
            }

            .request-header {
              display: flex;
              align-items: flex-start;
              justify-content: space-between;
              gap: 20px;
              margin-bottom: 22px;
              padding-bottom: 18px;
              border-bottom: 2px solid #e6b91e;
            }

            .request-header h2 {
              margin: 0 0 6px;
              color: #0c2b1b;
              font-size: 20px;
            }

            .request-header p {
              margin: 0;
              color: #68756b;
              font-size: 12px;
            }

            .status-box {
              padding: 7px 12px;
              border-radius: 6px;
              background: #fff5c7;
              color: #6c5600;
              font-size: 10px;
              font-weight: 800;
            }

            .request-details {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 12px;
              margin-bottom: 25px;
            }

            .request-details div {
              padding: 13px;
              border: 1px solid #e1e7e2;
              border-radius: 7px;
              background: #fafcfa;
            }

            .request-details span {
              display: block;
              margin-bottom: 5px;
              color: #68756b;
              font-size: 10px;
              font-weight: 700;
              text-transform: uppercase;
            }

            .request-details strong {
              color: #17231a;
              font-size: 12px;
            }

            .request-description {
              margin-bottom: 28px;
              padding: 17px;
              border-left: 4px solid #e6b91e;
              background: #fffdf1;
            }

            .request-description h3,
            .request-attachments h3 {
              margin: 0 0 10px;
              color: #0c2b1b;
              font-size: 14px;
            }

            .request-description p {
              margin: 0;
              color: #303a33;
              font-size: 12px;
              line-height: 1.7;
              white-space: pre-wrap;
            }

            .attachment-card {
              margin-top: 14px;
              padding: 14px;
              border: 1px solid #dbe4dc;
              border-radius: 9px;
              background: #ffffff;
              page-break-inside: avoid;
            }

            .attachment-header {
              display: flex;
              justify-content: space-between;
              gap: 12px;
              margin-bottom: 12px;
            }

            .attachment-header strong {
              display: block;
              font-size: 12px;
            }

            .attachment-header span {
              display: block;
              margin-top: 4px;
              color: #68756b;
              font-size: 10px;
            }

            .attachment-type {
              padding: 4px 7px;
              border-radius: 4px;
              background: #0c2b1b;
              color: #ffffff !important;
            }

            .attachment-image-wrap {
              width: 100%;
              padding: 10px;
              text-align: center;
              background: #f5f8f5;
            }

            .attachment-image-wrap img {
              display: block;
              max-width: 100%;
              max-height: 650px;
              margin: 0 auto;
            }

            .pdf-card iframe {
              display: block;
              width: 100%;
              height: 750px;
              border: 1px solid #dbe4dc;
            }

            .attachment-file {
              display: flex;
              align-items: center;
              gap: 12px;
              margin-top: 10px;
              padding: 13px;
              border: 1px solid #dbe4dc;
              border-radius: 8px;
              background: #f7faf7;
            }

            .attachment-icon {
              display: flex;
              align-items: center;
              justify-content: center;
              width: 42px;
              height: 42px;
              border-radius: 7px;
              background: #e6b91e;
              font-size: 9px;
              font-weight: 900;
            }

            .attachment-file strong {
              display: block;
              font-size: 12px;
            }

            .attachment-file span,
            .attachment-file small {
              display: block;
              margin-top: 3px;
              color: #68756b;
              font-size: 10px;
            }

            .no-attachments {
              padding: 18px;
              border: 1px dashed #cbd6cd;
              border-radius: 8px;
              background: #f7faf7;
              color: #68756b;
              font-size: 11px;
            }

            @media print {
              .request-report {
                page-break-inside: auto;
              }

              .attachment-card,
              .attachment-file,
              .request-details div {
                break-inside: avoid;
              }
            }
          </style>
        </head>

        <body>
          <div class="report-container">
            <h1 class="report-title">
              AGRIhelp Request Report
            </h1>

            <p class="report-meta">
              Municipal Agricultural and Biosystems Engineering Office
            </p>

            <p class="report-meta">
              Generated:
              ${escapeHtml(
                new Date().toLocaleString()
              )}
            </p>

            <p class="report-meta">
              Rejected applications are excluded from this report.
            </p>

            <div class="summary">
              <div class="summary-card">
                <span>Total Requests</span>
                <strong>${filtered.length}</strong>
              </div>

              <div class="summary-card">
                <span>Pending</span>
                <strong>${pending}</strong>
              </div>

              <div class="summary-card">
                <span>Approved</span>
                <strong>${approved}</strong>
              </div>
            </div>

            ${
              rows ||
              `
                <div class="no-attachments">
                  No requests match the selected filters.
                </div>
              `
            }
          </div>

          <script>
            window.onload = function () {
              setTimeout(function () {
                window.print();
              }, 500);
            };
          </script>
        </body>
      </html>
    `);

    reportWindow.document.close();
  };

  const exportCsv = () => {
    const header = [
      "Reference",
      "Client",
      "Email",
      "Association",
      "Request",
      "Status",
      "Date Submitted",
      "Documents",
    ];

    const rows =
      filtered.map(
        (request) => {
          const client =
            getClient(
              request.clientId
            );

          const requestDocuments =
            getRequestDocuments(
              request.id
            );

          return [
            request.referenceNumber ||
              request.id,
            client?.name ||
              "Unknown",
            client?.email || "",
            request.association ||
              "",
            request.details ||
              "",
            request.status ||
              "",
            getRequestDate(
              request
            ),
            requestDocuments
              .map(
                (document) =>
                  document.fileName
              )
              .join("; "),
          ];
        }
      );

    const csv =
      [
        header,
        ...rows,
      ]
        .map((row) =>
          row
            .map(
              escapeCsv
            )
            .join(",")
        )
        .join("\n");

    const url =
      URL.createObjectURL(
        new Blob(
          [csv],
          {
            type: "text/csv;charset=utf-8",
          }
        )
      );

    const link =
      document.createElement(
        "a"
      );

    link.href = url;

    link.download =
      `AGRIhelp-request-report-${new Date()
        .toISOString()
        .slice(0, 10)}.csv`;

    document.body.appendChild(
      link
    );

    link.click();

    document.body.removeChild(
      link
    );

    URL.revokeObjectURL(
      url
    );
  };

  return (
    <div className="container page-container">
      <div className="page-header">
        <div>
          <span className="eyebrow">
            ENGINEER REPORTS
          </span>

          <h1>
            Report generation
          </h1>

          <p>
            Generate reports from valid submitted
            applications and their supporting documents.
          </p>
        </div>

        <div className="report-actions">
          <button
            type="button"
            className="secondary-btn"
            onClick={
              exportCsv
            }
          >
            Export CSV
          </button>

          <button
            type="button"
            className="primary-btn"
            onClick={
              printReport
            }
          >
            Generate Report
          </button>
        </div>
      </div>

      <section className="card report-filters">
        <div className="field">
          <label>
            Status
          </label>

          <select
            value={status}
            onChange={(event) =>
              setStatus(
                event.target
                  .value
              )
            }
          >
            {statuses.map(
              (item) => (
                <option
                  key={item}
                  value={item}
                >
                  {item}
                </option>
              )
            )}
          </select>
        </div>

        <div className="field">
          <label>
            From date
          </label>

          <input
            type="date"
            value={from}
            onChange={(event) =>
              setFrom(
                event.target
                  .value
              )
            }
          />
        </div>

        <div className="field">
          <label>
            To date
          </label>

          <input
            type="date"
            value={to}
            onChange={(event) =>
              setTo(
                event.target
                  .value
              )
            }
          />
        </div>
      </section>

      <div className="stats-grid report-stats">
        <div className="stat-card">
          <span>
            Total requests
          </span>

          <strong>
            {filtered.length}
          </strong>
        </div>

        <div className="stat-card">
          <span>
            Pending
          </span>

          <strong>
            {pending}
          </strong>
        </div>

        <div className="stat-card">
          <span>
            Approved
          </span>

          <strong>
            {approved}
          </strong>
        </div>
      </div>

      <section className="table-card report-preview-card">
        <div className="section-title report-preview-heading">
          <div>
            <h3>
              Submitted Requests
            </h3>

            <p>
              {filtered.length} request(s)
              match the selected filters.
            </p>
          </div>

          <div className="report-preview-info">
            {filtered.reduce(
              (
                total,
                request
              ) =>
                total +
                getRequestDocuments(
                  request.id
                ).length,
              0
            )}{" "}
            attachment(s)
          </div>
        </div>

        <div className="report-preview-list">
          {filtered.map(
            (request) => {
              const client =
                getClient(
                  request.clientId
                );

              const requestDocuments =
                getRequestDocuments(
                  request.id
                );

              return (
                <article
                  className="report-preview-request"
                  key={
                    request.id
                  }
                >
                  <div className="report-preview-request-header">
                    <div>
                      <span className="report-reference">
                        {request.referenceNumber ||
                          request.id}
                      </span>

                      <h3>
                        {request.association ||
                          "Service Request"}
                      </h3>
                    </div>

                    <span
                      className={`status ${String(
                        request.status
                      )
                        .toLowerCase()
                        .replaceAll(
                          " ",
                          "-"
                        )}`}
                    >
                      {
                        request.status
                      }
                    </span>
                  </div>

                  <div className="report-preview-client">
                    <div>
                      <span>
                        Client
                      </span>

                      <strong>
                        {client?.name ||
                          "Unknown"}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Association
                      </span>

                      <strong>
                        {request.association ||
                          "Not provided"}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Date Submitted
                      </span>

                      <strong>
                        {getRequestDate(
                          request
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Documents
                      </span>

                      <strong>
                        {
                          requestDocuments.length
                        }{" "}
                        file(s)
                      </strong>
                    </div>
                  </div>

                  <div className="report-request-actions">
                    <button
                      type="button"
                      className="secondary-btn small"
                      onClick={() =>
                        setSelectedRequest(
                          request
                        )
                      }
                    >
                      View Details
                    </button>
                  </div>
                </article>
              );
            }
          )}

          {filtered.length ===
            0 && (
            <div className="empty-state">
              No requests match the
              selected filters.
            </div>
          )}
        </div>
      </section>

      <section className="card report-appointment-note">
        <h3>
          Appointment records
        </h3>

        <p>
          {appointments.length} appointment
          record(s) are currently available
          in the system. Appointment details remain
          available in the Appointments and Calendar
          modules.
        </p>
      </section>

      {selectedRequest && (
        <div
          className="modal-backdrop report-details-backdrop"
          onClick={() =>
            setSelectedRequest(
              null
            )
          }
        >
          <div
            className="modal card report-details-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="modal-header">
              <div>
                <span className="report-reference">
                  {selectedRequest.referenceNumber ||
                    selectedRequest.id}
                </span>

                <h2>
                  {selectedRequest.association ||
                    "Service Request"}
                </h2>
              </div>

              <button
                type="button"
                className="text-btn"
                onClick={() =>
                  setSelectedRequest(
                    null
                  )
                }
              >
                Close
              </button>
            </div>

            <div className="report-detail-grid">
              <div>
                <span>
                  Client
                </span>

                <strong>
                  {getClient(
                    selectedRequest.clientId
                  )?.name ||
                    "Unknown"}
                </strong>
              </div>

              <div>
                <span>
                  Email
                </span>

                <strong>
                  {getClient(
                    selectedRequest.clientId
                  )?.email ||
                    "Not provided"}
                </strong>
              </div>

              <div>
                <span>
                  Contact
                </span>

                <strong>
                  {getClient(
                    selectedRequest.clientId
                  )?.contactNumber ||
                    "Not provided"}
                </strong>
              </div>

              <div>
                <span>
                  Date Submitted
                </span>

                <strong>
                  {getRequestDate(
                    selectedRequest
                  )}
                </strong>
              </div>
            </div>

            <div className="report-detail-description">
              <span>
                Request Details
              </span>

              <p>
                {selectedRequest.details ||
                  "No request details provided."}
              </p>
            </div>

            <div className="report-detail-documents">
              <div className="report-detail-documents-header">
                <strong>
                  Attached Documents
                </strong>

                <span>
                  {
                    getRequestDocuments(
                      selectedRequest.id
                    ).length
                  }{" "}
                  file(s)
                </span>
              </div>

              {getRequestDocuments(
                selectedRequest.id
              ).length > 0 ? (
                getRequestDocuments(
                  selectedRequest.id
                ).map(
                  (document) => (
                    <div
                      className="report-detail-file"
                      key={
                        document.id
                      }
                    >
                      <div className="report-detail-file-icon">
                        {isImage(
                          document
                        )
                          ? "IMG"
                          : isPdf(
                              document
                            )
                          ? "PDF"
                          : "FILE"}
                      </div>

                      <div>
                        <strong>
                          {document.fileName ||
                            "Uploaded document"}
                        </strong>

                        <span>
                          {formatFileSize(
                            document.fileSize
                          )}
                        </span>
                      </div>
                    </div>
                  )
                )
              ) : (
                <p className="muted">
                  No documents attached.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}