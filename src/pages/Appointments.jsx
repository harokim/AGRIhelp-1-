import { useState } from "react";
import { useAppointments } from "../context/AppointmentContext";
import { useAuth } from "../context/AuthContext";
import CalendarGrid from "../components/CalendarGrid";
import { todayISO } from "../utils";

export default function Appointments() {
  const {
    appointments,
    blockedDates,
    addAppointment,
    deleteAppointment,
    updateAppointment,
    toggleBlocked
  } = useAppointments();

  const { users, user } = useAuth();

  const [date, setDate] = useState("");

  const [form, setForm] = useState({
    clientId: "",
    time: "",
    title: ""
  });

  const [rescheduleId, setRescheduleId] =
    useState("");

  const [rescheduleForm, setRescheduleForm] =
    useState({
      date: "",
      time: ""
    });

  const submit = async (event) => {
    event.preventDefault();

    try {
      const result = await addAppointment({
        ...form,
        date
      });

      if (result?.error === "time") {
        alert("That time is already booked.");
        return;
      }

      if (result?.error === "blocked") {
        alert("This date is unavailable.");
        return;
      }

      if (result?.error === "past") {
        alert(
          "You cannot create an appointment for a past date."
        );
        return;
      }

      if (result?.error === "date") {
        alert("Please select a date.");
        return;
      }

      setForm({
        clientId: "",
        time: "",
        title: ""
      });

      alert("Appointment created.");
    } catch (error) {
      alert(
        error?.message ||
          "Could not create the appointment."
      );
    }
  };

  const startReschedule = (appointment) => {
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

  const submitReschedule = async (event) => {
    event.preventDefault();

    if (!rescheduleId) {
      return;
    }

    try {
      const result = await updateAppointment(
        rescheduleId,
        {
          date: rescheduleForm.date,
          time: rescheduleForm.time
        }
      );

      if (result?.error === "blocked") {
        alert(
          "This date is unavailable."
        );
        return;
      }

      if (result?.error === "time") {
        alert(
          "That time is already booked."
        );
        return;
      }

      if (result?.error === "past") {
        alert(
          "You cannot reschedule to a past date."
        );
        return;
      }

      if (result?.error === "date") {
        alert("Please select a date.");
        return;
      }

      if (result?.error === "not-found") {
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

  const handleToggleBlocked = async (
    selectedDate
  ) => {
    try {
      const result =
        await toggleBlocked(selectedDate);

      if (result?.error === "appointment") {
        alert(
          "This date already has an appointment and cannot be marked unavailable."
        );
        return;
      }

      if (result?.error === "past") {
        alert(
          "Past dates cannot be marked unavailable."
        );
        return;
      }

      if (result?.error === "date") {
        alert("Please select a valid date.");
      }
    } catch (error) {
      alert(
        error?.message ||
          "Could not update date availability."
      );
    }
  };

  const selected = appointments.filter(
    (item) => item.date === date
  );

  if (user?.role !== "engineer") {
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

        <h1>Appointments</h1>

        <p>
          Select a date, create a slot, or mark a
          non-working day unavailable.
        </p>
      </div>

      <div className="calendar-full card">
        <CalendarGrid
          engineer
          appointments={appointments}
          blockedDates={blockedDates}
          onToggleBlocked={
            handleToggleBlocked
          }
          selectedDate={date}
          onSelect={setDate}
          onAppointmentSelect={
            startReschedule
          }
        />
      </div>

      <div className="two-column">
        <form
          className="card form-card"
          onSubmit={submit}
        >
          <h3>
            Create appointment
          </h3>

          <label>
            Selected date
          </label>

          <input
            type="date"
            min={todayISO()}
            value={date}
            onChange={(event) =>
              setDate(event.target.value)
            }
            required
          />

          <label>
            Client
          </label>

          <select
            value={form.clientId}
            onChange={(event) =>
              setForm({
                ...form,
                clientId:
                  event.target.value
              })
            }
            required
          >
            <option value="">
              Select client
            </option>

            {users
              .filter(
                (item) =>
                  item.role === "client" &&
                  item.status !==
                    "inactive"
              )
              .map((item) => (
                <option
                  value={item.id}
                  key={item.id}
                >
                  {item.name} —{" "}
                  {item.association}
                </option>
              ))}
          </select>

          <label>
            Time
          </label>

          <input
            type="time"
            value={form.time}
            onChange={(event) =>
              setForm({
                ...form,
                time: event.target.value
              })
            }
            required
          />

          <label>
            Appointment title
          </label>

          <input
            value={form.title}
            onChange={(event) =>
              setForm({
                ...form,
                title: event.target.value
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

          {selected.map((item) => {
            const client = users.find(
              (client) =>
                client.id === item.clientId
            );

            return (
              <div
                className="activity-row"
                key={item.id}
              >
                <div>
                  <strong>
                    {item.title}
                  </strong>

                  <span>
                    {item.time} ·{" "}
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
                    onClick={() =>
                      deleteAppointment(
                        item.id
                      )
                    }
                  >
                    Remove
                  </button>
                </div>
              </div>
            );
          })}

          {date &&
            selected.length === 0 && (
              <p className="muted">
                No appointments for this date.
              </p>
            )}
        </section>
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
                min={todayISO()}
                value={
                  rescheduleForm.date
                }
                onChange={(event) =>
                  setRescheduleForm({
                    ...rescheduleForm,
                    date:
                      event.target
                        .value
                  })
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
                onChange={(event) =>
                  setRescheduleForm({
                    ...rescheduleForm,
                    time:
                      event.target
                        .value
                  })
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