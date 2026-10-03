import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useMessages } from "../context/MessageContext";
import { useAppointments } from "../context/AppointmentContext";
import { useRequests } from "../context/RequestContext";
import { initials } from "../utils";

export default function Sidebar({
  collapsed = false,
  setCollapsed = () => {},
  mobileOpen = false,
  setMobileOpen = () => {}
}) {
  const { user, logout } = useAuth();

  const {
    unreadMessageCount
  } = useMessages();

  const {
    unreadAppointmentCount,
    markAppointmentNotificationsAsRead
  } = useAppointments();

  const {
    newRequestCount,
    markRequestsAsViewed
  } = useRequests();

  const navigate = useNavigate();

  const [darkMode, setDarkMode] =
    useState(() => {
      if (
        typeof window ===
        "undefined"
      ) {
        return false;
      }

      return (
        localStorage.getItem(
          "theme"
        ) === "dark"
      );
    });

  useEffect(() => {
    document.documentElement.setAttribute(
      "data-theme",
      darkMode ? "dark" : "light"
    );

    localStorage.setItem(
      "theme",
      darkMode ? "dark" : "light"
    );
  }, [darkMode]);

  if (!user) {
    return null;
  }

  const links =
    user.role === "engineer"
      ? [
          [
            "/engineer",
            "⌂",
            "Dashboard"
          ],
          [
            "/engineer-requests",
            "▣",
            "Client Requests"
          ],
          [
            "/request-reports",
            "▤",
            "Request Reports"
          ],
          [
            "/reports",
            "▥",
            "Documents Report"
          ],
          [
            "/appointments",
            "◷",
            "Appointments"
          ],
          [
            "/engineer-messages",
            "✉",
            "Messages"
          ],
          [
            "/users",
            "♙",
            "User Management"
          ]
        ]
      : [
          [
            "/client",
            "⌂",
            "Dashboard"
          ],
          [
            "/requests",
            "▣",
            "My Requests"
          ],
          [
            "/calendar",
            "▦",
            "Calendar"
          ],
          [
            "/client-messages",
            "✉",
            "Messages"
          ]
        ];

  const getNotificationCount = (
    to
  ) => {
    if (
      to ===
        "/client-messages" ||
      to ===
        "/engineer-messages"
    ) {
      return unreadMessageCount;
    }

    if (
      to ===
      "/engineer-requests"
    ) {
      return newRequestCount;
    }

    if (
      to === "/appointments"
    ) {
      return unreadAppointmentCount;
    }

    return 0;
  };

  const handleNavigation =
    async (to) => {
      if (
        to ===
        "/engineer-requests"
      ) {
        await markRequestsAsViewed();
      }

      if (
        to ===
        "/appointments"
      ) {
        await markAppointmentNotificationsAsRead();
      }

      setMobileOpen(false);
    };

  const handleLogout =
    async () => {
      await logout();
      navigate("/", {
        replace: true
      });
    };

  return (
    <aside
      className={`sidebar ${
        collapsed
          ? "collapsed"
          : ""
      } ${
        mobileOpen
          ? "mobile-open"
          : ""
      }`}
    >
      <div className="sidebar-inner">
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <span className="sidebar-brand-mark">
              AG
            </span>

            <span className="sidebar-brand-text">
              <strong>
                AGRIhelp
              </strong>

              <span>
                Agricultural Service
              </span>
            </span>
          </div>

          <button
            type="button"
            className="sidebar-toggle"
            onClick={() =>
              setCollapsed(
                (current) =>
                  !current
              )
            }
            aria-label={
              collapsed
                ? "Expand sidebar"
                : "Collapse sidebar"
            }
            title={
              collapsed
                ? "Expand sidebar"
                : "Collapse sidebar"
            }
          >
            {collapsed
              ? "›"
              : "‹"}
          </button>
        </div>

        <nav className="sidebar-nav">
          {links.map(
            ([
              to,
              icon,
              label
            ]) => {
              const notificationCount =
                getNotificationCount(
                  to
                );

              return (
                <NavLink
                  key={to}
                  to={to}
                  end={
                    to ===
                      "/client" ||
                    to ===
                      "/engineer"
                  }
                  onClick={() =>
                    handleNavigation(
                      to
                    )
                  }
                  className={({
                    isActive
                  }) =>
                    `nav-item ${
                      isActive
                        ? "active"
                        : ""
                    }`
                  }
                  title={
                    collapsed
                      ? `${label}${
                          notificationCount >
                          0
                            ? ` (${notificationCount} new)`
                            : ""
                        }`
                      : undefined
                  }
                >
                  <span className="nav-icon">
                    {icon}
                  </span>

                  <span className="nav-label">
                    {label}
                  </span>

                  {notificationCount >
                    0 && (
                    <span className="nav-notification">
                      {notificationCount >
                      9
                        ? "9+"
                        : notificationCount}
                    </span>
                  )}
                </NavLink>
              );
            }
          )}
        </nav>

        <div className="sidebar-bottom">
          <button
            type="button"
            className="theme-toggle"
            onClick={() =>
              setDarkMode(
                (current) =>
                  !current
              )
            }
            title={
              darkMode
                ? "Switch to light mode"
                : "Switch to dark mode"
            }
          >
            <span className="theme-icon">
              {darkMode
                ? "☀"
                : "☾"}
            </span>

            <span className="theme-label">
              {darkMode
                ? "Light Mode"
                : "Dark Mode"}
            </span>
          </button>

          <button
            type="button"
            className="user-mini"
            onClick={() => {
              navigate(
                "/profile"
              );
              setMobileOpen(
                false
              );
            }}
            title="View profile"
          >
            <span className="avatar">
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt=""
                />
              ) : (
                initials(
                  user.name ||
                    user.email
                )
              )}
            </span>

            <span className="user-details">
              <strong>
                {user.name ||
                  "User"}
              </strong>

              <small>
                {user.role}
              </small>
            </span>
          </button>

          <button
            type="button"
            className="logout-btn"
            onClick={
              handleLogout
            }
          >
            <span>↪</span>

            <strong>
              Sign out
            </strong>
          </button>
        </div>
      </div>
    </aside>
  );
}