import { auth } from "../firebase";

export async function sendClientSMS({
  phoneNumber,
  message
}) {
  const endpoint = import.meta.env.VITE_SMS_API_URL;

  if (!endpoint) {
    throw new Error("SMS service URL is not configured.");
  }

  const user = auth.currentUser;

  if (!user) {
    throw new Error("You must be signed in to send SMS.");
  }

  const number = String(phoneNumber || "").trim();
  const cleanMessage = String(message || "").trim();

  if (!number) {
    throw new Error("A phone number is required.");
  }

  if (!cleanMessage) {
    throw new Error("An SMS message is required.");
  }

  const token = await user.getIdToken();

  let response;

  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        number,
        message: cleanMessage
      })
    });
  } catch {
    throw new Error(
      "Unable to connect to the AGRIhelp SMS service."
    );
  }

  const result = await response.json().catch(() => null);

  if (!response.ok || result?.success !== true) {
    throw new Error(
      result?.message ||
      `SMS request failed (${response.status}).`
    );
  }

  return result;
}