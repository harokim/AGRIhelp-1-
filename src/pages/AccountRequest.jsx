import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getFunctions, httpsCallable } from "firebase/functions";
import app, { firebaseConfigured } from "../firebase";
import { ASSOCIATIONS } from "../utils";

const initialForm = {
  name: "",
  email: "",
  contactNumber: "",
  association: "",
  birthday: "",
  civilStatus: "",
  members: "",
  year: "",
  position: "",
  region: "",
  province: "",
  municipality: "",
  barangay: "",
};

export default function AccountRequest() {
  const navigate = useNavigate();

  const [form, setForm] = useState(initialForm);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const update = (event) => {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]:
        name === "contactNumber"
          ? value.replace(/\D/g, "").slice(0, 11)
          : value,
    }));
  };

  async function submit(event) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!firebaseConfigured || !app) {
      setError("Firebase is not configured. Check your .env settings.");
      return;
    }

    if (form.contactNumber.length !== 11) {
      setError("Contact number must contain exactly 11 digits.");
      return;
    }

    if (
      !form.association ||
      !form.position ||
      !form.region ||
      !form.province ||
      !form.municipality ||
      !form.barangay
    ) {
      setError("Complete all required association and address fields.");
      return;
    }

    if (
      form.year &&
      (
        Number(form.year) < 1900 ||
        Number(form.year) > new Date().getFullYear()
      )
    ) {
      setError("Enter a valid association registration year.");
      return;
    }

    if (form.members && Number(form.members) < 1) {
      setError("Number of members must be at least 1.");
      return;
    }

    setBusy(true);

    try {
      const functions = getFunctions(app, "asia-southeast1");

      const submitAccountRequest = httpsCallable(
        functions,
        "submitAccountRequest"
      );

      const result = await submitAccountRequest({
        ...form,
        members: Number(form.members) || 0,
        year: Number(form.year) || null,
      });

      setSuccess(
        result.data?.message ||
          "Your account request was submitted. The office will review it before an account is created."
      );

      setForm(initialForm);
    } catch (err) {
      setError(
        err?.message ||
          "Could not submit the account request. Please try again."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="signup-page">
      <div className="signup-shell">
        <section className="signup-intro">
          <button
            type="button"
            className="back-link"
            onClick={() => navigate("/")}
          >
            ← Back to sign in
          </button>

          <span className="eyebrow">AGRIhelp CLIENT ACCESS</span>

          <h1>Request an account</h1>

          <p>
            Submit your association details for review by the agricultural
            engineering office. An account is created only after an engineer
            approves your request.
          </p>

          <p>Each association may have only one active client account.</p>
        </section>

        <form className="signup-card" onSubmit={submit}>
          <div className="signup-card-header">
            <h2>Account request form</h2>
            <p>Fields marked * are required.</p>
          </div>

          {error && (
            <div className="signup-form-error" role="alert">
              {error}
            </div>
          )}

          {success && (
            <div className="success-message" role="status">
              {success}
            </div>
          )}

          <div className="form-grid">
            <Field
              label="Full name *"
              name="name"
              value={form.name}
              onChange={update}
              required
              autoComplete="name"
            />

            <Field
              label="Email address *"
              name="email"
              type="email"
              value={form.email}
              onChange={update}
              required
              autoComplete="email"
            />

            <Field
              label="Contact number *"
              name="contactNumber"
              value={form.contactNumber}
              onChange={update}
              required
              inputMode="numeric"
              maxLength={11}
              placeholder="09XXXXXXXXX"
            />

            <div className="field">
              <label>Association *</label>

              <select
                name="association"
                value={form.association}
                onChange={update}
                required
              >
                <option value="">Select association</option>

                {ASSOCIATIONS.map((association) => (
                  <option key={association} value={association}>
                    {association}
                  </option>
                ))}
              </select>
            </div>

            <Field
              label="Birthday"
              name="birthday"
              type="date"
              value={form.birthday}
              onChange={update}
              max={new Date().toISOString().slice(0, 10)}
            />

            <div className="field">
              <label>Civil status</label>

              <select
                name="civilStatus"
                value={form.civilStatus}
                onChange={update}
              >
                <option value="">Select an option</option>

                {["Single", "Married", "Widowed", "Separated"].map(
                  (item) => (
                    <option key={item}>{item}</option>
                  )
                )}
              </select>
            </div>

            <Field
              label="Number of members"
              name="members"
              type="number"
              min="1"
              value={form.members}
              onChange={update}
            />

            <Field
              label="Association registration year"
              name="year"
              type="number"
              min="1900"
              max={new Date().getFullYear()}
              value={form.year}
              onChange={update}
            />

            <div className="field">
              <label>Position in association *</label>

              <select
                name="position"
                value={form.position}
                onChange={update}
                required
              >
                <option value="">Select position</option>

                {[
                  "President",
                  "Vice President",
                  "Secretary",
                  "Treasurer",
                  "Representative",
                  "Other",
                ].map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </div>

            <Field
              label="Region *"
              name="region"
              value={form.region}
              onChange={update}
              required
            />

            <Field
              label="Province *"
              name="province"
              value={form.province}
              onChange={update}
              required
            />

            <Field
              label="Municipality / City *"
              name="municipality"
              value={form.municipality}
              onChange={update}
              required
            />

            <Field
              label="Barangay *"
              name="barangay"
              value={form.barangay}
              onChange={update}
              required
            />
          </div>

          <p className="muted">
            Do not enter a password here. If the request is approved, the
            engineer will create the account and provide a secure
            password-reset link.
          </p>

          <div className="form-actions">
            <button
              type="button"
              className="secondary-btn"
              onClick={() => navigate("/")}
              disabled={busy}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="primary-btn"
              disabled={busy}
            >
              {busy ? "Submitting..." : "Submit account request"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

function Field({
  label,
  name,
  type = "text",
  value,
  onChange,
  required = false,
  inputMode,
  min,
  max,
  maxLength,
  placeholder,
  autoComplete,
}) {
  return (
    <div className="field">
      <label htmlFor={name}>{label}</label>

      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        required={required}
        inputMode={inputMode}
        min={min}
        max={max}
        maxLength={maxLength}
        placeholder={placeholder}
        autoComplete={autoComplete}
      />
    </div>
  );
}