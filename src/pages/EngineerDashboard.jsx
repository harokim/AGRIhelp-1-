
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useRequests } from "../context/RequestContext";
import { useAppointments } from "../context/AppointmentContext";
import { useMessages } from "../context/MessageContext";

function getRequestDate(request) {
  const value = request.createdAt || request.createdAtTimestamp;

  if (value?.toDate) return value.toDate();
  if (typeof value?.seconds === "number") return new Date(value.seconds * 1000);

  const date = new Date(value || "");
  return Number.isNaN(date.getTime()) ? null : date;
}

function getAssociationData(items, getDate, year, month) {
  const counts = {};

  items.forEach((item) => {
    const date = getDate(item);

    if (!date || date.getFullYear() !== year || date.getMonth() !== month) {
      return;
    }

    const association = item.association || "Unknown Association";
    counts[association] = (counts[association] || 0) + 1;
  });

  return Object.entries(counts).sort((a, b) => b[1] - a[1]);
}

function AssociationDiagram({ data, emptyText }) {
  const maximum = data.length ? Math.max(...data.map(([, count]) => count)) : 0;

  if (!data.length) {
    return <div className="diagram-empty">{emptyText}</div>;
  }

  return (
    <div className="association-diagram">
      {data.map(([association, count]) => (
        <div className="association-bar-row" key={association}>
          <div className="association-bar-label">
            <span>{association}</span>
            <strong>{count}</strong>
          </div>
          <div className="association-bar-track">
            <div
              className="association-bar-fill"
              style={{ width: `${Math.max(8, (count / maximum) * 100)}%` }}
            />
          </div>
        </div>
      ))}
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
      <span className="dashboard-stat-icon" aria-hidden="true">{icon}</span>
      <span className="dashboard-stat-content">
        <span>{title}</span>
        <strong>{count}</strong>
      </span>
      <span className="dashboard-stat-arrow" aria-hidden="true">→</span>
    </button>
  );
}

export default function EngineerDashboard() {
  const { requests } = useRequests();
  const { appointments } = useAppointments();
  const { unreadMessageCount } = useMessages();
  const navigate = useNavigate();

  const current = new Date();
  const [selectedMonth, setSelectedMonth] = useState(current.getMonth());
  const [selectedYear, setSelectedYear] = useState(current.getFullYear());

  const pending = useMemo(
    () => requests.filter((request) => ["Submitted", "Under Review"].includes(request.status)),
    [requests]
  );

  const reviewData = useMemo(
    () => getAssociationData(pending, getRequestDate, selectedYear, selectedMonth),
    [pending, selectedYear, selectedMonth]
  );

  const appointmentData = useMemo(
    () => getAssociationData(
      appointments,
      (appointment) => {
        if (!appointment.date) return null;
        const date = new Date(`${appointment.date}T00:00:00`);
        return Number.isNaN(date.getTime()) ? null : date;
      },
      selectedYear,
      selectedMonth
    ),
    [appointments, selectedYear, selectedMonth]
  );

  const years = useMemo(() => {
    const values = [
      ...requests.map((request) => getRequestDate(request)?.getFullYear()),
      ...appointments.map((appointment) => {
        if (!appointment.date) return null;
        const date = new Date(`${appointment.date}T00:00:00`);
        return Number.isNaN(date.getTime()) ? null : date.getFullYear();
      }),
      current.getFullYear()
    ].filter(Boolean);

    return [...new Set(values)].sort((a, b) => b - a);
  }, [requests, appointments, current.getFullYear()]);

  return (
    <div className="container page-container">
      <div className="page-header">
        <div>
          <span className="eyebrow">ENGINEER PORTAL</span>
          <h1>Engineer Dashboard</h1>
          <p>Review client requests, messages, appointments, and reports.</p>
        </div>
        <button type="button" className="primary-btn" onClick={() => navigate("/reports")}>
          Generate Report
        </button>
      </div>

      <div className="stats-grid engineer-stats">
        <SummaryCard
          className="total-stat"
          icon="▣"
          title="Total Requests"
          count={requests.length}
          onClick={() => navigate("/engineer-requests", { state: { statusFilter: "All" } })}
        />
        <SummaryCard
          className="pending-stat"
          icon="◷"
          title="Pending Requests"
          count={pending.length}
          onClick={() => navigate("/engineer-requests", { state: { statusFilter: "Pending" } })}
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
        <span>Diagram period</span>
        <select
          aria-label="Diagram month"
          value={selectedMonth}
          onChange={(event) => setSelectedMonth(Number(event.target.value))}
        >
          {[
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
          ].map((month, index) => (
            <option value={index} key={month}>{month}</option>
          ))}
        </select>
        <select
          aria-label="Diagram year"
          value={selectedYear}
          onChange={(event) => setSelectedYear(Number(event.target.value))}
        >
          {years.map((year) => (
            <option value={year} key={year}>{year}</option>
          ))}
        </select>
      </div>

      <div className="dashboard-diagram-grid">
        <section className="card dashboard-panel review-queue-panel">
          <div className="section-title">
            <div>
              <h3>Review Queue</h3>
              <p>Pending requests by association for the selected month.</p>
            </div>
            <span className="dashboard-panel-count">
              {reviewData.reduce((total, [, count]) => total + count, 0)}
            </span>
          </div>
          <AssociationDiagram data={reviewData} emptyText="No pending requests for this month." />
        </section>

        <section className="card dashboard-panel appointments-panel">
          <div className="section-title">
            <div>
              <h3>Appointments</h3>
              <p>Appointments by association for the selected month.</p>
            </div>
            <span className="dashboard-panel-count">
              {appointmentData.reduce((total, [, count]) => total + count, 0)}
            </span>
          </div>
          <AssociationDiagram data={appointmentData} emptyText="No appointments for this month." />
        </section>
      </div>
    </div>
  );
}
