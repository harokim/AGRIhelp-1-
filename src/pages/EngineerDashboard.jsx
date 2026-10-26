
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useRequests } from "../context/RequestContext";
import { useAppointments } from "../context/AppointmentContext";
import { useMessages } from "../context/MessageContext";

const CHART_COLORS = [
  "#26834a",
  "#e4bd32",
  "#4285c5",
  "#e87945",
  "#8b65bd",
  "#d65365",
  "#26a6a1",
  "#7c8c45",
  "#b47b50",
  "#64748b"
];

function getRequestDate(request) {
  const value = request.createdAt || request.createdAtTimestamp;

  if (value?.toDate) return value.toDate();
  if (typeof value?.seconds === "number") {
    return new Date(value.seconds * 1000);
  }

  const date = new Date(value || "");
  return Number.isNaN(date.getTime()) ? null : date;
}

function getAppointmentDate(appointment) {
  if (!appointment.date) return null;

  const date = new Date(`${appointment.date}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isInSelectedPeriod(date, year, month) {
  return (
    date &&
    date.getFullYear() === year &&
    date.getMonth() === month
  );
}

function getAssociationData(items, year, month) {
  const counts = {};

  items.forEach((item) => {
    if (!isInSelectedPeriod(getRequestDate(item), year, month)) {
      return;
    }

    const association = String(
      item.association || "Unknown Association"
    ).trim();

    counts[association] = (counts[association] || 0) + 1;
  });

  return Object.entries(counts).sort((a, b) => b[1] - a[1]);
}

function getRequestTypeData(items, year, month) {
  const counts = {};

  items.forEach((item) => {
    if (!isInSelectedPeriod(getRequestDate(item), year, month)) {
      return;
    }

    const type = String(
      item.requestType || "Unspecified"
    ).trim() || "Unspecified";

    counts[type] = (counts[type] || 0) + 1;
  });

  return Object.entries(counts).sort((a, b) => b[1] - a[1]);
}

function AssociationBarChart({ data, emptyText }) {
  const maximum = data.length
    ? Math.max(...data.map(([, count]) => count))
    : 0;

  if (!data.length) {
    return <div className="diagram-empty">{emptyText}</div>;
  }

  return (
    <div className="association-diagram">
      {data.map(([association, count], index) => (
        <div className="association-bar-row" key={association}>
          <div className="association-bar-label">
            <span title={association}>{association}</span>
            <strong>{count}</strong>
          </div>

          <div
            className="association-bar-track"
            role="img"
            aria-label={`${association}: ${count} pending requests`}
          >
            <div
              className="association-bar-fill"
              style={{
                width: `${Math.max(3, (count / maximum) * 100)}%`,
                background: CHART_COLORS[index % CHART_COLORS.length]
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function RequestTypePieChart({ data, emptyText }) {
  const total = data.reduce((sum, [, count]) => sum + count, 0);

  const segments = useMemo(() => {
    let currentAngle = 0;

    return data.map(([type, count], index) => {
      const percentage = total ? (count / total) * 100 : 0;
      const startAngle = currentAngle;
      currentAngle += percentage * 3.6;

      return {
        type,
        count,
        percentage,
        startAngle,
        endAngle: currentAngle,
        color: CHART_COLORS[index % CHART_COLORS.length]
      };
    });
  }, [data, total]);

  const gradient = segments.length
    ? `conic-gradient(${segments
        .map(
          (segment) =>
            `${segment.color} ${segment.startAngle}deg ${segment.endAngle}deg`
        )
        .join(", ")})`
    : "var(--border)";

  if (!total) {
    return <div className="diagram-empty">{emptyText}</div>;
  }

  return (
    <div className="request-type-chart">
      <div
        className="request-type-pie"
        style={{ background: gradient }}
        role="img"
        aria-label={`Pie chart showing ${total} requests distributed across ${data.length} request types`}
      >
        <div className="request-type-pie-center">
          <strong>{total}</strong>
          <span>Total Requests</span>
        </div>
      </div>

      <div className="request-type-legend">
        {segments.map((segment) => (
          <div className="request-type-legend-item" key={segment.type}>
            <span
              className="request-type-legend-color"
              style={{ backgroundColor: segment.color }}
              aria-hidden="true"
            />

            <span className="request-type-legend-name" title={segment.type}>
              {segment.type}
            </span>

            <strong>{segment.count}</strong>
            <span className="request-type-legend-percent">
              {segment.percentage.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SummaryCard({ className, icon, title, count, onClick }) {
  return (
    <button
      type="button"
      className={`stat-card dashboard-stat ${className} dashboard-stat-clickable`}
      onClick={onClick}
      aria-label={`${title}: ${count}. Open ${title}.`}
    >
      <span className="dashboard-stat-icon" aria-hidden="true">
        {icon}
      </span>

      <span className="dashboard-stat-content">
        <span>{title}</span>
        <strong>{count}</strong>
      </span>

      <span className="dashboard-stat-arrow" aria-hidden="true">
        →
      </span>
    </button>
  );
}

export default function EngineerDashboard() {
  const { requests } = useRequests();
  const { appointments } = useAppointments();
  const { unreadMessageCount } = useMessages();
  const navigate = useNavigate();

  const current = new Date();

  const [selectedMonth, setSelectedMonth] = useState(
    current.getMonth()
  );

  const [selectedYear, setSelectedYear] = useState(
    current.getFullYear()
  );

  const pending = useMemo(
    () =>
      requests.filter((request) =>
        ["Submitted", "Under Review"].includes(request.status)
      ),
    [requests]
  );

  const reviewData = useMemo(
    () =>
      getAssociationData(
        pending,
        selectedYear,
        selectedMonth
      ),
    [pending, selectedYear, selectedMonth]
  );

  const requestTypeData = useMemo(
    () =>
      getRequestTypeData(
        requests,
        selectedYear,
        selectedMonth
      ),
    [requests, selectedYear, selectedMonth]
  );

  const years = useMemo(() => {
    const values = [
      ...requests.map(
        (request) => getRequestDate(request)?.getFullYear()
      ),
      ...appointments.map(
        (appointment) =>
          getAppointmentDate(appointment)?.getFullYear()
      ),
      current.getFullYear()
    ].filter(Boolean);

    return [...new Set(values)].sort((a, b) => b - a);
  }, [requests, appointments, current.getFullYear()]);

  const pendingCount = reviewData.reduce(
    (total, [, count]) => total + count,
    0
  );

  const requestTypeTotal = requestTypeData.reduce(
    (total, [, count]) => total + count,
    0
  );

  return (
    <div className="container page-container">
      <div className="page-header">
        <div>
          <span className="eyebrow">ENGINEER PORTAL</span>
          <h1>Engineer Dashboard</h1>
          <p>
            Review client requests, messages, appointments, and reports.
          </p>
        </div>

        <button
          type="button"
          className="primary-btn"
          onClick={() => navigate("/reports")}
        >
          Generate Report
        </button>
      </div>

      <div className="stats-grid engineer-stats">
        <SummaryCard
          className="total-stat"
          icon="▣"
          title="Total Requests"
          count={requests.length}
          onClick={() =>
            navigate("/engineer-requests", {
              state: { statusFilter: "All" }
            })
          }
        />

        <SummaryCard
          className="pending-stat"
          icon="◷"
          title="Pending Requests"
          count={pending.length}
          onClick={() =>
            navigate("/engineer-requests", {
              state: { statusFilter: "Pending" }
            })
          }
        />

        <SummaryCard
          className="approved-stat"
          icon="✉"
          title="Messages"
          count={unreadMessageCount || 0}
          onClick={() => navigate("/engineer-messages")}
        />

        <SummaryCard
          className="appointment-stat"
          icon="▦"
          title="Appointments"
          count={appointments.length}
          onClick={() => navigate("/calendar")}
        />
      </div>

      <div className="dashboard-diagram-controls">
        <span>Chart period</span>

        <select
          aria-label="Chart month"
          value={selectedMonth}
          onChange={(event) =>
            setSelectedMonth(Number(event.target.value))
          }
        >
          {[
            "January",
            "February",
            "March",
            "April",
            "May",
            "June",
            "July",
            "August",
            "September",
            "October",
            "November",
            "December"
          ].map((month, index) => (
            <option value={index} key={month}>
              {month}
            </option>
          ))}
        </select>

        <select
          aria-label="Chart year"
          value={selectedYear}
          onChange={(event) =>
            setSelectedYear(Number(event.target.value))
          }
        >
          {years.map((year) => (
            <option value={year} key={year}>
              {year}
            </option>
          ))}
        </select>
      </div>

      <div className="dashboard-diagram-grid">
        <section className="card dashboard-panel review-queue-panel">
          <div className="section-title">
            <div>
              <h3>Review Queue by Association</h3>
              <p>
                Submitted and under-review requests for each association
                during the selected month.
              </p>
            </div>

            <span className="dashboard-panel-count">
              {pendingCount}
            </span>
          </div>

          <AssociationBarChart
            data={reviewData}
            emptyText="No pending requests for this month."
          />
        </section>

        <section className="card dashboard-panel request-types-panel">
          <div className="section-title">
            <div>
              <h3>Requests by Type</h3>
              <p>
                Distribution of submitted requests by type for the
                selected month.
              </p>
            </div>

            <span className="dashboard-panel-count">
              {requestTypeTotal}
            </span>
          </div>

          <RequestTypePieChart
            data={requestTypeData}
            emptyText="No requests for this month."
          />
        </section>
      </div>
    </div>
  );
}
