import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  addDoc,
  collection,
  serverTimestamp,
} from "firebase/firestore";
import { db, firebaseConfigured } from "../firebase";
import { ASSOCIATIONS } from "../utils";

const PSGC_API = "https://psgc.cloud/api/v2";

const initialForm = {
  name: "",
  email: "",
  contactNumber: "",
  association: "",
  members: "",
  year: "",
  position: "",
  region: "",
  province: "",
  municipality: "",
  barangay: "",
};

function normalizeAssociation(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

async function getLocations(path) {
  const response = await fetch(`${PSGC_API}${path}`);

  if (!response.ok) {
    throw new Error(`Location service returned HTTP ${response.status}.`);
  }

  const json = await response.json();
  return Array.isArray(json.data) ? json.data : [];
}

export default function AccountRequest() {
  const navigate = useNavigate();

  const [form, setForm] = useState(initialForm);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [regions, setRegions] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [municipalities, setMunicipalities] = useState([]);
  const [barangays, setBarangays] = useState([]);

  const [regionCode, setRegionCode] = useState("");
  const [provinceCode, setProvinceCode] = useState("");
  const [municipalityCode, setMunicipalityCode] = useState("");

  const [loadingRegions, setLoadingRegions] = useState(true);
  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadingMunicipalities, setLoadingMunicipalities] = useState(false);
  const [loadingBarangays, setLoadingBarangays] = useState(false);
  const [locationError, setLocationError] = useState("");


  useEffect(() => {
    let active = true;

    async function loadRegions() {
      setLoadingRegions(true);
      setLocationError("");

      try {
        const data = await getLocations("/regions");

        if (active) {
          setRegions(data);
        }
      } catch (err) {
        console.error("Failed to load regions:", err);

        if (active) {
          setLocationError(
            "Unable to load regions. Check your internet connection and try again."
          );
        }
      } finally {
        if (active) {
          setLoadingRegions(false);
        }
      }
    }

    loadRegions();

    return () => {
      active = false;
    };
  }, []);


  useEffect(() => {
    if (!regionCode) {
      setProvinces([]);
      setMunicipalities([]);
      setBarangays([]);
      setProvinceCode("");
      setMunicipalityCode("");
      setLoadingProvinces(false);
      setLoadingMunicipalities(false);
      return;
    }

    let active = true;

    async function loadProvinces() {
      setLoadingProvinces(true);
      setLoadingMunicipalities(false);
      setLocationError("");

      setProvinces([]);
      setMunicipalities([]);
      setBarangays([]);
      setProvinceCode("");
      setMunicipalityCode("");

      try {
        const data = await getLocations(
          `/regions/${regionCode}/provinces`
        );

        if (!active) return;

        setProvinces(data);

        
        if (data.length === 0) {
          setLoadingMunicipalities(true);

          const directMunicipalities = await getLocations(
            `/regions/${regionCode}/cities-municipalities`
          );

          if (active) {
            setMunicipalities(directMunicipalities);
          }
        }
      } catch (err) {
        console.error("Failed to load provinces:", err);

        if (active) {
          setLocationError(
            "Unable to load locations for the selected region. Please try selecting the region again."
          );
        }
      } finally {
        if (active) {
          setLoadingProvinces(false);
          setLoadingMunicipalities(false);
        }
      }
    }

    loadProvinces();

    return () => {
      active = false;
    };
  }, [regionCode]);


  useEffect(() => {
    if (!regionCode || !provinceCode || provinces.length === 0) {
      return;
    }

    let active = true;

    async function loadMunicipalities() {
      setLoadingMunicipalities(true);
      setLocationError("");

      setMunicipalities([]);
      setBarangays([]);
      setMunicipalityCode("");

      try {
        const data = await getLocations(
          `/regions/${regionCode}/provinces/${provinceCode}/cities-municipalities`
        );

        if (active) {
          setMunicipalities(data);
        }
      } catch (err) {
        console.error("Failed to load municipalities:", err);

        if (active) {
          setLocationError(
            "Unable to load municipalities or cities. Please select the province again."
          );
        }
      } finally {
        if (active) {
          setLoadingMunicipalities(false);
        }
      }
    }

    loadMunicipalities();

    return () => {
      active = false;
    };
  }, [regionCode, provinceCode, provinces.length]);


  useEffect(() => {
    if (!municipalityCode) {
      setBarangays([]);
      setLoadingBarangays(false);
      return;
    }

    let active = true;

    async function loadBarangays() {
      setLoadingBarangays(true);
      setLocationError("");
      setBarangays([]);

      try {
        const data = await getLocations(
          `/cities-municipalities/${municipalityCode}/barangays`
        );

        if (active) {
          setBarangays(data);
        }
      } catch (err) {
        console.error("Failed to load barangays:", err);

        if (active) {
          setLocationError(
            "Unable to load barangays for the selected city or municipality. Please try again."
          );
        }
      } finally {
        if (active) {
          setLoadingBarangays(false);
        }
      }
    }

    loadBarangays();

    return () => {
      active = false;
    };
  }, [municipalityCode]);

  const update = (event) => {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]:
        name === "contactNumber"
          ? value.replace(/\D/g, "").slice(0, 11)
          : value,
    }));

    setError("");
  };

  const selectRegion = (event) => {
    const code = event.target.value;
    const selected = regions.find((item) => item.code === code);

    setRegionCode(code);
    setProvinceCode("");
    setMunicipalityCode("");
    setProvinces([]);
    setMunicipalities([]);
    setBarangays([]);
    setLocationError("");
    setError("");

    setForm((current) => ({
      ...current,
      region: selected?.name || "",
      province: "",
      municipality: "",
      barangay: "",
    }));
  };

  const selectProvince = (event) => {
    const code = event.target.value;
    const selected = provinces.find((item) => item.code === code);

    setProvinceCode(code);
    setMunicipalityCode("");
    setMunicipalities([]);
    setBarangays([]);
    setLocationError("");
    setError("");

    setForm((current) => ({
      ...current,
      province: selected?.name || "",
      municipality: "",
      barangay: "",
    }));
  };

  const selectMunicipality = (event) => {
    const code = event.target.value;
    const selected = municipalities.find((item) => item.code === code);

    setMunicipalityCode(code);
    setBarangays([]);
    setLocationError("");
    setError("");

    setForm((current) => ({
      ...current,
      municipality: selected?.name || "",
      barangay: "",
    }));
  };

  const selectBarangay = (event) => {
    const code = event.target.value;
    const selected = barangays.find((item) => item.code === code);

    setForm((current) => ({
      ...current,
      barangay: selected?.name || "",
    }));

    setError("");
  };

  async function submit(event) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (busy) return;

    if (!firebaseConfigured || !db) {
      setError("Firebase is not configured. Check your .env settings.");
      return;
    }

    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();
    const contactNumber = form.contactNumber.replace(/\D/g, "");
    const association = form.association.trim();

    if (!name) {
      setError("Enter your full name.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Enter a valid email address.");
      return;
    }

    if (!/^09\d{9}$/.test(contactNumber)) {
      setError(
        "Association’s contact number must start with 09 and contain exactly 11 digits."
      );
      return;
    }

    if (!association) {
      setError("Select your association.");
      return;
    }

    if (!form.position) {
      setError("Select your position in the association.");
      return;
    }

    if (!form.region || !form.municipality || !form.barangay) {
      setError(
        "Select your region, municipality/city, and barangay."
      );
      return;
    }

  
    if (provinces.length > 0 && !form.province) {
      setError("Select your province.");
      return;
    }

    if (form.year) {
      const year = Number(form.year);

      if (
        !Number.isInteger(year) ||
        year < 1900 ||
        year > new Date().getFullYear()
      ) {
        setError("Enter a valid association registration year.");
        return;
      }
    }

    if (form.members) {
      const members = Number(form.members);

      if (!Number.isInteger(members) || members < 1) {
        setError(
          "Number of members must be a whole number of at least 1."
        );
        return;
      }
    }

    setBusy(true);

    try {
      const payload = {
        name,
        email,
        contactNumber,
        association,
        associationKey: normalizeAssociation(association),
        members: Number(form.members) || 0,
        year: Number(form.year) || null,
        position: form.position.trim(),
        region: form.region.trim(),
        province: form.province.trim(),
        municipality: form.municipality.trim(),
        barangay: form.barangay.trim(),
        status: "pending",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await addDoc(collection(db, "accountRequests"), payload);

      setSuccess(
        "Your account request was submitted successfully. The office will review your request before an account is created."
      );

      setForm({ ...initialForm });
      setRegionCode("");
      setProvinceCode("");
      setMunicipalityCode("");
      setProvinces([]);
      setMunicipalities([]);
      setBarangays([]);
      setLocationError("");
    } catch (err) {
      console.error("Account request submission failed:", err);

      if (err?.code === "permission-denied") {
        setError(
          "Permission denied. Check that your Firestore rules have been published."
        );
      } else if (err?.code === "unavailable") {
        setError(
          "The service is temporarily unavailable. Check your connection and try again."
        );
      } else {
        setError(
          err?.message ||
            "Could not submit the account request. Please try again."
        );
      }
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

          <p>
            Each association should have only one active client account.
          </p>
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

          {locationError && (
            <div className="signup-form-error" role="alert">
              {locationError}
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
              maxLength={150}
            />

            <Field
              label="Email address *"
              name="email"
              type="email"
              value={form.email}
              onChange={update}
              required
              autoComplete="email"
              maxLength={254}
            />

            <Field
              label="Association’s contact no. *"
              name="contactNumber"
              value={form.contactNumber}
              onChange={update}
              required
              inputMode="numeric"
              maxLength={11}
              placeholder="09XXXXXXXXX"
              autoComplete="tel"
            />

            <div className="field">
              <label htmlFor="association">Association *</label>
              <select
                id="association"
                name="association"
                value={form.association}
                onChange={update}
                required
              >
                <option value="">Select association</option>
                {(Array.isArray(ASSOCIATIONS) ? ASSOCIATIONS : []).map(
                  (item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  )
                )}
              </select>
            </div>

            <Field
              label="Number of members"
              name="members"
              type="number"
              min="1"
              step="1"
              value={form.members}
              onChange={update}
            />

            <Field
              label="Association registration year"
              name="year"
              type="number"
              min="1900"
              max={new Date().getFullYear()}
              step="1"
              value={form.year}
              onChange={update}
            />

            <div className="field">
              <label htmlFor="position">Position in association *</label>
              <select
                id="position"
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
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <LocationSelect
              id="region"
              label="Region *"
              value={regionCode}
              onChange={selectRegion}
              items={regions}
              loading={loadingRegions}
              placeholder="Select region"
              required
            />

            <LocationSelect
              id="province"
              label="Province"
              value={provinceCode}
              onChange={selectProvince}
              items={provinces}
              loading={loadingProvinces}
              placeholder={
                regionCode && !loadingProvinces && provinces.length === 0
                  ? "No province required"
                  : "Select province"
              }
              disabled={
                !regionCode ||
                loadingProvinces ||
                provinces.length === 0
              }
              required={provinces.length > 0}
            />

            <LocationSelect
              id="municipality"
              label="Municipality / City *"
              value={municipalityCode}
              onChange={selectMunicipality}
              items={municipalities}
              loading={loadingMunicipalities}
              placeholder="Select municipality / city"
              disabled={
                !regionCode ||
                loadingMunicipalities ||
                (provinces.length > 0 && !provinceCode)
              }
              required
            />

            <LocationSelect
              id="barangay"
              label="Barangay *"
              value={
                barangays.find((item) => item.name === form.barangay)?.code ||
                ""
              }
              onChange={selectBarangay}
              items={barangays}
              loading={loadingBarangays}
              placeholder="Select barangay"
              disabled={
                !municipalityCode ||
                loadingBarangays ||
                barangays.length === 0
              }
              required
            />
          </div>

          <p className="muted">
            Do not enter a password here. Your request must be reviewed
            before a client account is created.
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

function LocationSelect({
  id,
  label,
  value,
  onChange,
  items,
  loading = false,
  placeholder,
  disabled = false,
  required = false,
}) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        value={value}
        onChange={onChange}
        disabled={disabled || loading}
        required={required}
      >
        <option value="">
          {loading ? "Loading..." : placeholder}
        </option>

        {items.map((item) => (
          <option key={item.code} value={item.code}>
            {item.name}
          </option>
        ))}
      </select>
    </div>
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
  step,
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
        step={step}
      />
    </div>
  );
}