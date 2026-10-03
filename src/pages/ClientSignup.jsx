import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ASSOCIATIONS } from "../utils";

const PSGC_API = "https://psgc.cloud/api/v2";

const empty = {
  firstName: "",
  middleName: "",
  lastName: "",
  birthday: "",
  civilStatus: "",
  contactNumber: "",
  email: "",
  password: "",
  association: "",
  members: "",
  year: "",
  position: "",
  region: "",
  province: "",
  municipality: "",
  barangay: "",
};

async function getLocations(path) {
  const response = await fetch(`${PSGC_API}${path}`);

  if (!response.ok) {
    throw new Error(
      "Unable to load Philippine location data."
    );
  }

  const json = await response.json();

  return json.data || [];
}

export default function ClientSignup() {
  const navigate = useNavigate();
  const { registerClient } = useAuth();

  const [step, setStep] = useState(1);
  const [form, setForm] = useState(empty);
  const [regions, setRegions] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [municipalities, setMunicipalities] = useState([]);
  const [barangays, setBarangays] = useState([]);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [formError, setFormError] = useState("");
  const [creatingAccount, setCreatingAccount] = useState(false);

  const updateField = (name, value) => {
    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setFormError("");
  };

  const calculateAge = (birthday) => {
    if (!birthday) return "";

    const birthDate = new Date(
      `${birthday}T00:00:00`
    );

    const today = new Date();

    let calculatedAge =
      today.getFullYear() -
      birthDate.getFullYear();

    const monthDifference =
      today.getMonth() -
      birthDate.getMonth();

    if (
      monthDifference < 0 ||
      (
        monthDifference === 0 &&
        today.getDate() < birthDate.getDate()
      )
    ) {
      calculatedAge--;
    }

    return calculatedAge;
  };

  const age = calculateAge(form.birthday);

  useEffect(() => {
    let mounted = true;

    async function loadRegions() {
      try {
        setLoadingLocations(true);
        setLocationError("");

        const data =
          await getLocations("/regions");

        if (mounted) {
          setRegions(data);
        }
      } catch {
        if (mounted) {
          setLocationError(
            "Philippine address data could not be loaded. Please check your internet connection."
          );
        }
      } finally {
        if (mounted) {
          setLoadingLocations(false);
        }
      }
    }

    loadRegions();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!form.region) {
      setProvinces([]);
      setMunicipalities([]);
      setBarangays([]);
      return;
    }

    const selectedRegion =
      regions.find(
        (region) =>
          region.name === form.region
      );

    if (!selectedRegion) return;

    let mounted = true;

    async function loadProvinces() {
      try {
        setLoadingLocations(true);
        setLocationError("");

        const data =
          await getLocations(
            `/regions/${encodeURIComponent(
              selectedRegion.code
            )}/provinces`
          );

        if (mounted) {
          setProvinces(data);
        }
      } catch {
        if (mounted) {
          setLocationError(
            "Unable to load provinces for the selected region."
          );
        }
      } finally {
        if (mounted) {
          setLoadingLocations(false);
        }
      }
    }

    loadProvinces();

    return () => {
      mounted = false;
    };
  }, [form.region, regions]);

  useEffect(() => {
    if (
      !form.region ||
      !form.province
    ) {
      setMunicipalities([]);
      setBarangays([]);
      return;
    }

    const selectedRegion =
      regions.find(
        (region) =>
          region.name === form.region
      );

    const selectedProvince =
      provinces.find(
        (province) =>
          province.name === form.province
      );

    if (
      !selectedRegion ||
      !selectedProvince
    ) {
      return;
    }

    let mounted = true;

    async function loadMunicipalities() {
      try {
        setLoadingLocations(true);
        setLocationError("");

        const data =
          await getLocations(
            `/regions/${encodeURIComponent(
              selectedRegion.code
            )}/provinces/${encodeURIComponent(
              selectedProvince.code
            )}/cities-municipalities`
          );

        if (mounted) {
          setMunicipalities(data);
        }
      } catch {
        if (mounted) {
          setLocationError(
            "Unable to load municipalities and cities."
          );
        }
      } finally {
        if (mounted) {
          setLoadingLocations(false);
        }
      }
    }

    loadMunicipalities();

    return () => {
      mounted = false;
    };
  }, [
    form.region,
    form.province,
    regions,
    provinces,
  ]);

  useEffect(() => {
    if (
      !form.region ||
      !form.province ||
      !form.municipality
    ) {
      setBarangays([]);
      return;
    }

    const selectedMunicipality =
      municipalities.find(
        (municipality) =>
          municipality.name ===
          form.municipality
      );

    if (!selectedMunicipality) return;

    let mounted = true;

    async function loadBarangays() {
      try {
        setLoadingLocations(true);
        setLocationError("");

        const data =
          await getLocations(
            `/cities-municipalities/${encodeURIComponent(
              selectedMunicipality.code
            )}/barangays`
          );

        if (mounted) {
          setBarangays(data);
        }
      } catch {
        if (mounted) {
          setLocationError(
            "Unable to load barangays for the selected municipality/city."
          );
        }
      } finally {
        if (mounted) {
          setLoadingLocations(false);
        }
      }
    }

    loadBarangays();

    return () => {
      mounted = false;
    };
  }, [
    form.region,
    form.province,
    form.municipality,
    municipalities,
  ]);

  const isValidEmail = (email) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(
      email.trim()
    );

  const isValidName = (name) =>
    /^[A-Za-zÑñ .'-]+$/.test(
      name.trim()
    );

  const validateStep = () => {
    setFormError("");

    if (step === 1) {
      const birthDate = form.birthday
        ? new Date(
            `${form.birthday}T00:00:00`
          )
        : null;

      const validBirthDate =
        birthDate &&
        !Number.isNaN(
          birthDate.getTime()
        ) &&
        birthDate <= new Date();

      if (!form.firstName.trim()) {
        setFormError(
          "Please enter your first name."
        );
        return false;
      }

      if (
        !isValidName(
          form.firstName
        )
      ) {
        setFormError(
          "First name can only contain letters, spaces, periods, apostrophes, or hyphens."
        );
        return false;
      }

      if (!form.lastName.trim()) {
        setFormError(
          "Please enter your last name."
        );
        return false;
      }

      if (
        !isValidName(
          form.lastName
        )
      ) {
        setFormError(
          "Last name can only contain letters, spaces, periods, apostrophes, or hyphens."
        );
        return false;
      }

      if (
        form.middleName.trim() &&
        !isValidName(
          form.middleName
        )
      ) {
        setFormError(
          "Please enter a valid middle name."
        );
        return false;
      }

      if (
        !form.birthday ||
        !validBirthDate
      ) {
        setFormError(
          "Please enter a valid birthday."
        );
        return false;
      }

      if (age < 18) {
        setFormError(
          "You must be at least 18 years old to create an account."
        );
        return false;
      }

      if (!form.civilStatus) {
        setFormError(
          "Please select your civil status."
        );
        return false;
      }
    }

    if (step === 2) {
      const contactNumber =
        form.contactNumber.replace(
          /\D/g,
          ""
        );

      if (
        !/^09\d{9}$/.test(
          contactNumber
        )
      ) {
        setFormError(
          "Contact number must contain exactly 11 digits and begin with 09."
        );
        return false;
      }

      if (
        !isValidEmail(
          form.email
        )
      ) {
        setFormError(
          "Please enter a valid email address."
        );
        return false;
      }

      if (
        form.password.length < 6
      ) {
        setFormError(
          "Your password must contain at least 6 characters."
        );
        return false;
      }

      if (!form.association) {
        setFormError(
          "Please select your association."
        );
        return false;
      }
    }

    if (step === 3) {
      const members = Number(
        form.members
      );

      const year = Number(
        form.year
      );

      const currentYear =
        new Date().getFullYear();

      if (
        !Number.isInteger(
          members
        ) ||
        members < 1
      ) {
        setFormError(
          "Please enter a valid number of association members."
        );
        return false;
      }

      if (
        !Number.isInteger(
          year
        ) ||
        year < 1900 ||
        year > currentYear
      ) {
        setFormError(
          "Please enter a valid association registration year."
        );
        return false;
      }

      if (!form.position) {
        setFormError(
          "Please select your position in the association."
        );
        return false;
      }
    }

    if (step === 4) {
      if (!form.region) {
        setFormError(
          "Please select your region."
        );
        return false;
      }

      if (!form.province) {
        setFormError(
          "Please select your province."
        );
        return false;
      }

      if (!form.municipality) {
        setFormError(
          "Please select your municipality or city."
        );
        return false;
      }

      if (!form.barangay) {
        setFormError(
          "Please select your barangay."
        );
        return false;
      }
    }

    return true;
  };

  const nextStep = () => {
    if (!validateStep()) {
      return;
    }

    setStep((previous) =>
      Math.min(
        previous + 1,
        4
      )
    );
  };

  const previousStep = () => {
    setFormError("");

    setStep((previous) =>
      Math.max(
        previous - 1,
        1
      )
    );
  };

  const handleSubmit = async (
    event
  ) => {
    event.preventDefault();

    if (creatingAccount) {
      return;
    }

    if (!validateStep()) {
      return;
    }

    const fullName = [
      form.firstName.trim(),
      form.middleName.trim(),
      form.lastName.trim(),
    ]
      .filter(Boolean)
      .join(" ");

    setCreatingAccount(true);

    try {
      await registerClient({
        ...form,
        firstName:
          form.firstName.trim(),
        middleName:
          form.middleName.trim(),
        lastName:
          form.lastName.trim(),
        email:
          form.email
            .trim()
            .toLowerCase(),
        contactNumber:
          form.contactNumber.replace(
            /\D/g,
            ""
          ),
        members:
          Number(form.members),
        year:
          Number(form.year),
        age,
        name: fullName,
      });

      alert(
        "Account created successfully. Please sign in using your new account."
      );

      navigate("/", {
        replace: true,
      });
    } catch (error) {
      if (
        error?.code ===
        "auth/email-already-in-use"
      ) {
        setFormError(
          "This email address is already registered. Please use another email address."
        );
      } else if (
        error?.code ===
        "auth/invalid-email"
      ) {
        setFormError(
          "The email address is not valid."
        );
      } else if (
        error?.code ===
        "auth/weak-password"
      ) {
        setFormError(
          "The password is too weak. Please use at least 6 characters."
        );
      } else if (
        error?.code ===
        "auth/configuration-not-found"
      ) {
        setFormError(
          "Firebase Authentication is not configured for this project. Enable Email/Password sign-in in the Firebase Console."
        );
      } else {
        setFormError(
          error?.message ||
            "Account creation failed. Please try again."
        );
      }
    } finally {
      setCreatingAccount(false);
    }
  };

  return (
    <div className="signup-page">
      <div className="signup-shell">
        <div className="signup-intro">
          <button
            type="button"
            className="back-link"
            onClick={() =>
              navigate("/")
            }
          >
            ← Back to sign in
          </button>

          <h1>
            Create your AGRIhelp account
          </h1>

          <p>
            Register the association representative account used
            to submit requests and coordinate appointments.
          </p>

          {[
            "Personal information",
            "Contact & association",
            "Association details",
            "Verification & address",
          ].map(
            (title, index) => {
              const number =
                index + 1;

              return (
                <div
                  className={`progress-step ${
                    step >= number
                      ? "done"
                      : ""
                  }`}
                  key={title}
                >
                  <span>
                    {number}
                  </span>

                  <div>
                    <strong>
                      {title}
                    </strong>

                    <small>
                      {step > number
                        ? "Completed"
                        : step === number
                        ? "Current step"
                        : "Upcoming"}
                    </small>
                  </div>
                </div>
              );
            }
          )}
        </div>

        <form
          className="signup-card"
          onSubmit={handleSubmit}
          noValidate
        >
          <div className="signup-card-header">
            <span className="eyebrow">
              CLIENT ACCOUNT
            </span>

            <h2>
              {step === 1 &&
                "Personal information"}

              {step === 2 &&
                "Contact & association"}

              {step === 3 &&
                "Association details"}

              {step === 4 &&
                "Verification & address"}
            </h2>

            <p>
              Step {step} of 4
            </p>
          </div>

          {formError && (
            <div
              className="signup-form-error"
              role="alert"
            >
              {formError}
            </div>
          )}

          {step === 1 && (
            <div className="form-grid">
              <Field
                label="First name"
                name="firstName"
                value={
                  form.firstName
                }
                onChange={
                  updateField
                }
                required
                placeholder="Enter first name"
              />

              <Field
                label="Middle name"
                name="middleName"
                value={
                  form.middleName
                }
                onChange={
                  updateField
                }
                placeholder="Enter middle name"
              />

              <Field
                label="Last name"
                name="lastName"
                value={
                  form.lastName
                }
                onChange={
                  updateField
                }
                required
                placeholder="Enter last name"
              />

              <Field
                label="Birthday"
                name="birthday"
                type="date"
                value={
                  form.birthday
                }
                onChange={
                  updateField
                }
                required
                max={
                  new Date()
                    .toISOString()
                    .split("T")[0]
                }
              />

              <Field
                label="Age"
                name="age"
                value={age}
                readOnly
              />

              <SelectField
                label="Civil status"
                name="civilStatus"
                value={
                  form.civilStatus
                }
                onChange={
                  updateField
                }
                required
                options={[
                  "Single",
                  "Married",
                  "Widowed",
                  "Separated",
                ]}
              />
            </div>
          )}

          {step === 2 && (
            <div className="form-grid">
              <Field
                label="Contact number"
                name="contactNumber"
                value={
                  form.contactNumber
                }
                onChange={(
                  name,
                  value
                ) =>
                  updateField(
                    name,
                    value
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
                required
                inputMode="numeric"
                placeholder="09XXXXXXXXX"
                maxLength={11}
                pattern="09[0-9]{9}"
              />

              <Field
                label="Email address"
                name="email"
                type="email"
                value={
                  form.email
                }
                onChange={
                  updateField
                }
                required
                placeholder="example@gmail.com"
              />

              <Field
                label="Password"
                name="password"
                type="password"
                value={
                  form.password
                }
                onChange={
                  updateField
                }
                required
                minLength={6}
                placeholder="At least 6 characters"
              />

              <div className="field wide">
                <label>
                  Association name *
                </label>

                <select
                  value={
                    form.association
                  }
                  onChange={(event) =>
                    updateField(
                      "association",
                      event.target
                        .value
                    )
                  }
                  required
                >
                  <option value="">
                    Select association
                  </option>

                  {ASSOCIATIONS.map(
                    (
                      association
                    ) => (
                      <option
                        key={
                          association
                        }
                        value={
                          association
                        }
                      >
                        {association}
                      </option>
                    )
                  )}
                </select>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="form-grid">
              <Field
                label="Total number of members"
                name="members"
                type="number"
                value={
                  form.members
                }
                onChange={
                  updateField
                }
                required
                min="1"
              />

              <Field
                label="Year of registration"
                name="year"
                type="number"
                value={
                  form.year
                }
                onChange={
                  updateField
                }
                required
                min="1900"
                max={
                  new Date().getFullYear()
                }
              />

              <SelectField
                label="Member's position in association"
                name="position"
                value={
                  form.position
                }
                onChange={
                  updateField
                }
                required
                options={[
                  "President",
                  "Vice President",
                  "Secretary",
                  "Treasurer",
                  "Representative",
                  "Other",
                ]}
              />
            </div>
          )}

          {step === 4 && (
            <div className="form-grid">
              <LocationSelect
                label="Region"
                value={
                  form.region
                }
                items={regions}
                disabled={
                  loadingLocations &&
                  regions.length ===
                    0
                }
                onChange={(value) => {
                  setForm(
                    (previous) => ({
                      ...previous,
                      region: value,
                      province: "",
                      municipality:
                        "",
                      barangay: "",
                    })
                  );

                  setFormError(
                    ""
                  );
                }}
                required
              />

              <LocationSelect
                label="Province"
                value={
                  form.province
                }
                items={
                  provinces
                }
                disabled={
                  !form.region ||
                  loadingLocations
                }
                onChange={(value) => {
                  setForm(
                    (previous) => ({
                      ...previous,
                      province:
                        value,
                      municipality:
                        "",
                      barangay: "",
                    })
                  );

                  setFormError(
                    ""
                  );
                }}
                required
              />

              <LocationSelect
                label="Municipality / City"
                value={
                  form.municipality
                }
                items={
                  municipalities
                }
                disabled={
                  !form.province ||
                  loadingLocations
                }
                onChange={(value) => {
                  setForm(
                    (previous) => ({
                      ...previous,
                      municipality:
                        value,
                      barangay: "",
                    })
                  );

                  setFormError(
                    ""
                  );
                }}
                required
              />

              <LocationSelect
                label="Barangay"
                value={
                  form.barangay
                }
                items={
                  barangays
                }
                disabled={
                  !form.municipality ||
                  loadingLocations
                }
                onChange={(value) =>
                  updateField(
                    "barangay",
                    value
                  )
                }
                required
              />

              <div className="field wide">
                <small>
                  {loadingLocations
                    ? "Loading Philippine location data..."
                    : locationError ||
                      "Address data follows the Philippine Standard Geographic Code (PSGC)."}
                </small>
              </div>
            </div>
          )}

          <div className="form-actions">
            <button
              type="button"
              className="secondary-btn"
              onClick={() => {
                if (step === 1) {
                  navigate("/");
                } else {
                  previousStep();
                }
              }}
              disabled={
                creatingAccount
              }
            >
              Back
            </button>

            {step < 4 ? (
              <button
                type="button"
                className="primary-btn"
                onClick={nextStep}
                disabled={
                  creatingAccount
                }
              >
                Continue →
              </button>
            ) : (
              <button
                type="submit"
                className="primary-btn"
                disabled={
                  creatingAccount
                }
              >
                {creatingAccount
                  ? "Creating account..."
                  : "Create account"}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  value = "",
  onChange,
  required = false,
  inputMode,
  readOnly = false,
  placeholder,
  min,
  max,
  maxLength,
  pattern,
  minLength,
}) {
  return (
    <div className="field">
      <label>
        {label}
        {required && " *"}
      </label>

      <input
        name={name}
        type={type}
        value={value ?? ""}
        onChange={(event) =>
          onChange?.(
            name,
            event.target.value
          )
        }
        required={required}
        inputMode={inputMode}
        readOnly={readOnly}
        placeholder={placeholder}
        min={min}
        max={max}
        maxLength={maxLength}
        pattern={pattern}
        minLength={minLength}
      />
    </div>
  );
}

function SelectField({
  label,
  name,
  value = "",
  onChange,
  options = [],
  required = false,
}) {
  return (
    <div className="field">
      <label>
        {label}
        {required && " *"}
      </label>

      <select
        name={name}
        value={value}
        onChange={(event) =>
          onChange?.(
            name,
            event.target.value
          )
        }
        required={required}
      >
        <option value="">
          Select an option
        </option>

        {options.map(
          (option) => (
            <option
              key={option}
              value={option}
            >
              {option}
            </option>
          )
        )}
      </select>
    </div>
  );
}

function LocationSelect({
  label,
  value,
  items,
  disabled,
  onChange,
  required = false,
}) {
  return (
    <div className="field">
      <label>
        {label}
        {required && " *"}
      </label>

      <select
        value={value || ""}
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
        disabled={disabled}
        required={required}
      >
        <option value="">
          {disabled
            ? `Select ${label.toLowerCase()} first`
            : `Select ${label.toLowerCase()}`}
        </option>

        {items.map(
          (item) => (
            <option
              key={
                item.code ||
                item.name
              }
              value={
                item.name
              }
            >
              {item.name}
            </option>
          )
        )}
      </select>
    </div>
  );
}