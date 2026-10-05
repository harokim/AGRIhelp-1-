import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { fileToDataURL } from "../services/documentService";
import { MAX_PROFILE_IMAGE_SIZE } from "../utils";
import { Avatar } from "./ClientMessages";

export default function Profile({
  viewEngineer = false
}) {
  const {
    user,
    users,
    updateProfile
  } = useAuth();

  const target =
    viewEngineer
      ? users.find(
          (item) =>
            item.role ===
              "engineer" &&
            item.status !==
              "inactive"
        )
      : user;

  const [form, setForm] =
    useState(target || {});

  const [saving, setSaving] =
    useState(false);

  useEffect(() => {
    setForm(
      target || {}
    );
  }, [target?.id]);

  if (!target) {
    return (
      <div className="container page-container">
        <div className="empty-state">
          Engineer profile not available.
        </div>
      </div>
    );
  }

  const editable =
    !viewEngineer &&
    target.id === user?.id;

  const updateField = (
    field,
    value
  ) => {
    setForm(
      (current) => ({
        ...current,
        [field]: value
      })
    );
  };

  const save = async () => {
    const name =
      form.name?.trim();

    const contactNumber =
      String(
        form.contactNumber ||
          ""
      ).replace(
        /\D/g,
        ""
      );

    if (!name) {
      alert(
        "Full name is required."
      );
      return;
    }

    if (
      !/^09\d{9}$/.test(
        contactNumber
      )
    ) {
      alert(
        "Contact number must contain exactly 11 digits and begin with 09."
      );
      return;
    }

    setSaving(true);

    try {
      await updateProfile(
        target.id,
        {
          name,
          contactNumber,
          position:
            form.position?.trim() ||
            "",
          profileBio:
            form.profileBio?.trim() ||
            "",
          address:
            form.address?.trim() ||
            "",
          officeAddress:
            form.officeAddress?.trim() ||
            "",
          barangay:
            form.barangay || "",
          municipality:
            form.municipality ||
            "",
          province:
            form.province || "",
          region:
            form.region || ""
        }
      );

      alert(
        "Profile updated successfully."
      );
    } catch {
      alert(
        "The profile could not be updated. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  const upload = async (
    event
  ) => {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    event.target.value = "";

    if (
      !file.type.startsWith(
        "image/"
      )
    ) {
      alert(
        "Please select an image file."
      );
      return;
    }

    if (
      file.size >
      MAX_PROFILE_IMAGE_SIZE
    ) {
      alert(
        "Profile pictures must be 350KB or smaller."
      );
      return;
    }

    try {
      const avatar =
        await fileToDataURL(
          file
        );

      await updateProfile(
        target.id,
        {
          avatar
        }
      );

      setForm(
        (current) => ({
          ...current,
          avatar
        })
      );

      alert(
        "Profile picture updated."
      );
    } catch {
      alert(
        "Could not update the profile picture."
      );
    }
  };

  const displayPosition =
    form.position ||
    form.profileBio ||
    "";

  return (
    <div className="container page-container">
      <div className="page-header">
        <div>
          <span className="eyebrow">
            ACCOUNT PROFILE
          </span>

          <h1>
            My Profile
          </h1>

          <p>
            View and manage the information connected to your AGRIhelp account.
          </p>
        </div>
      </div>

      <div className="profile-card card">
        <div className="profile-hero">
          <Avatar u={form} />

          <div>
            <span className="eyebrow">
              ACCOUNT PROFILE
            </span>

            <h1>
              {form.name ||
                "User"}
            </h1>

            <p>
              {form.role ===
              "engineer"
                ? "Municipal Agricultural and Biosystems Engineering Office"
                : form.association ||
                  "Client"}
            </p>
          </div>
        </div>

        <div className="form-grid">
          <Field
            label="Full name"
            value={
              form.name || ""
            }
            disabled={!editable}
            onChange={(value) =>
              updateField(
                "name",
                value
              )
            }
          />

          <Field
            label="Email"
            value={
              form.email || ""
            }
            disabled
          />

          <Field
            label="Contact number"
            value={
              form.contactNumber ||
              ""
            }
            disabled={!editable}
            onChange={(value) =>
              updateField(
                "contactNumber",
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
          />

          <Field
            label="Position / profile"
            value={
              displayPosition
            }
            disabled={!editable}
            onChange={(value) =>
              updateField(
                "position",
                value
              )
            }
          />

          <Field
            label="Association"
            value={
              form.association ||
              ""
            }
            disabled
          />

          <Field
            label="Region"
            value={
              form.region || ""
            }
            disabled={!editable}
            onChange={(value) =>
              updateField(
                "region",
                value
              )
            }
          />

          <Field
            label="Province"
            value={
              form.province ||
              ""
            }
            disabled={!editable}
            onChange={(value) =>
              updateField(
                "province",
                value
              )
            }
          />

          <Field
            label="Municipality / City"
            value={
              form.municipality ||
              ""
            }
            disabled={!editable}
            onChange={(value) =>
              updateField(
                "municipality",
                value
              )
            }
          />

          <Field
            label="Barangay"
            value={
              form.barangay ||
              ""
            }
            disabled={!editable}
            onChange={(value) =>
              updateField(
                "barangay",
                value
              )
            }
          />

          <Field
            label="Address"
            value={
              form.address ||
              form.officeAddress ||
              ""
            }
            disabled={!editable}
            onChange={(value) => {
              updateField(
                "address",
                value
              );

              updateField(
                "officeAddress",
                value
              );
            }}
          />
        </div>

        {editable && (
          <div className="profile-actions">
            <label className="secondary-btn upload-btn">
              Change profile picture

              <input
                hidden
                type="file"
                accept="image/*"
                onChange={
                  upload
                }
              />
            </label>

            <button
              type="button"
              className="primary-btn"
              onClick={save}
              disabled={saving}
            >
              {saving
                ? "Saving..."
                : "Save profile"}
            </button>
          </div>
        )}

        {!editable &&
          viewEngineer && (
            <p className="muted">
              This is the Engineer's profile information.
            </p>
          )}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  disabled
}) {
  return (
    <div className="field">
      <label>
        {label}
      </label>

      <input
        value={value}
        disabled={disabled}
        onChange={(event) =>
          onChange?.(
            event.target.value
          )
        }
      />
    </div>
  );
}