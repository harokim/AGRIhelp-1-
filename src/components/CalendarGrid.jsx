import { useMemo, useState } from "react";
import { todayISO } from "../utils";

export default function CalendarGrid({
  appointments = [],
  blockedDates = [],
  onToggleBlocked,
  engineer = false,
  selectedDate,
  onSelect,
  onAppointmentSelect
}) {
  const [month, setMonth] =
    useState(new Date());

  const year = month.getFullYear();
  const monthIndex = month.getMonth();

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
          length:
            firstDay +
            daysInMonth
        },
        (_, index) =>
          index < firstDay
            ? null
            : index -
              firstDay +
              1
      ),
    [
      firstDay,
      daysInMonth
    ]
  );

  const pad = (number) =>
    String(number).padStart(
      2,
      "0"
    );

  const previousMonth = () => {
    setMonth(
      new Date(
        year,
        monthIndex - 1,
        1
      )
    );
  };

  const nextMonth = () => {
    setMonth(
      new Date(
        year,
        monthIndex + 1,
        1
      )
    );
  };

  return (
    <div className="calendar-wrap">
      <div className="calendar-head">
        <button
          type="button"
          className="secondary-btn calendar-nav-btn"
          onClick={
            previousMonth
          }
          aria-label="Previous month"
        >
          ‹
        </button>

        <h3>
          {month.toLocaleDateString(
            undefined,
            {
              month: "long",
              year: "numeric"
            }
          )}
        </h3>

        <button
          type="button"
          className="secondary-btn calendar-nav-btn"
          onClick={
            nextMonth
          }
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
          <b key={day}>
            {day}
          </b>
        ))}
      </div>

      <div className="calendar-grid">
        {cells.map(
          (day, index) => {
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

            const dayAppointments =
              appointments.filter(
                (appointment) =>
                  appointment.date ===
                    date &&
                  appointment.status !==
                    "Cancelled"
              );

            const unavailable =
              blockedDates.includes(
                date
              );

            const past =
              date < todayISO();

            const selected =
              selectedDate ===
              date;

            const classes = [
              "calendar-day",
              selected
                ? "selected"
                : "",
              unavailable
                ? "blocked"
                : "",
              past
                ? "past"
                : "",
              dayAppointments.length >
              0
                ? "has-appointments"
                : ""
            ]
              .filter(Boolean)
              .join(" ");

            const handleDateClick =
              () => {
                if (
                  dayAppointments.length >
                  0
                ) {
                  onSelect?.(date);
                  return;
                }

                if (engineer) {
                  onToggleBlocked?.(
                    date
                  );

                  return;
                }

                if (
                  unavailable ||
                  past
                ) {
                  return;
                }

                onSelect?.(date);
              };

            return (
              <button
                type="button"
                key={date}
                disabled={
                  !engineer &&
                  (unavailable ||
                    past)
                }
                className={
                  classes
                }
                onClick={
                  handleDateClick
                }
                title={
                  dayAppointments.length >
                  0
                    ? "View appointments"
                    : unavailable
                    ? "Unavailable date"
                    : past
                    ? "Past date"
                    : "Available date"
                }
              >
                <div className="calendar-day-top">
                  <strong>
                    {day}
                  </strong>

                  {unavailable && (
                    <span className="calendar-unavailable-badge">
                      Unavailable
                    </span>
                  )}
                </div>

                {dayAppointments.length >
                  0 && (
                  <small className="calendar-appointment-summary">
                    You have an appointment
                  </small>
                )}
              </button>
            );
          }
        )}
      </div>

      <p className="calendar-help">
        {engineer
          ? "Click a date with an appointment to view its details. Click another date to manage availability."
          : "Dates with appointments show 'You have an appointment'. Click the date to view the appointment details."}
      </p>
    </div>
  );
}