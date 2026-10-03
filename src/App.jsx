import {
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import Layout from "./components/Layout";
import Login from "./pages/Login";
import ClientSignup from "./pages/ClientSignup";
import EngineerSignup from "./pages/EngineerSignup";
import ClientDashboard from "./pages/ClientDashboard";
import EngineerDashboard from "./pages/EngineerDashboard";
import Requests from "./pages/Requests";
import EngineerRequests from "./pages/EngineerRequests";
import ReportGeneration from "./pages/ReportGeneration";
import RequestReports from "./pages/RequestReports";
import Calendar from "./pages/Calendar";
import Appointments from "./pages/Appointments";
import UserManagement from "./pages/UserManagement";
import ClientMessages from "./pages/ClientMessages";
import EngineerMessages from "./pages/EngineerMessages";
import Profile from "./pages/Profile";
import ProtectedRoute from "./components/ProtectedRoute";
import ForgotPassword from "./pages/ForgotPassword";

const P = ({
  role,
  children,
}) => (
  <ProtectedRoute role={role}>
    <Layout>
      {children}
    </Layout>
  </ProtectedRoute>
);

export default function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={<Login />}
      />


      <Route
        path="/forgot-password"
        element={<ForgotPassword />}
      />

      <Route
        path="/signup"
        element={<ClientSignup />}
      />

      <Route
        path="/engineer-signup"
        element={<EngineerSignup />}
      />

      <Route
        path="/client"
        element={
          <P role="client">
            <ClientDashboard />
          </P>
        }
      />

      <Route
        path="/requests"
        element={
          <P role="client">
            <Requests />
          </P>
        }
      />

      <Route
        path="/client-messages"
        element={
          <P role="client">
            <ClientMessages />
          </P>
        }
      />

      <Route
        path="/engineer"
        element={
          <P role="engineer">
            <EngineerDashboard />
          </P>
        }
      />

      <Route
        path="/engineer-requests"
        element={
          <P role="engineer">
            <EngineerRequests />
          </P>
        }
      />

      <Route
        path="/request-reports"
        element={
          <P role="engineer">
            <RequestReports />
          </P>
        }
      />

      <Route
        path="/reports"
        element={
          <P role="engineer">
            <ReportGeneration />
          </P>
        }
      />

      <Route
        path="/appointments"
        element={
          <P role="engineer">
            <Appointments />
          </P>
        }
      />

      <Route
        path="/engineer-messages"
        element={
          <P role="engineer">
            <EngineerMessages />
          </P>
        }
      />

      <Route
        path="/users"
        element={
          <P role="engineer">
            <UserManagement />
          </P>
        }
      />

      <Route
        path="/calendar"
        element={
          <P>
            <Calendar />
          </P>
        }
      />

      <Route
        path="/profile"
        element={
          <P>
            <Profile />
          </P>
        }
      />

      <Route
        path="*"
        element={
          <Navigate
            to="/"
            replace
          />
        }
      />
    </Routes>
  );
}