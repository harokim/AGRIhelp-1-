import { useState } from "react";
import { useAppointments } from "../context/AppointmentContext";
import { useAuth } from "../context/AuthContext";
import CalendarGrid from "../components/CalendarGrid";

export default function Calendar() {
  const {
    appointments,
    blockedDates,
    toggleBlocked
  } = useAppointments();

  const {
    users,
    user
  } = useAuth();

  const [search, setSearch] =
    useState("");

  const [date, setDate] =
    useState("");

  const [popupSearch, setPopupSearch] =
    useState("");

  const isEngineer =
    user?.role === "engineer";

  const filtered =
    appointments.filter(
      (appointment) => {
        const client =
          users.find(
            (item) =>
              item.id ===
              appointment.clientId
          );

        const searchText = `
          ${appointment.title || ""}
          ${appointment.clientName || ""}
          ${client?.name || ""}
          ${client?.association || ""}
        `.toLowerCase();

        return (
          searchText.includes(
            search
              .toLowerCase()
          ) &&
          (
            date
              ? appointment.date ===
                date
              : true
          )
        );
      }
    );

  const selectedAppointments =
    date
      ? appointments.filter(
          (appointment) =>
            appointment.date ===
              date &&
            appointment.status !==
              "Cancelled"
        )
      : [];

  const popupAppointments =
    selectedAppointments.filter(
      (appointment) => {
        const client =
          users.find(
            (item) =>
              item.id ===
              appointment.clientId
          );

        const searchText = `
          ${appointment.title || ""}
          ${appointment.clientName || ""}
          ${client?.name || ""}
          ${client?.association || ""}
          ${appointment.time || ""}
        `.toLowerCase();

        return searchText.includes(
          popupSearch
            .toLowerCase()
        );
      }
    );

  const selectedDateUnavailable =
    date &&
    blockedDates.includes(date);

  const closePopup = () => {
    setDate("");
    setPopupSearch("");
  };

  return (
    <div className="container page-container calendar-screen">
      <div className="page-header">
        <span className="eyebrow">
          SCHEDULE
        </span>

        <h1>Calendar</h1>

        <p>
          View appointments in a full
          calendar layout and search the
          schedule.
        </p>
      </div>

      <div className="calendar-status-legend">
        <div>
          <span className="calendar-legend-dot unavailable"></span>

          <span>
            Unavailable
          </span>
        </div>

        <div>
          <span className="calendar-legend-dot appointment"></span>

          <span>
            Appointment
          </span>
        </div>
      </div>

      <CalendarGrid
        engineer={isEngineer}
        appointments={
          appointments
        }
        blockedDates={
          blockedDates
        }
        selectedDate={date}
        onSelect={(selectedDate) => {
          setDate(
            selectedDate
          );

          setPopupSearch("");
        }}
        onToggleBlocked={
          isEngineer
            ? async (
                selectedDate
              ) => {
                try {
                  const result =
                    await toggleBlocked(
                      selectedDate
                    );

                  if (
                    result?.error ===
                    "appointment"
                  ) {
                    alert(
                      "This date already has an appointment and cannot be marked unavailable."
                    );

                    return;
                  }

                  if (
                    result?.error ===
                    "past"
                  ) {
                    alert(
                      "Past dates cannot be marked unavailable."
                    );

                    return;
                  }

                  if (
                    result?.error ===
                    "date"
                  ) {
                    alert(
                      "Please select a valid date."
                    );
                  }
                } catch (
                  error
                ) {
                  alert(
                    error?.message ||
                      "Could not update date availability."
                  );
                }
              }
            : undefined
        }
      />

      {selectedDateUnavailable &&
        selectedAppointments.length ===
          0 && (
          <div className="calendar-unavailable-notice">
            <strong>
              Unavailable date
            </strong>

            <span>
              The selected date is
              currently unavailable for
              appointments.
            </span>
          </div>
        )}

      <div className="calendar-search">
        <input
          className="search-input"
          placeholder="Search appointments..."
          value={search}
          onChange={(event) =>
            setSearch(
              event.target.value
            )
          }
        />

        {date && (
          <button
            type="button"
            className="secondary-btn"
            onClick={
              closePopup
            }
          >
            Show all dates
          </button>
        )}
      </div>

      <div className="request-list calendar-results">
        {filtered.map(
          (appointment) => {
            const client =
              users.find(
                (item) =>
                  item.id ===
                  appointment.clientId
              );

            return (
              <div
                className="card activity-row"
                key={
                  appointment.id
                }
              >
                <div>
                  <strong>
                    {appointment.title ||
                      "Appointment"}
                  </strong>

                  <span>
                    {
                      appointment.date
                    }{" "}
                    ·{" "}
                    {
                      appointment.time
                    }{" "}
                    ·{" "}
                    {client?.name ||
                      appointment.clientName ||
                      "Client"}
                  </span>
                </div>

                <span className="tag">
                  {client?.association ||
                    ""}
                </span>
              </div>
            );
          }
        )}

        {filtered.length ===
          0 && (
          <div className="empty-state">
            <strong>
              No matching appointments.
            </strong>

            <span>
              Try another search or
              select a different date.
            </span>
          </div>
        )}
      </div>

      {date &&
        selectedAppointments.length >
          0 && (
          <div
            className="appointment-popup-backdrop"
            onClick={
              closePopup
            }
          >
            <div
              className="appointment-popup"
              onClick={(event) =>
                event.stopPropagation()
              }
            >
              <div className="appointment-popup-header">
                <div>
                  <span className="eyebrow">
                    APPOINTMENTS
                  </span>

                  <h2>
                    {new Date(
                      `${date}T00:00:00`
                    ).toLocaleDateString(
                      undefined,
                      {
                        month:
                          "long",
                        day: "numeric",
                        year:
                          "numeric"
                      }
                    )}
                  </h2>
                </div>

                <button
                  type="button"
                  className="appointment-popup-close"
                  onClick={
                    closePopup
                  }
                  aria-label="Close appointments"
                >
                  ×
                </button>
              </div>

              <div className="appointment-popup-search">
                <input
                  className="search-input"
                  type="search"
                  placeholder="Search appointments..."
                  value={
                    popupSearch
                  }
                  onChange={(
                    event
                  ) =>
                    setPopupSearch(
                      event.target
                        .value
                    )
                  }
                />
              </div>

              <div className="appointment-popup-list">
                {popupAppointments.map(
                  (
                    appointment
                  ) => {
                    const client =
                      users.find(
                        (item) =>
                          item.id ===
                          appointment.clientId
                      );

                    return (
                      <div
                        className="appointment-popup-item"
                        key={
                          appointment.id
                        }
                      >
                        <div className="appointment-popup-time">
                          {
                            appointment.time
                          }
                        </div>

                        <div className="appointment-popup-details">
                          <strong>
                            {appointment.title ||
                              "Validation Appointment"}
                          </strong>

                          {isEngineer ? (
                            <>
                              <span>
                                {client?.association ||
                                  appointment.clientName ||
                                  "Association"}
                              </span>

                              {client?.name && (
                                <small>
                                  Client:{" "}
                                  {
                                    client.name
                                  }
                                </small>
                              )}
                            </>
                          ) : (
                            <span>
                              You have an
                              appointment
                            </span>
                          )}

                          {appointment.location && (
                            <small>
                              Location:{" "}
                              {
                                appointment.location
                              }
                            </small>
                          )}

                          {appointment.purpose && (
                            <small>
                              Purpose:{" "}
                              {
                                appointment.purpose
                              }
                            </small>
                          )}

                          {appointment.notes && (
                            <small>
                              Notes:{" "}
                              {
                                appointment.notes
                              }
                            </small>
                          )}
                        </div>

                        <span className="tag">
                          {
                            appointment.status
                          }
                        </span>
                      </div>
                    );
                  }
                )}

                {popupAppointments.length ===
                  0 && (
                  <div className="empty-state">
                    No matching
                    appointments.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
    </div>
  );
}