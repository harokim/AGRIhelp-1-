import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { useAuth } from "../context/AuthContext";
import { useAppointments } from "../context/AppointmentContext";
import { db } from "../firebase";
import app from "../firebase";
import { initials } from "../utils";

function formatDate(value) {
  if (!value) return "Not available";

  const date = value?.toDate ? value.toDate() : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return date.toLocaleDateString("en-PH", {
    timeZone: "Asia/Manila",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function UserManagement() {
  const { users, user, deleteUser } = useAuth();
  const { appointments } = useAppointments();

  const [q, setQ] = useState("");
  const [accountRequests, setAccountRequests] = useState([]);
  const [requestError, setRequestError] = useState("");
  const [processingId, setProcessingId] = useState("");
  const [resetLink, setResetLink] = useState("");
  const [createdEmail, setCreatedEmail] = useState("");
  const [copyMessage, setCopyMessage] = useState("");

  useEffect(() => {
    if (user?.role !== "engineer" || !db) {
      setAccountRequests([]);
      return undefined;
    }

    return onSnapshot(
      collection(db, "accountRequests"),
      (snapshot) => {
        setAccountRequests(
          snapshot.docs
            .map((item) => ({
              id: item.id,
              ...item.data(),
            }))
            .filter(
              (item) =>
                String(item.status || "").toLowerCase() === "pending"
            )
            .sort((a, b) => {
              const aTime = a.createdAt?.toDate
                ? a.createdAt.toDate().getTime()
                : 0;

              const bTime = b.createdAt?.toDate
                ? b.createdAt.toDate().getTime()
                : 0;

              return bTime - aTime;
            })
        );

        setRequestError("");
      },
      (error) => {
        setRequestError(
          error?.message || "Could not load account requests."
        );
      }
    );
  }, [user?.role]);

  if (user?.role !== "engineer") {
    return (
      <div className="container page-container">
        <div className="empty-state">Unauthorized</div>
      </div>
    );
  }

  const list = users
    .filter((item) => item.status !== "inactive")
    .filter((item) =>
      `${item.name || ""} ${item.email || ""} ${
        item.association || ""
      } ${item.barangay || ""}`
        .toLowerCase()
        .includes(q.toLowerCase())
    );

  const remove = async (id) => {
    if (!window.confirm("Deactivate this client account?")) {
      return;
    }

    try {
      await deleteUser(id);
    } catch (error) {
      window.alert(
        error?.message || "Could not deactivate account."
      );
    }
  };

  const createAccount = async (accountRequest) => {
    if (!app) {
      setRequestError("Firebase is not configured.");
      return;
    }

    if (
      !window.confirm(
        `Create a client account for ${accountRequest.association} using ${accountRequest.email}?`
      )
    ) {
      return;
    }

    setProcessingId(accountRequest.id);
    setRequestError("");
    setResetLink("");
    setCreatedEmail("");
    setCopyMessage("");

    try {
      const functions = getFunctions(app, "asia-southeast1");

      const createClientAccount = httpsCallable(
        functions,
        "createClientAccount"
      );

      const result = await createClientAccount({
        accountRequestId: accountRequest.id,
      });

      setResetLink(result.data?.passwordResetLink || "");
      setCreatedEmail(result.data?.email || accountRequest.email);
    } catch (error) {
      setRequestError(
        error?.message || "Could not create the client account."
      );
    } finally {
      setProcessingId("");
    }
  };

  const copyResetLink = async () => {
    try {
      await navigator.clipboard.writeText(resetLink);
      setCopyMessage("Password-reset link copied.");
    } catch {
      setCopyMessage(
        "Copy failed. Select and copy the link manually."
      );
    }
  };

  return (
    <div className="container page-container">
      <div className="page-header">
        <span className="eyebrow">ADMINISTRATION</span>
        <h1>User management</h1>
        <p>
          Review account requests, create approved client accounts, and
          manage registered users.
        </p>
      </div>

      <section className="card account-requests-panel">
        <div className="section-title">
          <div>
            <h2>Pending account requests</h2>
            <p>
              Creating an account will create a client profile and generate
              a password-reset link.
            </p>
          </div>

          <span className="tag">
            {accountRequests.length} pending
          </span>
        </div>

        {requestError && (
          <div className="signup-form-error" role="alert">
            {requestError}
          </div>
        )}

        {accountRequests.length === 0 ? (
          <div className="empty-state">
            There are no pending account requests.
          </div>
        ) : (
          <div className="table-card">
            <table>
              <thead>
                <tr>
                  <th>Applicant</th>
                  <th>Association</th>
                  <th>Contact</th>
                  <th>Submitted</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {accountRequests.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.name || "Not provided"}</strong>
                      <small>{item.email}</small>
                    </td>

                    <td>{item.association || "—"}</td>
                    <td>{item.contactNumber || "—"}</td>
                    <td>{formatDate(item.createdAt)}</td>

                    <td>
                      <button
                        className="primary-btn small"
                        type="button"
                        onClick={() => createAccount(item)}
                        disabled={Boolean(processingId)}
                      >
                        {processingId === item.id
                          ? "Creating..."
                          : "Create account"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {resetLink && (
        <div
          className="modal-backdrop"
          onClick={() => setResetLink("")}
        >
          <div
            className="modal card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reset-link-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <span className="eyebrow">ACCOUNT CREATED</span>
                <h2 id="reset-link-title">
                  Share password-reset link
                </h2>
              </div>

              <button
                type="button"
                className="text-btn"
                onClick={() => setResetLink("")}
              >
                Close
              </button>
            </div>

            <p>
              The client account for <strong>{createdEmail}</strong> has
              been created. Share this link with the client using a secure
              channel so they can set their password.
            </p>

            <textarea
              readOnly
              value={resetLink}
              rows={4}
              aria-label="Password-reset link"
            />

            <div className="form-actions">
              <button
                type="button"
                className="secondary-btn"
                onClick={copyResetLink}
              >
                Copy link
              </button>

              <a
                className="primary-btn"
                href={resetLink}
                target="_blank"
                rel="noreferrer"
              >
                Open reset link
              </a>
            </div>

            {copyMessage && (
              <p role="status">{copyMessage}</p>
            )}
          </div>
        </div>
      )}

      <div className="page-header user-management-users-header">
        <h2>Registered users</h2>
        <p>
          Search registered users and deactivate client accounts.
        </p>
      </div>

      <input
        className="search-input wide-search"
        placeholder="Search name, email, association, or barangay..."
        value={q}
        onChange={(event) => setQ(event.target.value)}
      />

      <div className="table-card card">
        <table>
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Contact</th>
              <th>Association</th>
              <th>Appointments</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {list.map((item) => (
              <tr key={item.id}>
                <td>
                  <div className="table-user">
                    <div className="avatar">
                      {item.avatar ? (
                        <img src={item.avatar} alt="" />
                      ) : (
                        initials(item.name || item.email)
                      )}
                    </div>

                    <span>
                      <strong>
                        {item.name || "Unnamed user"}
                      </strong>
                      <small>{item.email}</small>
                    </span>
                  </div>
                </td>

                <td>
                  <span className="tag">{item.role}</span>
                </td>

                <td>{item.contactNumber || "—"}</td>
                <td>{item.association || "Municipal Office"}</td>

                <td>
                  {
                    appointments.filter(
                      (appointment) => appointment.clientId === item.id
                    ).length
                  }
                </td>

                <td>
                  {item.role === "client" ? (
                    <button
                      className="danger-btn small"
                      type="button"
                      onClick={() => remove(item.id)}
                    >
                      Deactivate
                    </button>
                  ) : (
                    <span className="muted">Protected</span>
                  )}
                </td>
              </tr>
            ))}

            {list.length === 0 && (
              <tr>
                <td colSpan="6">
                  No users match your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}