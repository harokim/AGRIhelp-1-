
import {
  addDoc,
  collection,
  serverTimestamp
} from "firebase/firestore";

import {
  db,
  firebaseConfigured
} from "../firebase";

function clean(value, maxLength = 200) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function normalizeEmail(value) {
  return clean(value, 254).toLowerCase();
}

export async function submitAccountRequest(form) {
  if (!firebaseConfigured || !db) {
    throw new Error("Firebase is not configured.");
  }

  const name = clean(form.name, 150);
  const email = normalizeEmail(form.email);
  const contactNumber = clean(form.contactNumber, 11);
  const association = clean(form.association, 200);
  const associationKey = association.toLowerCase();
  const position = clean(form.position, 100);
  const region = clean(form.region, 150);
  const province = clean(form.province, 150);
  const municipality = clean(form.municipality, 150);
  const barangay = clean(form.barangay, 150);

  if (!name) {
    throw new Error("Name is required.");
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Enter a valid email address.");
  }

  if (!/^09\d{9}$/.test(contactNumber)) {
    throw new Error("Contact number must contain 11 digits and start with 09.");
  }

  if (!association) {
    throw new Error("Association is required.");
  }

  if (
    !position ||
    !region ||
    !province ||
    !municipality ||
    !barangay
  ) {
    throw new Error("Complete all required address and position fields.");
  }

  const members = Number(form.members);

  if (!Number.isInteger(members) || members < 0) {
    throw new Error("Members must be a non-negative whole number.");
  }

  const year =
    form.year === "" || form.year == null
      ? null
      : Number(form.year);

  if (year !== null && !Number.isInteger(year)) {
    throw new Error("Year must be a whole number.");
  }

  const payload = {
    name,
    email,
    contactNumber,
    association,
    associationKey,
    members,
    year,
    position,
    region,
    province,
    municipality,
    barangay,
    status: "pending",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  const docRef = await addDoc(
    collection(db, "accountRequests"),
    payload
  );

  return {
    success: true,
    accountRequestId: docRef.id,
    message: "Account request submitted successfully."
  };
}
