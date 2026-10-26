import { useState } from "react";
import { useAppointments } from "../context/AppointmentContext";
import { useAuth } from "../context/AuthContext";
import CalendarGrid from "../components/CalendarGrid";
import { todayISO } from "../utils";

const formatTime12Hour = (value) => {
  if (!value) return "Time not specified";

  const match = String(value).match(
    /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/
  );

  if (match) {
    const hours = Number(match[1]);
    const minutes = Number(match[2]);

    if (hours > 23 || minutes > 59) {
      return String(value);
    }

    const period = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;

    return `${displayHours}:${String(minutes).padStart(2, "0")} ${period}`;
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return String(value);
  }

  return parsedDate.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Manila"
  });
};

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

  const [search, setSearch] = useState("");
  const [date, setDate] = useState("");
  const [popupSearch, setPopupSearch] = useState("");
  const [calendarMonth, setCalendarMonth] = useState(
    () => new Date()
  );

  const isEngineer = user?.role === "engineer";
  const today = todayISO();

  const upcomingAppointments = appointments.filter(
    (appointment) =>
      appointment.date >= today &&
      appointment.status !== "Cancelled"
  );

  const filtered = upcomingAppointments.filter((appointment) => {
    const client = users.find(
      (item) => item.id === appointment.clientId
    );

    const searchText = `
      ${appointment.title || ""}
      ${appointment.clientName || ""}
      ${client?.name || ""}
      ${client?.association || ""}
      ${formatTime12Hour(appointment.time)}
    `.toLowerCase();

    return (
      searchText.includes(search.toLowerCase()) &&
      (date ? appointment.date === date : true)
    );
  });

  const selectedAppointments = date
    ? upcomingAppointments.filter(
        (appointment) => appointment.date === date
      )
    : [];

  const popupAppointments = selectedAppointments.filter(
    (appointment) => {
      const client = users.find(
        (item) => item.id === appointment.clientId
      );

      const searchText = `
        ${appointment.title || ""}
        ${appointment.clientName || ""}
        ${client?.name || ""}
        ${client?.association || ""}
        ${appointment.time || ""}
        ${formatTime12Hour(appointment.time)}
      `.toLowerCase();

      return searchText.includes(popupSearch.toLowerCase());
    }
  );

  const selectedDateUnavailable =
    date &&
    date >= today &&
    blockedDates.includes(date);

  const closePopup = () => {
    setDate("");
    setPopupSearch("");
  };

  return (
    <div className="container page-container calendar-screen">
      <div className="page-header">
        <span className="eyebrow">SCHEDULE</span>

        <h1>Calendar</h1>

        <p>
          View upcoming appointments in a full calendar layout
          and search the schedule.
        </p>
      </div>

      <div className="calendar-status-legend">
        <div>
          <span className="calendar-legend-dot unavailable"></span>
          <span>Unavailable</span>
        </div>

        <div>
          <span className="calendar-legend-dot appointment"></span>
          <span>Appointment</span>
        </div>
      </div>

      <CalendarGrid
        engineer={isEngineer}
        appointments={upcomingAppointments}
        blockedDates={blockedDates.filter(
          (blockedDate) => blockedDate >= today
        )}
        selectedDate={date}
        monthState={calendarMonth}
        onMonthChange={setCalendarMonth}
        onSelect={(selectedDate) => {
          if (selectedDate && selectedDate < today) {
            return;
          }

          setDate(selectedDate);
          setPopupSearch("");
        }}
        onToggleBlocked={
          isEngineer
            ? async (selectedDate) => {
                try {
                  const result = await toggleBlocked(selectedDate);

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
              }
            : undefined
        }
      />

      {selectedDateUnavailable &&
        selectedAppointments.length === 0 && (
          <div className="calendar-unavailable-notice">
            <strong>Unavailable date</strong>

            <span>
              The selected date is currently unavailable for
              appointments.
            </span>
          </div>
        )}

      <div className="calendar-search">
        <input
          className="search-input"
          placeholder="Search upcoming appointments..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

        {date && (
          <button
            type="button"
            className="secondary-btn"
            onClick={closePopup}
          >
            Show all dates
          </button>
        )}
      </div>

      <div className="request-list calendar-results">
        {filtered.map((appointment) => {
          const client = users.find(
            (item) => item.id === appointment.clientId
          );

          return (
            <div
              className="card activity-row"
              key={appointment.id}
            >
              <div>
                <strong>
                  {appointment.title || "Appointment"}
                </strong>

                <span>
                  {appointment.date} ·{" "}
                  {formatTime12Hour(appointment.time)} ·{" "}
                  {client?.name ||
                    appointment.clientName ||
                    "Client"}
                </span>
              </div>

              <span className="tag">
                {client?.association || ""}
              </span>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="empty-state">
            <strong>No matching upcoming appointments.</strong>

            <span>
              Try another search or select a different date.
            </span>
          </div>
        )}
      </div>

      {date && selectedAppointments.length > 0 && (
        <div
          className="appointment-popup-backdrop"
          onClick={closePopup}
        >
          <div
            className="appointment-popup"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="appointment-popup-header">
              <div>
                <span className="eyebrow">APPOINTMENTS</span>

                <h2>
                  {new Date(`${date}T00:00:00`).toLocaleDateString(
                    "en-PH",
                    {
                      timeZone: "Asia/Manila",
                      month: "long",
                      day: "numeric",
                      year: "numeric"
                    }
                  )}
                </h2>
              </div>

              <button
                type="button"
                className="appointment-popup-close"
                onClick={closePopup}
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
                value={popupSearch}
                onChange={(event) =>
                  setPopupSearch(event.target.value)
                }
              />
            </div>

            <div className="appointment-popup-list">
              {popupAppointments.map((appointment) => {
                const client = users.find(
                  (item) => item.id === appointment.clientId
                );

                return (
                  <div
                    className="appointment-popup-item"
                    key={appointment.id}
                  >
                    <div className="appointment-popup-time">
                      {formatTime12Hour(appointment.time)}
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
                              Client: {client.name}
                            </small>
                          )}
                        </>
                      ) : (
                        <span>You have an appointment</span>
                      )}

                      {appointment.location && (
                        <small>
                          Location: {appointment.location}
                        </small>
                      )}

                      {appointment.purpose && (
                        <small>
                          Purpose: {appointment.purpose}
                        </small>
                      )}

                      {appointment.notes && (
                        <small>
                          Notes: {appointment.notes}
                        </small>
                      )}
                    </div>

                    <span className="tag">
                      {appointment.status}
                    </span>
                  </div>
                );
              })}

              {popupAppointments.length === 0 && (
                <div className="empty-state">
                  No matching appointments.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}