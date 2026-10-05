import { useState } from "react";
import { Link } from "react-router-dom";
import {
  sendPasswordResetEmail
} from "firebase/auth";
import {
  auth,
  firebaseConfigured
} from "../firebase";
import { OFFICE_NAME } from "../utils";

export default function ForgotPassword() {
  const [email, setEmail] =
    useState("");

  const [busy, setBusy] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  const submit = async (
    event
  ) => {
    event.preventDefault();

    setMessage("");
    setError("");

    const cleanEmail =
      email.trim().toLowerCase();

    if (!cleanEmail) {
      setError(
        "Please enter your email address."
      );
      return;
    }

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(
        cleanEmail
      )
    ) {
      setError(
        "Please enter a valid email address."
      );
      return;
    }

    if (
      !firebaseConfigured ||
      !auth
    ) {
      setError(
        "The system is not configured correctly."
      );
      return;
    }

    setBusy(true);

    try {
      await sendPasswordResetEmail(
        auth,
        cleanEmail
      );

      setMessage(
        "If an AGRIhelp account exists for this email address, a password reset link has been sent. Please check your inbox and spam folder."
      );

      setEmail("");
    } catch (error) {
      if (
        error?.code ===
        "auth/invalid-email"
      ) {
        setError(
          "Please enter a valid email address."
        );
      } else if (
        error?.code ===
        "auth/network-request-failed"
      ) {
        setError(
          "Network error. Please check your internet connection and try again."
        );
      } else if (
        error?.code ===
        "auth/too-many-requests"
      ) {
        setError(
          "Too many reset attempts. Please wait and try again later."
        );
      } else {
        setError(
          "The password reset request could not be completed. Please try again."
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
            <div className="login-form-logo">
              AG
            </div>

            <div>
              <h2>
                Forgot Password?
              </h2>

              <p>
                Reset your AGRIhelp account password
              </p>
            </div>
          </div>

          <p className="forgot-password-description">
            Enter the email address registered to your AGRIhelp account. If an account exists, Firebase will send a secure password reset link.
          </p>

          <form onSubmit={submit}>
            <label>
              Email Address
            </label>

            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(event) =>
                setEmail(
                  event.target.value
                )
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