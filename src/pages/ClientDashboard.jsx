
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useRequests } from "../context/RequestContext";
import { useAppointments } from "../context/AppointmentContext";
import { useAuth } from "../context/AuthContext";
import { avatarUrl, formatDate, initials } from "../utils";
import { useMessages } from "../context/MessageContext";

export default function ClientDashboard() {
  const { user } = useAuth();
  const { requests } = useRequests();
  const { appointments } = useAppointments();
  const navigate = useNavigate();

  const currentYear = new Date().getFullYear();

  const [monthFilter, setMonthFilter] = useState("All");
  const [yearFilter, setYearFilter] = useState("All");
  const { unreadMessageCount } = useMessages();

  const mine = useMemo(
    () =>
      requests.filter(
        (request) => request.clientId === user?.id
      ),
    [requests, user?.id]
  );

  const upcoming = useMemo(
    () =>
      appointments.filter(
        (appointment) =>
          appointment.clientId === user?.id &&
          appointment.status !== "Cancelled"
      ),
    [appointments, user?.id]
  );

  const years = useMemo(() => {
    const values = mine
      .map((request) => {
        const date = request.createdAt?.toDate
          ? request.createdAt.toDate()
          : new Date(request.createdAt);

        return date.getFullYear();
      })
      .filter((year) => !isNaN(year));

    return [...new Set(values)].sort((a, b) => b - a);
  }, [mine]);

  const list = useMemo(() => {
    return mine
      .filter((request) => {
        if (!request.createdAt) {
          return monthFilter === "All" && yearFilter === "All";
        }

        const date = request.createdAt?.toDate
          ? request.createdAt.toDate()
          : new Date(request.createdAt);

        if (isNaN(date.getTime())) return false;

        const monthMatches =
          monthFilter === "All" ||
          date.getMonth() === Number(monthFilter);

        const yearMatches =
          yearFilter === "All" ||
          date.getFullYear() === Number(yearFilter);

        return monthMatches && yearMatches;
      })
      .sort((a, b) =>
        String(a.association || "").localeCompare(
          String(b.association || ""),
          undefined,
          { sensitivity: "base" }
        )
      );
  }, [mine, monthFilter, yearFilter]);

  const submittedCount = mine.filter((request) =>
    ["Submitted", "Under Review"].includes(request.status)
  ).length;

  const approvedCount = mine.filter(
    (request) => request.status === "Approved"
  ).length;

  const profileImage = avatarUrl(user);

  const dashboardStats = [
    {
      label: "Total requests",
      value: mine.length,
      destination: "/requests",
      description: "Open my requests",
      icon: "▣",
    },
    {
      label: "Submitted",
      value: submittedCount,
      destination: "/requests",
      description: "View submitted requests",
      icon: "◷",
    },
    {
      label: "Messages",
      value: unreadMessageCount,
      destination: "/client-messages",
      description: "Open my messages",
      icon: "✉",
    },
    {
      label: "Appointments",
      value: upcoming.length,
      destination: "/calendar",
      description: "Open appointment calendar",
      icon: "▦",
    },
  ];

  return (
    <div className="container page-container">
      <div className="welcome-banner">
        <div className="welcome-banner-content">
          <div>
            <span className="eyebrow">CLIENT PORTAL</span>

            <h1>
              Welcome, {user?.name?.split(" ")[0] || "Client"}
            </h1>

            <p>
              {user?.association || "Association account"}
            </p>
          </div>

          <button
            type="button"
            className="dashboard-profile dashboard-profile-avatar-only"
            onClick={() => navigate("/profile")}
            title="View profile"
            aria-label="Open my profile"
          >
            <span className="dashboard-profile-avatar">
              {profileImage ? (
                <img
                  src={profileImage}
                  alt={user?.name || "Profile"}
                />
              ) : (
                initials(user?.name || "Client")
              )}
            </span>
          </button>
        </div>
      </div>

      <div className="stats-grid">
        {dashboardStats.map((stat) => (
          <button
            key={stat.label}
            type="button"
            className="stat-card client-clickable-stat"
            onClick={() => navigate(stat.destination)}
            title={stat.description}
            aria-label={`${stat.label}: ${stat.value}. ${stat.description}`}
          >
            <span className="client-stat-icon" aria-hidden="true">
              {stat.icon}
            </span>

            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
            <span className="client-stat-action">
              Click to view →
            </span>
          </button>
        ))}
      </div>

      <div className="dashboard-grid">
        <section className="card client-dashboard-highlight">
          <div className="section-title">
            <div>
              <h3>Recent requests</h3>
              <p>
                Filter your submitted requests by month and year.
              </p>
            </div>

            <button
              type="button"
              className="secondary-btn"
              onClick={() => navigate("/requests")}
            >
              All Requests
            </button>
          </div>

          <div className="client-request-filters">
            <select
              className="report-filter"
              value={monthFilter}
              onChange={(event) => setMonthFilter(event.target.value)}
              aria-label="Filter requests by month"
            >
              <option value="All">All months</option>

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
                "December",
              ].map((month, index) => (
                <option key={month} value={index}>
                  {month}
                </option>
              ))}
            </select>

            <select
              className="report-filter"
              value={yearFilter}
              onChange={(event) => setYearFilter(event.target.value)}
              aria-label="Filter requests by year"
            >
              <option value="All">All years</option>

              {years.length > 0 ? (
                years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))
              ) : (
                <option value={currentYear}>{currentYear}</option>
              )}
            </select>
          </div>

          {list.slice(0, 7).map((request) => (
            <button
              type="button"
              className="activity-row client-clickable-activity"
              key={request.id}
              onClick={() => navigate("/requests")}
              title="Open my requests"
              aria-label={`Open requests. ${request.association || "Association"}, ${
                request.typeOfRequest || "Request"
              }, status ${request.status || "Unknown"}`}
            >
              <span className="client-activity-details">
                <strong>{request.association || "Association"}</strong>

                <span>
                  {request.referenceNumber || request.id}
                  {" · "}
                  {request.typeOfRequest || "Request"}
                  {" · "}
                  {formatDate(request.createdAt)}
                </span>
              </span>

              <span
                className={`status ${String(request.status || "")
                  .toLowerCase()
                  .replaceAll(" ", "-")}`}
              >
                {request.status || "Unknown"}
              </span>

              <span className="client-activity-arrow" aria-hidden="true">
                →
              </span>
            </button>
          ))}

          {list.length === 0 && (
            <p className="muted">
              No requests found for the selected month and year.
            </p>
          )}

          {list.length > 7 && (
            <button
              type="button"
              className="secondary-btn client-view-all"
              onClick={() => navigate("/requests")}
            >
              View All Requests
            </button>
          )}
        </section>

        <section className="card client-dashboard-highlight">
          <div className="section-title">
            <div>
              <h3>Upcoming appointments</h3>
              <p>
                Open your calendar to view scheduled appointments.
              </p>
            </div>

            <button
              type="button"
              className="secondary-btn"
              onClick={() => navigate("/calendar")}
            >
              View Calendar
            </button>
          </div>

          <button
            type="button"
            className="client-appointment-preview"
            onClick={() => navigate("/calendar")}
            aria-label="Open appointment calendar"
          >
            <span className="client-appointment-icon" aria-hidden="true">
              ▦
            </span>

            <span className="client-appointment-details">
              <strong>
                {upcoming.length} scheduled appointment
                {upcoming.length !== 1 ? "s" : ""}
              </strong>

              <span>
                {upcoming.length > 0
                  ? "Click to open the calendar and view appointment details."
                  : "You currently have no upcoming appointments. Click to open the calendar."}
              </span>
            </span>

            <span className="client-activity-arrow" aria-hidden="true">
              →
            </span>
          </button>
        </section>
      </div>
    </div>
  );
}
