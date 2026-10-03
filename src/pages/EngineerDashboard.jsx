import { useRequests } from "../context/RequestContext";
import { useAppointments } from "../context/AppointmentContext";
import { useNavigate } from "react-router-dom";

export default function EngineerDashboard() {
  const { requests } = useRequests();
  const { appointments } = useAppointments();
  const navigate = useNavigate();

  const pending = requests.filter((request) =>
    ["Submitted", "Under Review"].includes(
      request.status
    )
  );

  const approved = requests.filter(
    (request) => request.status === "Approved"
  );

  return (
    <div className="container page-container">
      <div className="page-header">
        <div>
          <span className="eyebrow">
            ENGINEER PORTAL
          </span>

          <h1>Engineer dashboard</h1>

          <p>
            Review client requests, appointments, reports,
            and system activity.
          </p>
        </div>

        <button
          className="primary-btn"
          onClick={() => navigate("/reports")}
        >
          Generate Report
        </button>
      </div>

      <div className="stats-grid engineer-stats">
        <div className="stat-card dashboard-stat total-stat">
          <div className="dashboard-stat-icon">▣</div>

          <div>
            <span>Total requests</span>
            <strong>{requests.length}</strong>
          </div>
        </div>

        <div className="stat-card dashboard-stat pending-stat">
          <div className="dashboard-stat-icon">◷</div>

          <div>
            <span>Pending reviews</span>
            <strong>{pending.length}</strong>
          </div>
        </div>

        <div className="stat-card dashboard-stat approved-stat">
          <div className="dashboard-stat-icon">✓</div>

          <div>
            <span>Approved</span>
            <strong>{approved.length}</strong>
          </div>
        </div>

        <div className="stat-card dashboard-stat appointment-stat">
          <div className="dashboard-stat-icon">▦</div>

          <div>
            <span>Appointments</span>
            <strong>{appointments.length}</strong>
          </div>
        </div>
      </div>

      <div className="dashboard-grid engineer-dashboard-grid">
        <section className="card dashboard-panel review-queue-panel">
          <div className="section-title">
            <div>
              <h3>Review queue</h3>

              <p>
                Requests waiting for engineer action.
              </p>
            </div>

            <span className="dashboard-panel-count">
              {pending.length}
            </span>
          </div>

          <div className="dashboard-activity-list">
            {pending.slice(0, 6).map((request) => (
              <div
                className="activity-row compact-activity"
                key={request.id}
              >
                <div>
                  <strong>
                    {request.association ||
                      "Service Request"}
                  </strong>

                  <span>
                    {request.referenceNumber ||
                      request.id}
                  </span>
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
            ))}
          </div>

          {pending.length === 0 && (
            <p className="muted dashboard-empty">
              No requests are waiting for review.
            </p>
          )}
        </section>

        <section className="card dashboard-panel appointments-panel">
          <div className="section-title">
            <div>
              <h3>Upcoming appointments</h3>

              <p>
                Recently scheduled validation appointments.
              </p>
            </div>

            <span className="dashboard-panel-count">
              {appointments.length}
            </span>
          </div>

          <div className="dashboard-activity-list">
            {appointments.slice(0, 6).map(
              (appointment) => (
                <div
                  className="activity-row compact-activity"
                  key={appointment.id}
                >
                  <div>
                    <strong>
                      {appointment.title ||
                        "Appointment"}
                    </strong>

                    <span>
                      {appointment.date} ·{" "}
                      {appointment.time}
                    </span>
                  </div>

                  <span className="tag">
                    {appointment.status}
                  </span>
                </div>
              )
            )}
          </div>

          {appointments.length === 0 && (
            <p className="muted dashboard-empty">
              No appointments scheduled.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}