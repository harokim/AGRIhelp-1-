
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./styles.css";
import "./design-overrides.css";
import { AuthProvider } from "./context/AuthContext";
import { RequestProvider } from "./context/RequestContext";
import { AppointmentProvider } from "./context/AppointmentContext";
import { MessageProvider } from "./context/MessageContext";
import { NotificationProvider } from "./context/NotificationContext";
import { ThemeProvider } from "./context/ThemeContext";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
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
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);
