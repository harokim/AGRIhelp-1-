import { useState } from "react";
import { Link } from "react-router-dom";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth, firebaseConfigured } from "../firebase";
import { OFFICE_NAME } from "../utils";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const submit = async (event) => {
    event.preventDefault();

    setMessage("");
    setError("");

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    if (!firebaseConfigured || !auth) {
      setError("Firebase is not configured yet.");
      return;
    }

    setBusy(true);

    try {
      await sendPasswordResetEmail(
        auth,
        email.trim()
      );

      setMessage(
        "A password reset link has been sent to your email. Please check your inbox and follow the instructions to create a new password."
      );

      setEmail("");
    } catch (error) {
      if (error?.code === "auth/invalid-email") {
        setError("Please enter a valid email address.");
      } else {
        setError(
          "We could not send the password reset email. Please check the email address and try again."
        );
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="landing-page">
      <section className="landing-login-section forgot-password-page">
        <div className="login-form-card forgot-password-card">
          <div className="login-form-header">
            <div className="login-form-logo">AG</div>

            <div>
              <h2>Forgot Password?</h2>

              <p>
                Reset your AGRIhelp account password
              </p>
            </div>
          </div>

          <p className="forgot-password-description">
            Enter the email address registered to your
            AGRIhelp account. We will send you a secure
            password reset link.
          </p>

          <form onSubmit={submit}>
            <label htmlFor="reset-email">
              Email Address
            </label>

            <input
              id="reset-email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              autoComplete="email"
              required
            />

            {error && (
              <div className="login-error">
                {error}
              </div>
            )}

            {message && (
              <div className="login-success">
                {message}
              </div>
            )}

            <button
              type="submit"
              className="login-submit-button"
              disabled={busy}
            >
              {busy
                ? "Sending..."
                : "Send Reset Link"}
            </button>
          </form>

          <div className="forgot-password-back">
            <Link to="/">
              Back to Login
            </Link>
          </div>

          <div className="login-office">
            {OFFICE_NAME}
          </div>
        </div>
      </section>
    </main>
  );
}