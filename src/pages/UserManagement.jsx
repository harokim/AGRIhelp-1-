
import { useEffect, useState } from "react";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
} from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { useAuth } from "../context/AuthContext";
import { useAppointments } from "../context/AppointmentContext";
import { db } from "../firebase";
import app from "../firebase";
import { initials } from "../utils";
import ClientSignup from "./ClientSignup";

function formatDate(value) {
  if (!value) return "Not available";

  const date = value?.toDate ? value.toDate() : new Date(value);

  if (Number.isNaN(date.getTime())) return "Not available";

  return date.toLocaleString("en-PH", {
    timeZone: "Asia/Manila",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function normalizeStatus(value) {
  return String(value || "unknown").trim().toLowerCase();
}

export default function UserManagement() {
  const { users = [], user, deleteUser } = useAuth();
  const { appointments = [] } = useAppointments();

  const [search, setSearch] = useState("");
  const [accountRequests, setAccountRequests] = useState([]);
  const [requestError, setRequestError] = useState("");
  const [loadingRequests, setLoadingRequests] = useState(true);

  const [processingId, setProcessingId] = useState("");
  const [deletingRequestId, setDeletingRequestId] = useState("");

  const [resetLink, setResetLink] = useState("");
  const [createdEmail, setCreatedEmail] = useState("");
  const [copyMessage, setCopyMessage] = useState("");

  const [showCreateClient, setShowCreateClient] = useState(false);
  const [manualCreatedClient, setManualCreatedClient] = useState(null);

  useEffect(() => {
    if (user?.role !== "engineer" || !db) {
      setAccountRequests([]);
      setLoadingRequests(false);
      return undefined;
    }

    setLoadingRequests(true);
    setRequestError("");

    const unsubscribe = onSnapshot(
      collection(db, "accountRequests"),
      (snapshot) => {
        const requests = snapshot.docs
          .map((document) => ({
            id: document.id,
            ...document.data(),
          }))
          .sort((a, b) => {
            const aTime = a.createdAt?.toDate
              ? a.createdAt.toDate().getTime()
              : 0;
            const bTime = b.createdAt?.toDate
              ? b.createdAt.toDate().getTime()
              : 0;

            return bTime - aTime;
          });

        setAccountRequests(requests);
        setRequestError("");
        setLoadingRequests(false);
      },
      (error) => {
        console.error("Unable to load account requests:", error);

        setRequestError(
          error?.message ||
            "Unable to load account requests. Check your Firestore permissions."
        );

        setLoadingRequests(false);
      }
    );

    return unsubscribe;
  }, [user?.role]);

  if (user?.role !== "engineer") {
    return (
      <div className="container page-container">
        <div className="empty-state">Unauthorized</div>
      </div>
    );
  }

  const pendingRequests = accountRequests.filter(
    (request) => normalizeStatus(request.status) === "pending"
  );

  const list = users
    .filter((item) => normalizeStatus(item.status) !== "inactive")
    .filter((item) => {
      const text = [
        item.name,
        item.email,
        item.association,
        item.barangay,
        item.contactNumber,
        item.role,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return text.includes(search.toLowerCase());
    });

  const createAccount = async (request) => {
    if (processingId || deletingRequestId) return;

    if (normalizeStatus(request.status) !== "pending") {
      window.alert(
        "This request is no longer pending. Refresh the page and check its status."
      );
      return;
    }

    const applicantName =
      request.name || request.fullName || request.email || "this applicant";

    const confirmed = window.confirm(
      `Confirm the account request for ${applicantName}?\n\n` +
        `Email: ${request.email || "Not provided"}\n` +
        `Association: ${request.association || "Not provided"}\n\n` +
        "This will create the client account and process the request."
    );

    if (!confirmed) return;

    setProcessingId(request.id);
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

      const response = await createClientAccount({
        accountRequestId: request.id,
      });

      const result = response.data || {};

      setCreatedEmail(result.email || request.email || "");
      setResetLink(result.passwordResetLink || "");

      if (!result.passwordResetLink) {
        window.alert(
          result.message ||
            "The account was created, but no password-reset link was returned."
        );
      }
    } catch (error) {
      console.error("Account request confirmation failed:", error);

      setRequestError(
        error?.message ||
          "Could not confirm the account request. Please try again."
      );

      window.alert(
        error?.message ||
          "Could not confirm the account request. Please try again."
      );
    } finally {
      setProcessingId("");
    }
  };

  const deleteAccountRequest = async (request) => {
    if (processingId || deletingRequestId) return;

    const applicantName =
      request.name || request.fullName || request.email || "this applicant";

    const confirmed = window.confirm(
      `Delete the account request for ${applicantName}?\n\n` +
        `Email: ${request.email || "Not provided"}\n` +
        `Association: ${request.association || "Not provided"}\n\n` +
        "This permanently deletes the submitted request. This action cannot be undone."
    );

    if (!confirmed) return;

    setDeletingRequestId(request.id);
    setRequestError("");

    try {
      await deleteDoc(doc(db, "accountRequests", request.id));

      setAccountRequests((currentRequests) =>
        currentRequests.filter((item) => item.id !== request.id)
      );
    } catch (error) {
      console.error("Unable to delete account request:", error);

      const message =
        error?.code === "permission-denied"
          ? "Permission denied. Confirm that your Firestore rules allow active engineers to delete account requests."
          : error?.message ||
            "Unable to delete the account request. Please try again.";

      setRequestError(message);
      window.alert(message);
    } finally {
      setDeletingRequestId("");
    }
  };

  const copyResetLink = async () => {
    try {
      await navigator.clipboard.writeText(resetLink);
      setCopyMessage("Password-reset link copied.");
    } catch {
      setCopyMessage(
        "Copy failed. Select the link and copy it manually."
      );
    }
  };

  const deactivateUser = async (id, name) => {
    const confirmed = window.confirm(
      `Deactivate the client account for ${name || "this user"}?`
    );

    if (!confirmed) return;

    try {
      await deleteUser(id);
      window.alert("Client account deactivated successfully.");
    } catch (error) {
      window.alert(
        error?.message || "Could not deactivate this account."
      );
    }
  };

  const handleManualClientCreated = (client) => {
    setManualCreatedClient(client);
    setShowCreateClient(false);
  };

  return (
    <div className="container page-container">
      <div className="page-header">
        <span className="eyebrow">ADMINISTRATION</span>
        <h1>User management</h1>
        <p>
          Create client accounts, confirm submitted account requests, and
          manage registered users.
        </p>
      </div>

      <section className="card account-requests-panel">
        <div className="section-title">
          <div>
            <h2>Create a client account</h2>
            <p>
              Create an account manually without requiring a pending request.
            </p>
          </div>

          <button
            className="primary-btn"
            type="button"
            onClick={() => {
              setManualCreatedClient(null);
              setShowCreateClient(true);
            }}
          >
            Create client account
          </button>
        </div>

        {manualCreatedClient && (
          <div className="success-message" role="status">
            <p>
              Client account created for{" "}
              <strong>
                {manualCreatedClient.name || "the client"}
              </strong>
              {manualCreatedClient.email
                ? ` (${manualCreatedClient.email})`
                : ""}
              .
            </p>

            {manualCreatedClient.passwordResetLink && (
              <div>
                <p>
                  Share the password-reset link securely with the client.
                </p>

                <input
                  type="text"
                  readOnly
                  value={manualCreatedClient.passwordResetLink}
                  aria-label="Manual client password-reset link"
                  onFocus={(event) => event.target.select()}
                />

                <button
                  type="button"
                  className="secondary-btn"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(
                        manualCreatedClient.passwordResetLink
                      );
                      window.alert("Password-reset link copied.");
                    } catch {
                      window.alert(
                        "Unable to copy automatically. Select and copy the link manually."
                      );
                    }
                  }}
                >
                  Copy reset link
                </button>
              </div>
            )}

            <button
              type="button"
              className="text-btn"
              onClick={() => setManualCreatedClient(null)}
            >
              Dismiss
            </button>
          </div>
        )}
      </section>

      {showCreateClient && (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setShowCreateClient(false);
            }
          }}
        >
          <div
            className="modal card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-client-title"
          >
            <div className="modal-header">
              <div>
                <span className="eyebrow">USER MANAGEMENT</span>
                <h2 id="create-client-title">New client account</h2>
              </div>

              <button
                type="button"
                className="text-btn"
                onClick={() => setShowCreateClient(false)}
              >
                Close
              </button>
            </div>

            <ClientSignup
              mode="engineer"
              onCreated={handleManualClientCreated}
              onCancel={() => setShowCreateClient(false)}
            />
          </div>
        </div>
      )}

      <section className="card account-requests-panel">
        <div className="section-title">
          <div>
            <h2>Account requests</h2>
            <p>
              All submitted requests appear here. Requests marked pending
              can be confirmed to create a client account. Use the trash
              button to permanently remove a request.
            </p>
          </div>

          <span className="tag">
            {pendingRequests.length} pending
          </span>
        </div>

        {requestError && (
          <div className="signup-form-error" role="alert">
            {requestError}
          </div>
        )}

        {loadingRequests ? (
          <div className="empty-state">Loading account requests...</div>
        ) : accountRequests.length === 0 ? (
          <div className="empty-state">
            No account requests were found in the accountRequests collection.
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
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {accountRequests.map((request) => {
                  const status = normalizeStatus(request.status);
                  const isPending = status === "pending";
                  const isProcessing = processingId === request.id;
                  const isDeleting = deletingRequestId === request.id;
                  const busy =
                    Boolean(processingId) || Boolean(deletingRequestId);

                  return (
                    <tr key={request.id}>
                      <td>
                        <strong>
                          {request.name ||
                            request.fullName ||
                            "Not provided"}
                        </strong>
                        <small>
                          {request.email || "No email provided"}
                        </small>
                      </td>

                      <td>{request.association || "—"}</td>

                      <td>{request.contactNumber || "—"}</td>

                      <td>{formatDate(request.createdAt)}</td>

                      <td>
                        <span className="tag">
                          {request.status || "Unknown"}
                        </span>
                      </td>

                      <td>
                        <div className="account-request-actions">
                          {isPending ? (
                            <button
                              className="primary-btn small"
                              type="button"
                              disabled={busy}
                              onClick={() => createAccount(request)}
                            >
                              {isProcessing
                                ? "Processing..."
                                : "Confirm account request"}
                            </button>
                          ) : (
                            <span className="muted">
                              {status === "processed" ||
                              status === "approved"
                                ? "Already processed"
                                : "Not pending"}
                            </span>
                          )}

                          <button
                            className="account-request-delete-btn"
                            type="button"
                            title="Delete account request"
                            aria-label={`Delete account request for ${
                              request.name ||
                              request.email ||
                              "this applicant"
                            }`}
                            disabled={busy}
                            onClick={() => deleteAccountRequest(request)}
                          >
                            {isDeleting ? (
                              <span className="delete-spinner" aria-hidden="true" />
                            ) : (
                              <svg
                                viewBox="0 0 24 24"
                                aria-hidden="true"
                                focusable="false"
                              >
                                <path d="M3 6h18" />
                                <path d="M8 6V4h8v2" />
                                <path d="m19 6-1 14H6L5 6" />
                                <path d="M10 11v5" />
                                <path d="M14 11v5" />
                              </svg>
                            )}
                            <span className="delete-button-label">
                              {isDeleting ? "Deleting..." : "Delete"}
                            </span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {resetLink && (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setResetLink("");
            }
          }}
        >
          <div
            className="modal card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reset-link-title"
          >
            <div className="modal-header">
              <div>
                <span className="eyebrow">ACCOUNT CREATED</span>
                <h2 id="reset-link-title">Share password-reset link</h2>
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
              The client account for <strong>{createdEmail}</strong> has been
              created. Share this link securely so the client can set their
              password.
            </p>

            <textarea
              readOnly
              value={resetLink}
              rows={4}
              aria-label="Password-reset link"
              onFocus={(event) => event.target.select()}
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

            {copyMessage && <p role="status">{copyMessage}</p>}
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
        type="search"
        placeholder="Search name, email, association, or barangay..."
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        aria-label="Search registered users"
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
                        initials(item.name || item.email || "?")
                      )}
                    </div>

                    <span>
                      <strong>{item.name || "Unnamed user"}</strong>
                      <small>{item.email || "No email provided"}</small>
                    </span>
                  </div>
                </td>

                <td>
                  <span className="tag">{item.role || "Unknown"}</span>
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
                      onClick={() => deactivateUser(item.id, item.name)}
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
                <td colSpan="6">No users match your search.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
