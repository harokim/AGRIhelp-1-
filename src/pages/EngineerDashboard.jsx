import {
  useMemo,
  useState
} from "react";
import { useRequests } from "../context/RequestContext";
import { useAppointments } from "../context/AppointmentContext";
import { useNavigate } from "react-router-dom";

function getRequestDate(
  request
) {
  if (
    request.createdAt?.toDate
  ) {
    return request.createdAt.toDate();
  }

  if (
    request.createdAtTimestamp?.toDate
  ) {
    return request.createdAtTimestamp.toDate();
  }

  const date = new Date(
    request.createdAt ||
      request.createdAtTimestamp ||
      ""
  );

  return isNaN(
    date.getTime()
  )
    ? null
    : date;
}

function getAssociationData(
  items,
  getDate,
  year,
  month
) {
  const counts = {};

  items.forEach(
    (item) => {
      const date =
        getDate(item);

      if (!date) return;

      if (
        date.getFullYear() !==
          year ||
        date.getMonth() !==
          month
      ) {
        return;
      }

      const association =
        item.association ||
        "Unknown Association";

      counts[
        association
      ] =
        (counts[
          association
        ] || 0) + 1;
    }
  );

  return Object.entries(
    counts
  ).sort(
    (a, b) =>
      b[1] - a[1]
  );
}

function AssociationDiagram({
  data,
  emptyText
}) {
  const maximum =
    data.length > 0
      ? Math.max(
          ...data.map(
            ([, count]) =>
              count
          )
        )
      : 0;

  if (
    data.length === 0
  ) {
    return (
      <div className="diagram-empty">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="association-diagram">
      {data.map(
        ([
          association,
          count
        ]) => (
          <div
            className="association-bar-row"
            key={
              association
            }
          >
            <div className="association-bar-label">
              <span>
                {
                  association
                }
              </span>

              <strong>
                {count}
              </strong>
            </div>

            <div className="association-bar-track">
              <div
                className="association-bar-fill"
                style={{
                  width: `${Math.max(
                    8,
                    (count /
                      maximum) *
                      100
                  )}%`
                }}
              />
            </div>
          </div>
        )
      )}
    </div>
  );
}

export default function EngineerDashboard() {
  const {
    requests
  } = useRequests();

  const {
    appointments
  } = useAppointments();

  const navigate =
    useNavigate();

  const current =
    new Date();

  const [
    selectedMonth,
    setSelectedMonth
  ] = useState(
    current.getMonth()
  );

  const [
    selectedYear,
    setSelectedYear
  ] = useState(
    current.getFullYear()
  );

  const pending =
    requests.filter(
      (request) =>
        [
          "Submitted",
          "Under Review"
        ].includes(
          request.status
        )
    );

  const approved =
    requests.filter(
      (request) =>
        request.status ===
        "Approved"
    );

  const reviewData =
    useMemo(
      () =>
        getAssociationData(
          pending,
          getRequestDate,
          selectedYear,
          selectedMonth
        ),
      [
        pending,
        selectedMonth,
        selectedYear
      ]
    );

  const appointmentData =
    useMemo(
      () =>
        getAssociationData(
          appointments,
          (appointment) => {
            if (
              appointment.date
            ) {
              const date =
                new Date(
                  `${appointment.date}T00:00:00`
                );

              return isNaN(
                date.getTime()
              )
                ? null
                : date;
            }

            return null;
          },
          selectedYear,
          selectedMonth
        ),
      [
        appointments,
        selectedMonth,
        selectedYear
      ]
    );

  const years =
    Array.from(
      new Set(
        [
          ...requests.map(
            (request) =>
              getRequestDate(
                request
              )?.getFullYear()
          ),
          ...appointments.map(
            (
              appointment
            ) => {
              if (
                !appointment.date
              ) {
                return null;
              }

              const date =
                new Date(
                  `${appointment.date}T00:00:00`
                );

              return isNaN(
                date.getTime()
              )
                ? null
                : date.getFullYear();
            }
          ),
          current.getFullYear()
        ].filter(Boolean)
      )
    ).sort(
      (a, b) =>
        b - a
    );

  return (
    <div className="container page-container">
      <div className="page-header">
        <div>
          <span className="eyebrow">
            ENGINEER PORTAL
          </span>

          <h1>
            Engineer dashboard
          </h1>

          <p>
            Review client requests,
            appointments, reports,
            and system activity.
          </p>
        </div>

        <button
          className="primary-btn"
          onClick={() =>
            navigate(
              "/reports"
            )
          }
        >
          Generate Report
        </button>
      </div>

      <div className="stats-grid engineer-stats">
        <div className="stat-card dashboard-stat total-stat">
          <div className="dashboard-stat-icon">
            ▣
          </div>

          <div>
            <span>
              Total requests
            </span>

            <strong>
              {requests.length}
            </strong>
          </div>
        </div>

        <div className="stat-card dashboard-stat pending-stat">
          <div className="dashboard-stat-icon">
            ◷
          </div>

          <div>
            <span>
              Pending reviews
            </span>

            <strong>
              {pending.length}
            </strong>
          </div>
        </div>

        <div className="stat-card dashboard-stat approved-stat">
          <div className="dashboard-stat-icon">
            ✓
          </div>

          <div>
            <span>
              Approved
            </span>

            <strong>
              {approved.length}
            </strong>
          </div>
        </div>

        <div className="stat-card dashboard-stat appointment-stat">
          <div className="dashboard-stat-icon">
            ▦
          </div>

          <div>
            <span>
              Appointments
            </span>

            <strong>
              {
                appointments.length
              }
            </strong>
          </div>
        </div>
      </div>

      <div className="dashboard-diagram-controls">
        <span>
          Diagram period
        </span>

        <select
          value={
            selectedMonth
          }
          onChange={(
            event
          ) =>
            setSelectedMonth(
              Number(
                event.target
                  .value
              )
            )
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
          ].map(
            (
              month,
              index
            ) => (
              <option
                value={
                  index
                }
                key={
                  month
                }
              >
                {month}
              </option>
            )
          )}
        </select>

        <select
          value={
            selectedYear
          }
          onChange={(
            event
          ) =>
            setSelectedYear(
              Number(
                event.target
                  .value
              )
            )
          }
        >
          {years.map(
            (year) => (
              <option
                value={
                  year
                }
                key={
                  year
                }
              >
                {year}
              </option>
            )
          )}
        </select>
      </div>

      <div className="dashboard-diagram-grid">
        <section className="card dashboard-panel review-queue-panel">
          <div className="section-title">
            <div>
              <h3>
                Review Queue
              </h3>

              <p>
                Requests by
                association for
                the selected
                month.
              </p>
            </div>

            <span className="dashboard-panel-count">
              {
                reviewData.reduce(
                  (
                    total,
                    [, count]
                  ) =>
                    total +
                    count,
                  0
                )
              }
            </span>
          </div>

          <AssociationDiagram
            data={
              reviewData
            }
            emptyText="No pending requests for this month."
          />
        </section>

        <section className="card dashboard-panel appointments-panel">
          <div className="section-title">
            <div>
              <h3>
                Upcoming Appointments
              </h3>

              <p>
                Appointments by
                association for
                the selected
                month.
              </p>
            </div>

            <span className="dashboard-panel-count">
              {
                appointmentData.reduce(
                  (
                    total,
                    [, count]
                  ) =>
                    total +
                    count,
                  0
                )
              }
            </span>
          </div>

          <AssociationDiagram
            data={
              appointmentData
            }
            emptyText="No appointments for this month."
          />
        </section>
      </div>
    </div>
  );
}