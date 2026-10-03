import { useState } from "react";
import { useAppointments } from "../context/AppointmentContext";
import { useAuth } from "../context/AuthContext";
import CalendarGrid from "../components/CalendarGrid";

export default function Calendar() {
  const {
    appointments,
    blockedDates,
    toggleBlocked,
    updateAppointment
  } = useAppointments();

  const { users, user } = useAuth();

  const [search, setSearch] = useState("");
  const [date, setDate] = useState("");

  const [rescheduleId, setRescheduleId] =
    useState("");

  const [rescheduleForm, setRescheduleForm] =
    useState({
      date: "",
      time: ""
    });

  const filtered = appointments.filter(
    (appointment) => {
      const client = users.find(
        (user) =>
          user.id === appointment.clientId
      );

      const searchText = `
        ${appointment.title || ""}
        ${client?.name || ""}
        ${client?.association || ""}
      `.toLowerCase();

      return (
        searchText.includes(
          search.toLowerCase()
        ) &&
        (date
          ? appointment.date === date
          : true)
      );
    }
  );

  const selectedDateUnavailable =
    date &&
    blockedDates.includes(date);

  const startReschedule = (
    appointment
  ) => {
    setRescheduleId(appointment.id);

    setRescheduleForm({
      date: appointment.date || "",
      time: appointment.time || ""
    });
  };

  const cancelReschedule = () => {
    setRescheduleId("");

    setRescheduleForm({
      date: "",
      time: ""
    });
  };

  const submitReschedule = async (
    event
  ) => {
    event.preventDefault();

    if (!rescheduleId) {
      return;
    }

    try {
      const result =
        await updateAppointment(
          rescheduleId,
          {
            date:
              rescheduleForm.date,
            time:
              rescheduleForm.time
          }
        );

      if (
        result?.error ===
        "blocked"
      ) {
        alert(
          "This date is unavailable."
        );
        return;
      }

      if (
        result?.error ===
        "time"
      ) {
        alert(
          "That time is already booked."
        );
        return;
      }

      if (
        result?.error ===
        "past"
      ) {
        alert(
          "You cannot reschedule to a past date."
        );
        return;
      }

      if (
        result?.error ===
        "date"
      ) {
        alert(
          "Please select a date."
        );
        return;
      }

      if (
        result?.error ===
        "not-found"
      ) {
        alert(
          "The appointment could not be found."
        );
        return;
      }

      cancelReschedule();

      alert(
        "Appointment rescheduled successfully."
      );
    } catch (error) {
      alert(
        error?.message ||
          "Could not reschedule the appointment."
      );
    }
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
          request and client schedule.
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
        engineer={
          user?.role ===
          "engineer"
        }
        appointments={
          appointments
        }
        blockedDates={
          blockedDates
        }
        onToggleBlocked={
          user?.role ===
          "engineer"
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
        selectedDate={date}
        onSelect={setDate}
      />

      {selectedDateUnavailable && (
        <div className="calendar-unavailable-notice">
          <strong>
            Unavailable date
          </strong>

          <span>
            The selected date is currently
            unavailable for appointments.
          </span>
        </div>
      )}

      <div className="calendar-search">
        <input
          className="search-input"
          placeholder="Search appointments."
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
            onClick={() =>
              setDate("")
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
                (user) =>
                  user.id ===
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
                    {
                      appointment.title
                    }
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

                <div className="appointment-actions">
                  <span className="tag">
                    {client?.association ||
                      ""}
                  </span>

                  {user?.role ===
                    "engineer" && (
                    <button
                      type="button"
                      className="secondary-btn small"
                      onClick={() =>
                        startReschedule(
                          appointment
                        )
                      }
                    >
                      Reschedule
                    </button>
                  )}
                </div>
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

      {rescheduleId && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <div>
                <span className="eyebrow">
                  APPOINTMENT
                </span>

                <h2>
                  Reschedule appointment
                </h2>
              </div>

              <button
                type="button"
                className="modal-close"
                onClick={
                  cancelReschedule
                }
              >
                ×
              </button>
            </div>

            <form
              className="form-card"
              onSubmit={
                submitReschedule
              }
            >
              <label>
                New date
              </label>

              <input
                type="date"
                min={
                  new Date()
                    .toISOString()
                    .slice(0, 10)
                }
                value={
                  rescheduleForm.date
                }
                onChange={(
                  event
                ) =>
                  setRescheduleForm(
                    {
                      ...rescheduleForm,
                      date:
                        event.target
                          .value
                    }
                  )
                }
                required
              />

              <label>
                New time
              </label>

              <input
                type="time"
                value={
                  rescheduleForm.time
                }
                onChange={(
                  event
                ) =>
                  setRescheduleForm(
                    {
                      ...rescheduleForm,
                      time:
                        event.target
                          .value
                    }
                  )
                }
                required
              />

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={
                    cancelReschedule
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-btn"
                >
                  Save Reschedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}