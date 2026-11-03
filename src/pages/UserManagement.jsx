
import { useEffect, useState } from "react";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  updateDoc,
  setDoc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";
import { sendPasswordResetEmail } from "firebase/auth";
import { useAuth } from "../context/AuthContext";
import { useAppointments } from "../context/AppointmentContext";
import { auth, db } from "../firebase";
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

function generateTemporaryPassword() {
  const randomValues = new Uint32Array(4);
  crypto.getRandomValues(randomValues);

  const suffix = Array.from(randomValues)
    .map((value) => value.toString(36))
    .join("")
    .slice(0, 18);


  return `Agri!${suffix}9Z`;
}

export default function UserManagement() {
  const {
  users = [],
  user,
  deleteUser,
  registerClientByEngineer,
} = useAuth();
  const { appointments = [] } = useAppointments();

  const [search, setSearch] = useState("");
  const [accountRequests, setAccountRequests] = useState([]);
  const [requestError, setRequestError] = useState("");
  const [loadingRequests, setLoadingRequests] = useState(true);

  const [processingId, setProcessingId] = useState("");
  const [deletingRequestId, setDeletingRequestId] = useState("");
  const [resendingEmailId, setResendingEmailId] = useState("");

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

  
const createAccount = async (request) => {
  if (processingId || deletingRequestId || resendingEmailId) return;

  if (normalizeStatus(request.status) !== "pending") {
    window.alert("This account request is no longer pending.");
    return;
  }

  const currentUser = auth?.currentUser;

  if (!currentUser?.uid || !db) {
    window.alert("Your engineer session is unavailable. Please sign in again.");
    return;
  }

  const email = String(request.email || "").trim().toLowerCase();
  const name = String(request.name || request.fullName || "").trim();
  const contactNumber = String(request.contactNumber || "").replace(/\D/g, "");

  if (!email || !name) {
    window.alert("The account request is missing the applicant's name or email.");
    return;
  }

  if (!/^09\d{9}$/.test(contactNumber)) {
    window.alert("The applicant's contact number must contain 11 digits and start with 09.");
    return;
  }

  const confirmed = window.confirm(
    `Prepare the client account for ${name}?\n\n` +
    `Email: ${email}\n` +
    `Association: ${request.association || "Not provided"}\n\n` +
    "First, create the account manually in Firebase Console > Authentication > Users.\n" +
    "Then copy the new user's UID and enter it when prompted."
  );

  if (!confirmed) return;

  const uid = window.prompt(
    "Enter the UID of the Authentication account you created manually in Firebase Console:"
  );

  if (!uid || !uid.trim()) {
    window.alert("No UID was entered. The request was not changed.");
    return;
  }

  const clientUid = uid.trim();

  setProcessingId(request.id);
  setRequestError("");

  try {
    const engineerSnapshot = await getDoc(
      doc(db, "users", currentUser.uid)
    );

    if (
      !engineerSnapshot.exists() ||
      engineerSnapshot.data().role !== "engineer" ||
      engineerSnapshot.data().status !== "active"
    ) {
      throw new Error("Only an active engineer can approve account requests.");
    }

    const existingProfile = await getDoc(doc(db, "users", clientUid));

    if (existingProfile.exists()) {
      throw new Error(
        "A Firestore user profile already exists for that UID. Check the account before continuing."
      );
    }

    const members = Number(request.members);
    const year =
      request.year === null ||
      request.year === undefined ||
      request.year === ""
        ? null
        : Number(request.year);

    if (!Number.isInteger(members) || members < 0) {
      throw new Error("The request has an invalid association member count.");
    }

    if (year !== null && !Number.isInteger(year)) {
      throw new Error("The request has an invalid association registration year.");
    }

    const profile = {
      name,
      email,
      role: "client",
      contactNumber,
      association: String(request.association || ""),
      address: [
        request.barangay,
        request.municipality,
        request.province,
        request.region
      ].filter(Boolean).join(", "),
      officeAddress: [
        request.barangay,
        request.municipality,
        request.province,
        request.region
      ].filter(Boolean).join(", "),
      barangay: String(request.barangay || ""),
      municipality: String(request.municipality || ""),
      province: String(request.province || ""),
      region: String(request.region || ""),
      position: String(request.position || ""),
      members,
      year,
      status: "active",
      createdBy: currentUser.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    await setDoc(doc(db, "users", clientUid), profile);

    await updateDoc(doc(db, "accountRequests", request.id), {
      status: "approved",
      approvedBy: currentUser.uid,
      approvedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    setAccountRequests((current) =>
      current.map((item) =>
        item.id === request.id
          ? { ...item, status: "approved" }
          : item
      )
    );

    let emailMessage =
      "The client profile was created and the request was approved.";

    try {
      await sendPasswordResetEmail(auth, email);
      emailMessage += "\nA password-reset email was requested.";
    } catch (emailError) {
      console.error("Password-reset email failed:", emailError);
      emailMessage +=
        "\nThe profile and approval succeeded, but the password-reset email could not be sent. Use the resend option to try again.";
    }

    window.alert(
      `${emailMessage}\n\n` +
      `Client UID: ${clientUid}\n` +
      `Email: ${email}`
    );
  } catch (error) {
    console.error("Account approval failed:", error);

    const message =
      error?.code === "permission-denied"
        ? "Firestore denied this operation. Check the published rules and confirm that you are signed in as an active engineer."
        : error?.message || "Unable to finish account approval.";

    setRequestError(message);
    window.alert(message);
  } finally {
    setProcessingId("");
  }
};


  const resendPasswordSetupEmail = async (request) => {
    if (processingId || deletingRequestId || resendingEmailId) return;

    const status = normalizeStatus(request.status);

    if (status !== "approved" && status !== "processed") {
      window.alert(
        "A password-reset email can only be resent after the account has been approved."
      );
      return;
    }

    const email = String(request.email || "").trim().toLowerCase();

    if (!email) {
      window.alert("The applicant does not have a valid email address.");
      return;
    }

    const confirmed = window.confirm(
      `Send a new password-setup email to ${email}?\n\n` +
        "This does not create another account."
    );

    if (!confirmed) return;

    setResendingEmailId(request.id);
    setRequestError("");

    try {
      await sendPasswordResetEmail(auth, email);

      window.alert(
        `A new password-setup email has been sent to ${email}.`
      );
    } catch (error) {
      console.error("Unable to resend password-setup email:", error);

      const message =
        error?.code === "auth/user-not-found"
          ? "No Firebase Authentication account was found for this email."
          : error?.code === "auth/invalid-email"
            ? "The email address is invalid."
            : error?.code === "auth/too-many-requests"
              ? "Too many email requests were made. Wait a while before trying again."
              : error?.message ||
                "Unable to send the password-setup email. Please try again.";

      setRequestError(message);
      window.alert(message);
    } finally {
      setResendingEmailId("");
    }
  };

  const deleteAccountRequest = async (request) => {
    if (processingId || deletingRequestId || resendingEmailId) return;

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
          ? "Permission denied. Confirm that your Firestore rules allow engineers to delete account requests."
          : error?.message ||
            "Unable to delete the account request. Please try again.";

      setRequestError(message);
      window.alert(message);
    } finally {
      setDeletingRequestId("");
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
      console.error("Unable to deactivate user:", error);

      window.alert(
        error?.message || "Could not deactivate this account."
      );
    }
  };

  const handleManualClientCreated = (client) => {
    setManualCreatedClient(client);
    setShowCreateClient(false);
  };

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

  return (
    <div className="container page-container">
      <div className="page-header">
        <span className="eyebrow">ADMINISTRATION</span>
        <h1>User management</h1>
        <p>
          Review account requests, manage registered users, and
          create client accounts.
        </p>
      </div>

      <section className="card account-requests-panel">
        <div className="section-title">
          <div>
            <h2>Create a client account</h2>
            <p>
              Use the manual registration form to create a client account
              directly.
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
              Client registration completed for{" "}
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
                  Share this password-reset link securely with the client.
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
              <p>
  Review pending requests, create the applicant's Authentication
  account manually in Firebase Console, and then finish the approval
  process here. AGRIhelp creates the Firestore profile and requests
  a password-reset email.
</p>
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
                  const isProcessed = status === "processed" || status === "approved";
                  const isProcessing = processingId === request.id;
                  const isDeleting = deletingRequestId === request.id;
                  const isResending = resendingEmailId === request.id;

                  const busy =
                    Boolean(processingId) ||
                    Boolean(deletingRequestId) ||
                    Boolean(resendingEmailId);

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
                                ? "Creating account..."
                                : "Finish account approval"}
                            </button>
                          ) : isProcessed ? (
                            <button
                              className="secondary-btn small"
                              type="button"
                              disabled={busy}
                              onClick={() =>
                                resendPasswordSetupEmail(request)
                              }
                            >
                              {isResending
                                ? "Sending email..."
                                : "Resend password-setup email"}
                            </button>
                          ) : (
                            <span className="muted">
                              {status === "approved"
                                ? "Approved — requires review"
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
                              <span
                                className="delete-spinner"
                                aria-hidden="true"
                              />
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
