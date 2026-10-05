import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { isStrongPassword } from "../utils";

export default function EngineerSignup() {
  const navigate =
    useNavigate();

  const {
    registerEngineer
  } = useAuth();

  const [form, setForm] =
    useState({
      name: "",
      email: "",
      contactNumber: "",
      password: ""
    });

  const [error, setError] =
    useState("");

  const [busy, setBusy] =
    useState(false);

  const updateField = (
    name,
    value
  ) => {
    setForm(
      (previous) => ({
        ...previous,
        [name]: value
      })
    );

    setError("");
  };

  const isValidEmail = (
    email
  ) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(
      email.trim()
    );

  const isValidName = (
    name
  ) =>
    /^[A-Za-zÑñ .'-]+$/.test(
      name.trim()
    );

  const submit = async (
    event
  ) => {
    event.preventDefault();

    if (busy) {
      return;
    }

    setError("");

    const name =
      form.name.trim();

    const email =
      form.email
        .trim()
        .toLowerCase();

    const contactNumber =
      form.contactNumber
        .replace(/\D/g, "")
        .slice(0, 11);

    if (!name) {
      setError(
        "Please enter your full name."
      );
      return;
    }

    if (!isValidName(name)) {
      setError(
        "Full name contains invalid characters."
      );
      return;
    }

    if (!isValidEmail(email)) {
      setError(
        "Please enter a valid email address."
      );
      return;
    }

    if (
      !/^09\d{9}$/.test(
        contactNumber
      )
    ) {
      setError(
        "Contact number must contain exactly 11 digits and begin with 09."
      );
      return;
    }

    if (
      !isStrongPassword(
        form.password
      )
    ) {
      setError(
        "Password must contain at least 8 characters, including uppercase, lowercase, number, and special character."
      );
      return;
    }

    try {
      setBusy(true);

      await registerEngineer({
        name,
        email,
        contactNumber,
        password:
          form.password,
        profileBio:
          "Municipal Agricultural and Biosystems Engineering Office"
      });

      alert(
        "Engineer account created successfully. Please sign in."
      );

      navigate("/", {
        replace: true
      });
    } catch (error) {
      setError(
        error?.message ||
          "Account creation failed. Please try again."
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="signup-page">
      <div className="signup-shell engineer-signup-shell">
        <section className="signup-intro">
          <button
            type="button"
            className="back-link"
            onClick={() =>
              navigate("/")
            }
          >
            ← Back to login
          </button>

          <div className="signup-logo-mark">
            AG
          </div>

          <span className="signup-intro-label">
            AGRIhelp ADMINISTRATION
          </span>

          <h1>
            Create engineer account
          </h1>

          <p>
            Register an engineer account for the Municipal Agricultural and Biosystems Engineering Office.
          </p>

          <div className="signup-feature-list">
            <div>
              <span>✓</span>
              <p>
                Manage client agricultural requests
              </p>
            </div>

            <div>
              <span>✓</span>
              <p>
                Review documents and request status
              </p>
            </div>

            <div>
              <span>✓</span>
              <p>
                Manage appointments and schedules
              </p>
            </div>

            <div>
              <span>✓</span>
              <p>
                Communicate with registered clients
              </p>
            </div>
          </div>
        </section>

        <section className="signup-card">
          <div className="signup-form-heading">
            <span className="section-label">
              ENGINEER ACCOUNT
            </span>

            <h2>
              Account information
            </h2>

            <p>
              Enter the information below to create an engineer account.
            </p>
          </div>

          {error && (
            <div
              className="signup-form-error"
              role="alert"
            >
              <span>
                {error}
              </span>
            </div>
          )}

          <form
            onSubmit={submit}
            noValidate
          >
            <div className="signup-grid">
              <div className="field">
                <label>
                  Full name *
                </label>

                <input
                  type="text"
                  value={
                    form.name
                  }
                  onChange={(event) =>
                    updateField(
                      "name",
                      event.target
                        .value
                    )
                  }
                  placeholder="Enter full name"
                  autoComplete="name"
                  required
                />
              </div>

              <div className="field">
                <label>
                  Email address *
                </label>

                <input
                  type="email"
                  value={
                    form.email
                  }
                  onChange={(event) =>
                    updateField(
                      "email",
                      event.target
                        .value
                    )
                  }
                  placeholder="example@gmail.com"
                  autoComplete="email"
                  required
                />
              </div>

              <div className="field">
                <label>
                  Contact number *
                </label>

                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={11}
                  minLength={11}
                  value={
                    form.contactNumber
                  }
                  onChange={(event) =>
                    updateField(
                      "contactNumber",
                      event.target
                        .value
                        .replace(
                          /\D/g,
                          ""
                        )
                        .slice(
                          0,
                          11
                        )
                    )
                  }
                  placeholder="09XXXXXXXXX"
                  autoComplete="tel"
                  required
                />
              </div>

              <div className="field">
                <label>
                  Password *
                </label>

                <input
                  type="password"
                  value={
                    form.password
                  }
                  onChange={(event) =>
                    updateField(
                      "password",
                      event.target
                        .value
                    )
                  }
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                  required
                />

                <small>
                  8+ characters with uppercase, lowercase, number, and special character.
                </small>
              </div>
            </div>

            <div className="signup-actions engineer-signup-actions">
              <button
                type="button"
                className="secondary-btn"
                onClick={() =>
                  navigate("/")
                }
                disabled={busy}
              >
                Back to login
              </button>

              <button
                type="submit"
                className="primary-btn"
                disabled={busy}
              >
                {busy
                  ? "Creating account..."
                  : "Create engineer account"}
              </button>
            </div>
          </form>

          <div className="engineer-signup-note">
            Engineer accounts have access to the administrative functions of AGRIhelp.
          </div>
        </section>
      </div>
    </main>
  );
}