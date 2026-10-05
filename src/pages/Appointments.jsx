import { useState } from "react";
import {
  useAppointments
} from "../context/AppointmentContext";
import {
  useAuth
} from "../context/AuthContext";
import CalendarGrid from "../components/CalendarGrid";
import {
  todayISO
} from "../utils";

export default function Appointments() {
  const {
    appointments,
    blockedDates,
    addAppointment,
    deleteAppointment,
    updateAppointment,
    toggleBlocked
  } = useAppointments();

  const {
    users,
    user
  } = useAuth();

  const [
    date,
    setDate
  ] = useState("");

  const [
    popupDate,
    setPopupDate
  ] = useState("");

  const [
    popupSearch,
    setPopupSearch
  ] = useState("");

  const [
    form,
    setForm
  ] = useState({
    clientId: "",
    time: "",
    title: ""
  });

  const [
    rescheduleId,
    setRescheduleId
  ] = useState("");

  const [
    rescheduleForm,
    setRescheduleForm
  ] = useState({
    date: "",
    time: ""
  });

  const clients =
    users.filter(
      (item) =>
        item.role ===
          "client" &&
        item.status !==
          "inactive"
    );

  const selected =
    appointments.filter(
      (item) =>
        item.date ===
        date
    );

  const popupAppointments =
    appointments
      .filter(
        (item) =>
          item.date ===
            popupDate &&
          item.status !==
            "Cancelled"
      )
      .filter(
        (item) => {
          const client =
            users.find(
              (userItem) =>
                userItem.id ===
                item.clientId
            );

          const value =
            `${item.title || ""} ${
              item.clientName ||
              ""
            } ${
              client?.name ||
              ""
            } ${
              client?.association ||
              ""
            } ${
              item.time || ""
            }`
              .toLowerCase();

          return value.includes(
            popupSearch
              .trim()
              .toLowerCase()
          );
        }
      );

  const submit =
    async (
      event
    ) => {
      event.preventDefault();

      try {
        const result =
          await addAppointment({
            ...form,
            date
          });

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
          "blocked"
        ) {
          alert(
            "This date is unavailable."
          );
          return;
        }

        if (
          result?.error ===
          "past"
        ) {
          alert(
            "You cannot create an appointment for a past date."
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

        setForm({
          clientId: "",
          time: "",
          title: ""
        });

        alert(
          "Appointment created."
        );
      } catch (error) {
        alert(
          error?.message ||
            "Could not create the appointment."
        );
      }
    };

  const startReschedule =
    (
      appointment
    ) => {
      setRescheduleId(
        appointment.id
      );

      setRescheduleForm({
        date:
          appointment.date ||
          "",
        time:
          appointment.time ||
          ""
      });

      setPopupDate("");
    };

  const cancelReschedule =
    () => {
      setRescheduleId("");

      setRescheduleForm({
        date: "",
        time: ""
      });
    };

  const submitReschedule =
    async (
      event
    ) => {
      event.preventDefault();

      if (
        !rescheduleId
      ) {
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

  const handleToggleBlocked =
    async (
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
      } catch (error) {
        alert(
          error?.message ||
            "Could not update date availability."
        );
      }
    };

  const handleCalendarSelect =
    (
      selectedDate
    ) => {
      setDate(
        selectedDate
      );
      setPopupSearch("");

      const hasAppointments =
        appointments.some(
          (item) =>
            item.date ===
              selectedDate &&
            item.status !==
              "Cancelled"
        );

      if (
        hasAppointments
      ) {
        setPopupDate(
          selectedDate
        );
      }
    };

  const closePopup =
    () => {
      setPopupDate("");
      setPopupSearch("");
    };

  if (
    user?.role !==
    "engineer"
  ) {
    return (
      <div className="container page-container">
        <div className="empty-state">
          Unauthorized
        </div>
      </div>
    );
  }

  return (
    <div className="container page-container">
      <div className="page-header">
        <span className="eyebrow">
          SCHEDULING
        </span>

        <h1>
          Appointments
        </h1>

        <p>
          Select a date to view
          appointments or manage
          availability.
        </p>
      </div>

      <div className="calendar-full card">
        <CalendarGrid
          engineer
          appointments={
            appointments
          }
          blockedDates={
            blockedDates
          }
          onToggleBlocked={
            handleToggleBlocked
          }
          selectedDate={
            date
          }
          onSelect={
            handleCalendarSelect
          }
          onAppointmentSelect={
            startReschedule
          }
        />
      </div>

      <div className="two-column">
        <form
          className="card form-card"
          onSubmit={
            submit
          }
        >
          <h3>
            Create appointment
          </h3>

          <label>
            Selected date
          </label>

          <input
            type="date"
            min={
              todayISO()
            }
            value={
              date
            }
            onChange={(
              event
            ) => {
              setDate(
                event.target
                  .value
              );

              setPopupDate(
                ""
              );
            }}
            required
          />

          <label>
            Client
          </label>

          <select
            value={
              form.clientId
            }
            onChange={(
              event
            ) =>
              setForm({
                ...form,
                clientId:
                  event.target
                    .value
              })
            }
            required
          >
            <option value="">
              Select client
            </option>

            {clients.map(
              (item) => (
                <option
                  value={
                    item.id
                  }
                  key={
                    item.id
                  }
                >
                  {
                    item.name
                  }{" "}
                  —{" "}
                  {
                    item.association
                  }
                </option>
              )
            )}
          </select>

          <label>
            Time
          </label>

          <input
            type="time"
            value={
              form.time
            }
            onChange={(
              event
            ) =>
              setForm({
                ...form,
                time:
                  event.target
                    .value
              })
            }
            required
          />

          <label>
            Appointment title
          </label>

          <input
            value={
              form.title
            }
            onChange={(
              event
            ) =>
              setForm({
                ...form,
                title:
                  event.target
                    .value
              })
            }
            required
            placeholder="Validation meeting"
          />

          <button
            className="primary-btn full"
            type="submit"
          >
            Create appointment
          </button>
        </form>

        <section className="card">
          <h3>
            {date
              ? `Appointments on ${date}`
              : "Select a date"}
          </h3>

          {selected.map(
            (item) => {
              const client =
                users.find(
                  (
                    clientItem
                  ) =>
                    clientItem.id ===
                    item.clientId
                );

              return (
                <div
                  className="activity-row"
                  key={
                    item.id
                  }
                >
                  <div>
                    <strong>
                      {
                        item.title
                      }
                    </strong>

                    <span>
                      {
                        item.time
                      }{" "}
                      ·{" "}
                      {client?.name ||
                        item.clientName ||
                        "Client"}
                    </span>
                  </div>

                  <div className="appointment-actions">
                    <button
                      type="button"
                      className="secondary-btn small"
                      onClick={() =>
                        startReschedule(
                          item
                        )
                      }
                    >
                      Reschedule
                    </button>

                    <button
                      type="button"
                      className="danger-btn small"
                      onClick={async () => {
                        try {
                          await deleteAppointment(
                            item.id
                          );
                        } catch (
                          error
                        ) {
                          alert(
                            error?.message ||
                              "Could not remove the appointment."
                          );
                        }
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
            }
          )}

          {date &&
            selected.length ===
              0 && (
              <p className="muted">
                No appointments
                for this date.
              </p>
            )}
        </section>
      </div>

      {popupDate &&
        popupAppointments.length >
          0 && (
          <div
            className="appointment-popup-backdrop"
            onClick={
              closePopup
            }
          >
            <div
              className="appointment-popup"
              onClick={(
                event
              ) =>
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
                      `${popupDate}T00:00:00`
                    ).toLocaleDateString(
                      undefined,
                      {
                        month:
                          "long",
                        day:
                          "numeric",
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
                >
                  ×
                </button>
              </div>

              <div className="appointment-popup-search">
                <input
                  className="search-input"
                  type="search"
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
                  placeholder="Search appointments..."
                />
              </div>

              <div className="appointment-popup-list">
                {popupAppointments.map(
                  (
                    appointment
                  ) => {
                    const client =
                      users.find(
                        (
                          item
                        ) =>
                          item.id ===
                          appointment.clientId
                      );

                    return (
                      <div
                        className="appointment-popup-item engineer-appointment-popup-item"
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
                            {
                              appointment.title ||
                              "Validation Appointment"
                            }
                          </strong>

                          <span>
                            {client?.association ||
                              appointment.clientName ||
                              "Association"}
                          </span>

                          <small>
                            Client:{" "}
                            {client?.name ||
                              appointment.clientName ||
                              "Client"}
                          </small>

                          {appointment.location && (
                            <small>
                              Location:{" "}
                              {
                                appointment.location
                              }
                            </small>
                          )}
                        </div>

                        <div className="appointment-popup-actions">
                          <span className="tag">
                            {
                              appointment.status
                            }
                          </span>

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

                          <button
                            type="button"
                            className="danger-btn small"
                            onClick={async () => {
                              try {
                                await deleteAppointment(
                                  appointment.id
                                );

                                if (
                                  popupAppointments.length <=
                                  1
                                ) {
                                  closePopup();
                                }
                              } catch (
                                error
                              ) {
                                alert(
                                  error?.message ||
                                    "Could not remove the appointment."
                                );
                              }
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            </div>
          </div>
        )}

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
                  todayISO()
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