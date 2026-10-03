import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useRequests } from "../context/RequestContext";
import { useAppointments } from "../context/AppointmentContext";
import { useAuth } from "../context/AuthContext";
import {
  avatarUrl,
  formatDate,
  initials
} from "../utils";

export default function ClientDashboard() {
  const { user } = useAuth();
  const { requests } =
    useRequests();

  const { appointments } =
    useAppointments();

  const navigate =
    useNavigate();

  const currentDate =
    new Date();

  const currentYear =
    currentDate.getFullYear();

  const [
    monthFilter,
    setMonthFilter
  ] = useState("All");

  const [
    yearFilter,
    setYearFilter
  ] = useState("All");

  const mine =
    requests.filter(
      (request) =>
        request.clientId ===
        user.id
    );

  const upcoming =
    appointments.filter(
      (appointment) =>
        appointment.clientId ===
        user.id &&
        appointment.status !==
          "Cancelled"
    );

  const years = useMemo(() => {
    const values = mine
      .map((request) => {
        const date =
          request.createdAt?.toDate
            ? request.createdAt.toDate()
            : new Date(
                request.createdAt
              );

        return date.getFullYear();
      })
      .filter(
        (year) =>
          !isNaN(year)
      );

    return [
      ...new Set(values)
    ].sort(
      (a, b) => b - a
    );
  }, [mine]);

  const list = useMemo(
    () => {
      return mine
        .filter((request) => {
          if (
            !request.createdAt
          ) {
            return (
              monthFilter ===
                "All" &&
              yearFilter ===
                "All"
            );
          }

          const date =
            request.createdAt?.toDate
              ? request.createdAt.toDate()
              : new Date(
                  request.createdAt
                );

          if (
            isNaN(
              date.getTime()
            )
          ) {
            return false;
          }

          const monthMatches =
            monthFilter ===
              "All" ||
            date.getMonth() ===
              Number(
                monthFilter
              );

          const yearMatches =
            yearFilter ===
              "All" ||
            date.getFullYear() ===
              Number(
                yearFilter
              );

          return (
            monthMatches &&
            yearMatches
          );
        })
        .sort((a, b) =>
          String(
            a.association || ""
          ).localeCompare(
            String(
              b.association || ""
            ),
            undefined,
            {
              sensitivity:
                "base"
            }
          )
        );
    },
    [
      mine,
      monthFilter,
      yearFilter
    ]
  );

  return (
    <div className="container page-container">
      <div className="welcome-banner">
        <div className="welcome-banner-content">
          <div>
            <span className="eyebrow">
              CLIENT PORTAL
            </span>

            <h1>
              Welcome,{" "}
              {user.name?.split(
                " "
              )[0] ||
                "Client"}
            </h1>

            <p>
              {user.association ||
                "Association account"}
            </p>
          </div>

          <button
            type="button"
            className="dashboard-profile"
            onClick={() =>
              navigate(
                "/profile"
              )
            }
          >
            <span className="dashboard-profile-avatar">
              {avatarUrl(
                user
              ) ? (
                <img
                  src={avatarUrl(
                    user
                  )}
                  alt={
                    user.name ||
                    "Profile"
                  }
                />
              ) : (
                initials(
                  user.name ||
                    "Client"
                )
              )}
            </span>

            <span className="dashboard-profile-info">
              <strong>
                {user.name ||
                  "Client"}
              </strong>

              <small>
                View Profile
              </small>
            </span>

            <span className="dashboard-profile-arrow">
              →
            </span>
          </button>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <span>
            Total requests
          </span>

          <strong>
            {mine.length}
          </strong>
        </div>

        <div className="stat-card">
          <span>
            Submitted
          </span>

          <strong>
            {
              mine.filter(
                (request) =>
                  [
                    "Submitted",
                    "Under Review"
                  ].includes(
                    request.status
                  )
              ).length
            }
          </strong>
        </div>

        <div className="stat-card">
          <span>
            Approved
          </span>

          <strong>
            {
              mine.filter(
                (request) =>
                  request.status ===
                  "Approved"
              ).length
            }
          </strong>
        </div>

        <div className="stat-card">
          <span>
            Appointments
          </span>

          <strong>
            {upcoming.length}
          </strong>
        </div>
      </div>

      <div className="dashboard-grid">
        <section className="card client-dashboard-highlight">
          <div className="section-title">
            <div>
              <h3>
                Recent requests
              </h3>

              <p>
                Filter your submitted
                requests by month and
                year.
              </p>
            </div>
          </div>

          <div className="client-request-filters">
            <select
              className="report-filter"
              value={
                monthFilter
              }
              onChange={(
                event
              ) =>
                setMonthFilter(
                  event.target
                    .value
                )
              }
            >
              <option value="All">
                All months
              </option>

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
              ].map(
                (
                  month,
                  index
                ) => (
                  <option
                    key={
                      month
                    }
                    value={
                      index
                    }
                  >
                    {month}
                  </option>
                )
              )}
            </select>

            <select
              className="report-filter"
              value={
                yearFilter
              }
              onChange={(
                event
              ) =>
                setYearFilter(
                  event.target
                    .value
                )
              }
            >
              <option value="All">
                All years
              </option>

              {years.length >
              0 ? (
                years.map(
                  (
                    year
                  ) => (
                    <option
                      key={
                        year
                      }
                      value={
                        year
                      }
                    >
                      {year}
                    </option>
                  )
                )
              ) : (
                <option
                  value={
                    currentYear
                  }
                >
                  {
                    currentYear
                  }
                </option>
              )}
            </select>
          </div>

          {list
            .slice(
              0,
              7
            )
            .map(
              (
                request
              ) => (
                <div
                  className="activity-row"
                  key={
                    request.id
                  }
                >
                  <div>
                    <strong>
                      {
                        request.association
                      }
                    </strong>

                    <span>
                      {request.referenceNumber ||
                        request.id}{" "}
                      ·{" "}
                      {request.typeOfRequest ||
                        "Request"}{" "}
                      ·{" "}
                      {formatDate(
                        request.createdAt
                      )}
                    </span>
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
              )
            )}

          {list.length ===
            0 && (
            <p className="muted">
              No requests found
              for the selected
              month and year.
            </p>
          )}
        </section>

        <section className="card client-dashboard-highlight">
          <div className="section-title">
            <div>
              <h3>
                Upcoming appointments
              </h3>

              <p>
                View your scheduled
                appointments on the
                calendar.
              </p>
            </div>

            <button
              type="button"
              className="secondary-btn"
              onClick={() =>
                navigate(
                  "/calendar"
                )
              }
            >
              View Appointments
            </button>
          </div>

          {upcoming.length ===
          0 ? (
            <div className="empty-state">
              You currently
              have no upcoming
              appointments.
            </div>
          ) : (
            <div className="appointment-dashboard-preview">
              <strong>
                You have{" "}
                {upcoming.length}{" "}
                scheduled
                appointment
                {upcoming.length !==
                1
                  ? "s"
                  : ""}
                .
              </strong>

              <span>
                Click{" "}
                <b>
                  View
                  Appointments
                </b>{" "}
                to open the
                calendar and
                view the details
                for each date.
              </span>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}