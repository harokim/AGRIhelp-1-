
import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./styles.css";
import "./design-overrides.css";
import "./vibrant-theme.css";
import { AuthProvider } from "./context/AuthContext";
import { RequestProvider } from "./context/RequestContext";
import { AppointmentProvider } from "./context/AppointmentContext";
import { MessageProvider } from "./context/MessageContext";
import { NotificationProvider } from "./context/NotificationContext";
import { ThemeProvider } from "./context/ThemeContext";

function AlertProvider({ children }) {
  const [alertMessage, setAlertMessage] = useState(null);

  useEffect(() => {
    const originalAlert = window.alert;

    window.alert = (message) => {
      setAlertMessage(String(message ?? ""));
    };

    return () => {
      window.alert = originalAlert;
    };
  }, []);

  const closeAlert = () => {
    setAlertMessage(null);
  };

  return (
    <>
      {children}

      {alertMessage !== null && (
        <div
          className="agrihelp-alert-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeAlert();
            }
          }}
        >
          <section
            className="agrihelp-alert-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="agrihelp-alert-title"
            aria-describedby="agrihelp-alert-message"
          >
            <div className="agrihelp-alert-header">
              <h2
                className="agrihelp-alert-title"
                id="agrihelp-alert-title"
              >
                <span className="agrihelp-alert-icon">
                  !
                </span>
                AGRIhelp Notification
              </h2>

              <button
                type="button"
                className="agrihelp-alert-close"
                onClick={closeAlert}
                aria-label="Close notification"
              >
                ×
              </button>
            </div>

            <div
              className="agrihelp-alert-content"
              id="agrihelp-alert-message"
            >
              {alertMessage}
            </div>

            <div className="agrihelp-alert-actions">
              <button
                type="button"
                className="agrihelp-alert-button"
                onClick={closeAlert}
                autoFocus
              >
                OK
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <AlertProvider>
          <AuthProvider>
            <RequestProvider>
              <AppointmentProvider>
                <MessageProvider>
                  <NotificationProvider>
                    <App />
                  </NotificationProvider>
                </MessageProvider>
              </AppointmentProvider>
            </RequestProvider>
          </AuthProvider>
        </AlertProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);
