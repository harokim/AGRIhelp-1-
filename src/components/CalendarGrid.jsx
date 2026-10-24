import { useMemo } from "react";
import { todayISO } from "../utils";

export default function CalendarGrid({
  appointments = [],
  blockedDates = [],
  onToggleBlocked,
  engineer = false,
  selectedDate,
  onSelect,
  monthState = new Date(),
  onMonthChange
}) {
  const month = monthState;
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const today = todayISO();

  const daysInMonth = new Date(
    year,
    monthIndex + 1,
    0
  ).getDate();

  const firstDay = new Date(
    year,
    monthIndex,
    1
  ).getDay();

  const cells = useMemo(
    () =>
      Array.from(
        {
          length: firstDay + daysInMonth
        },
        (_, index) =>
          index < firstDay
            ? null
            : index - firstDay + 1
      ),
    [firstDay, daysInMonth]
  );

  const pad = (number) =>
    String(number).padStart(2, "0");

  const previousMonth = () => {
    onMonthChange?.(
      new Date(year, monthIndex - 1, 1)
    );
  };

  const nextMonth = () => {
    onMonthChange?.(
      new Date(year, monthIndex + 1, 1)
    );
  };

  const selectedAppointments = appointments.filter(
    (appointment) =>
      appointment.date === selectedDate &&
      appointment.date >= today &&
      appointment.status !== "Cancelled"
  );

  return (
    <div className="calendar-wrap">
      <div className="calendar-head">
        <button
          type="button"
          className="secondary-btn calendar-nav-btn"
          onClick={previousMonth}
          aria-label="Previous month"
        >
          ‹
        </button>

        <h3>
          {month.toLocaleDateString(undefined, {
            month: "long",
            year: "numeric"
          })}
        </h3>

        <button
          type="button"
          className="secondary-btn calendar-nav-btn"
          onClick={nextMonth}
          aria-label="Next month"
        >
          ›
        </button>
      </div>

      <div className="calendar-week">
        {[
          "Sun",
          "Mon",
          "Tue",
          "Wed",
          "Thu",
          "Fri",
          "Sat"
        ].map((day) => (
          <b key={day}>{day}</b>
        ))}
      </div>

      <div className="calendar-grid">
        {cells.map((day, index) => {
          if (!day) {
            return (
              <div
                className="calendar-day empty"
                key={`empty-${index}`}
              />
            );
          }

          const date = `${year}-${pad(
            monthIndex + 1
          )}-${pad(day)}`;

          const past = date < today;

          const dayAppointments = appointments.filter(
            (appointment) =>
              appointment.date === date &&
              appointment.date >= today &&
              appointment.status !== "Cancelled"
          );

          const unavailable =
            !past && blockedDates.includes(date);

          const selected = selectedDate === date;

          const classes = [
            "calendar-day",
            selected ? "selected" : "",
            unavailable ? "blocked" : "",
            past ? "past" : "",
            dayAppointments.length
              ? "has-appointments"
              : ""
          ]
            .filter(Boolean)
            .join(" ");

          const handleClick = () => {
            if (!engineer && (unavailable || past)) {
              return;
            }

            onSelect?.(date);
          };

          return (
            <button
              type="button"
              key={date}
              className={classes}
              onClick={handleClick}
            >
              <div className="calendar-day-top">
                <strong>{day}</strong>

                {unavailable && (
                  <span className="calendar-unavailable-badge">
                    Unavailable
                  </span>
                )}
              </div>

              {dayAppointments
                .slice(0, 2)
                .map((appointment) => (
                  <small
                    key={appointment.id}
                    className="calendar-appointment"
                  >
                    <span>{appointment.time}</span>
                    <span>{appointment.title}</span>
                  </small>
                ))}

              {dayAppointments.length > 2 && (
                <small className="calendar-more">
                  +{dayAppointments.length - 2} more
                </small>
              )}
            </button>
          );
        })}
      </div>

      {selectedDate && (
        <div className="calendar-popup">
          <div className="calendar-popup-header">
            <div>
              <span>SELECTED DATE</span>
              <strong>{selectedDate}</strong>
            </div>

            <button
              type="button"
              className="text-btn"
              onClick={() => onSelect?.("")}
            >
              Close
            </button>
          </div>

          {selectedAppointments.length > 0 ? (
            <div className="calendar-popup-list">
              {selectedAppointments.map((appointment) => (
                <div
                  className="calendar-popup-item"
                  key={appointment.id}
                >
                  <div>
                    <strong>
                      {appointment.title}
                    </strong>

                    <span>{appointment.time}</span>

                    {engineer && (
                      <small>
                        {appointment.clientName || "Client"}
                      </small>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="calendar-popup-empty">
              No upcoming appointments for this date.
            </div>
          )}

          {engineer &&
            onToggleBlocked &&
            selectedDate >= today &&
            !blockedDates.includes(selectedDate) && (
              <button
                type="button"
                className="secondary-btn"
                onClick={() =>
                  onToggleBlocked(selectedDate)
                }
              >
                Mark this date unavailable
              </button>
            )}

          {engineer &&
            onToggleBlocked &&
            selectedDate >= today &&
            blockedDates.includes(selectedDate) && (
              <button
                type="button"
                className="secondary-btn"
                onClick={() =>
                  onToggleBlocked(selectedDate)
                }
              >
                Make this date available
              </button>
            )}
        </div>
      )}

      <p className="calendar-help">
        {engineer
          ? "Click any date to view upcoming appointments. Past appointments and unavailable markers are hidden."
          : "Past dates and unavailable dates cannot be selected."}
      </p>
    </div>
  );
}
