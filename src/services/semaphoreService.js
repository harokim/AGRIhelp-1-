
export async function sendSemaphoreSMS({
  phoneNumber,
  message
}) {
  const endpoint =
    import.meta.env.VITE_SEMAPHORE_PROXY_URL;

  if (!endpoint) {
    return {
      skipped: true,
      reason: "Semaphore endpoint is not configured."
    };
  }

  const number = String(phoneNumber || "").trim();
  const cleanMessage = String(message || "").trim();

  if (!number) {
    throw new Error("A phone number is required.");
  }

  if (!cleanMessage) {
    throw new Error("An SMS message is required.");
  }

  let response;

  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        number,
        message: cleanMessage
      })
    });
  } catch {
    throw new Error(
      "Unable to connect to the SMS service. Please try again."
    );
  }

  let result;

  try {
    result = await response.json();
  } catch {
    result = null;
  }

  if (!response.ok || result?.success === false) {
    throw new Error(
      result?.message ||
        `SMS service request failed (${response.status}).`
    );
  }

  return result;
}
