
const crypto = require("node:crypto");
const { setGlobalOptions } = require("firebase-functions");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const logger = require("firebase-functions/logger");
const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

initializeApp();

const adminAuth = getAuth();
const db = getFirestore();

setGlobalOptions({ maxInstances: 10 });

const semaphoreApiKey = defineSecret("SEMAPHORE_API_KEY");
const REGION = "asia-southeast1";

function clean(value, max = 200) {
  return String(value ?? "").trim().slice(0, max);
}

function normalized(value) {
  return clean(value, 200)
    .toLocaleLowerCase("en-US")
    .replace(/\s+/g, " ");
}

function requireString(value, label, max = 200) {
  const result = clean(value, max);

  if (!result) {
    throw new HttpsError(
      "invalid-argument",
      `${label} is required.`
    );
  }

  return result;
}

async function requireActiveEngineer(request) {
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "Sign in as an engineer to perform this action."
    );
  }

  const snap = await db
    .collection("users")
    .doc(request.auth.uid)
    .get();

  const profile = snap.exists ? snap.data() : null;

  if (
    !profile ||
    profile.role !== "engineer" ||
    profile.status !== "active"
  ) {
    throw new HttpsError(
      "permission-denied",
      "Only active engineers can perform this action."
    );
  }

  return profile;
}

exports.submitAccountRequest = onCall(
  {
    region: REGION,
    cors: true,
  },
  async (request) => {
    const data = request.data || {};

    const name = requireString(data.name, "Full name", 150);
    const email = requireString(data.email, "Email", 254).toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new HttpsError(
        "invalid-argument",
        "Enter a valid email address."
      );
    }

    const association = requireString(
      data.association,
      "Association",
      200
    );

    const contactNumber = clean(data.contactNumber, 30)
      .replace(/\D/g, "");

    if (contactNumber.length !== 11) {
      throw new HttpsError(
        "invalid-argument",
        "Contact number must contain 11 digits."
      );
    }

    const payload = {
      name,
      email,
      contactNumber,
      association,
      associationKey: normalized(association),
      birthday: clean(data.birthday, 20),
      civilStatus: clean(data.civilStatus, 40),
      members: Math.max(
        0,
        Math.min(10000000, Number(data.members) || 0)
      ),
      year: Number(data.year) || null,
      position: clean(data.position, 100),
      region: clean(data.region, 100),
      province: clean(data.province, 100),
      municipality: clean(data.municipality, 100),
      barangay: clean(data.barangay, 100),
      status: "pending",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (
      !payload.position ||
      !payload.region ||
      !payload.municipality ||
      !payload.barangay
    ) {
      throw new HttpsError(
        "invalid-argument",
        "Complete the association position and address fields."
      );
    }

    const existingAuth = await adminAuth
      .getUserByEmail(email)
      .catch((error) => {
        if (error.code === "auth/user-not-found") {
          return null;
        }

        throw error;
      });

    if (existingAuth) {
      throw new HttpsError(
        "already-exists",
        "An account already exists for this email. Contact the office if you need help."
      );
    }

    const pending = await db
      .collection("accountRequests")
      .where("email", "==", email)
      .get();

    if (
      pending.docs.some((doc) =>
        ["pending", "approved", "processed"].includes(
          String(doc.data().status || "").toLowerCase()
        )
      )
    ) {
      throw new HttpsError(
        "already-exists",
        "An account request for this email is already pending or has been processed."
      );
    }

    const associationRequests = await db
      .collection("accountRequests")
      .where("associationKey", "==", payload.associationKey)
      .get();

    if (
      associationRequests.docs.some((doc) =>
        ["pending", "approved"].includes(
          String(doc.data().status || "").toLowerCase()
        )
      )
    ) {
      throw new HttpsError(
        "already-exists",
        "This association already has a pending account request."
      );
    }

    const users = await db
      .collection("users")
      .where("role", "==", "client")
      .get();

    if (
      users.docs.some(
        (doc) =>
          doc.data().status === "active" &&
          normalized(doc.data().association) === payload.associationKey
      )
    ) {
      throw new HttpsError(
        "already-exists",
        "An active client account already exists for this association."
      );
    }

    const ref = await db.collection("accountRequests").add(payload);

    logger.info("Account request submitted", {
      accountRequestId: ref.id,
    });

    return {
      success: true,
      accountRequestId: ref.id,
      message: "Your account request was submitted for engineer review.",
    };
  }
);

exports.createClientAccount = onCall(
  {
    region: REGION,
    cors: true,
  },
  async (request) => {
    await requireActiveEngineer(request);

    const accountRequestId = requireString(
      request.data?.accountRequestId,
      "Account request ID",
      200
    );

    const requestRef = db
      .collection("accountRequests")
      .doc(accountRequestId);

    const requestSnap = await requestRef.get();

    if (!requestSnap.exists) {
      throw new HttpsError(
        "not-found",
        "Account request not found."
      );
    }

    const accountRequest = requestSnap.data();

    if (
      String(accountRequest.status || "").toLowerCase() !== "pending"
    ) {
      throw new HttpsError(
        "failed-precondition",
        "This account request has already been processed."
      );
    }

    const email = requireString(
      accountRequest.email,
      "Email",
      254
    ).toLowerCase();

    const association = requireString(
      accountRequest.association,
      "Association",
      200
    );

    const associationKey = normalized(association);

    const users = await db
      .collection("users")
      .where("role", "==", "client")
      .get();

    if (
      users.docs.some(
        (doc) =>
          doc.data().status === "active" &&
          normalized(doc.data().association) === associationKey
      )
    ) {
      throw new HttpsError(
        "already-exists",
        "An active client account already exists for this association."
      );
    }

    const existing = await adminAuth
      .getUserByEmail(email)
      .catch((error) => {
        if (error.code === "auth/user-not-found") {
          return null;
        }

        throw error;
      });

    if (existing) {
      throw new HttpsError(
        "already-exists",
        "An Authentication account already exists for this email."
      );
    }

    const temporaryPassword =
      crypto.randomBytes(24).toString("base64url") + "A1!";

    let createdUser;

    try {
      createdUser = await adminAuth.createUser({
        email,
        password: temporaryPassword,
        displayName: clean(accountRequest.name, 150),
        disabled: false,
      });

      const profile = {
        name: clean(accountRequest.name, 150),
        email,
        role: "client",
        status: "active",
        contactNumber: clean(accountRequest.contactNumber, 30),
        association,
        birthday: clean(accountRequest.birthday, 20),
        civilStatus: clean(accountRequest.civilStatus, 40),
        members: Number(accountRequest.members) || 0,
        year: Number(accountRequest.year) || null,
        position: clean(accountRequest.position, 100),
        region: clean(accountRequest.region, 100),
        province: clean(accountRequest.province, 100),
        municipality: clean(accountRequest.municipality, 100),
        barangay: clean(accountRequest.barangay, 100),
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        accountRequestId,
        createdBy: request.auth.uid,
      };

      await db
        .collection("users")
        .doc(createdUser.uid)
        .create(profile);

      const passwordResetLink =
        await adminAuth.generatePasswordResetLink(email);

      await requestRef.update({
        status: "processed",
        processedAt: FieldValue.serverTimestamp(),
        processedBy: request.auth.uid,
        createdUserId: createdUser.uid,
        updatedAt: FieldValue.serverTimestamp(),
      });

      return {
        success: true,
        userId: createdUser.uid,
        email,
        passwordResetLink,
        message:
          "Client account created. Share the password-reset link securely with the client.",
      };
    } catch (error) {
      if (createdUser?.uid) {
        await db
          .collection("users")
          .doc(createdUser.uid)
          .delete()
          .catch(() => {});

        await adminAuth
          .deleteUser(createdUser.uid)
          .catch(() => {});
      }

      if (error instanceof HttpsError) {
        throw error;
      }

      logger.error("Failed to create client account", {
        accountRequestId,
        error: error.message,
      });

      throw new HttpsError(
        "internal",
        "The client account could not be created. No account was left partially created."
      );
    }
  }
);

exports.sendSms = onCall(
  {
    region: REGION,
    cors: true,
    secrets: [semaphoreApiKey],
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "You must be signed in to send an SMS."
      );
    }

    const data = request.data || {};
    const number = String(data.number || "").trim();
    const message = String(data.message || "").trim();
    const sendername = String(data.sendername || "").trim();

    if (!number) {
      throw new HttpsError(
        "invalid-argument",
        "A phone number is required."
      );
    }

    if (!message) {
      throw new HttpsError(
        "invalid-argument",
        "An SMS message is required."
      );
    }

    if (message.length > 1600) {
      throw new HttpsError(
        "invalid-argument",
        "The SMS message is too long."
      );
    }

    try {
      const formData = new URLSearchParams({
        apikey: semaphoreApiKey.value(),
        number,
        message,
      });

      if (sendername) {
        formData.append("sendername", sendername);
      }

      const response = await fetch(
        "https://api.semaphore.co/api/v4/messages",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: formData,
        }
      );

      const responseText = await response.text();

      let result;

      try {
        result = JSON.parse(responseText);
      } catch {
        result = { response: responseText };
      }

      if (!response.ok) {
        logger.error("Semaphore API error", {
          status: response.status,
          result,
        });

        throw new HttpsError(
          "internal",
          "Semaphore failed to send the SMS."
        );
      }

      logger.info("SMS sent successfully", {
        userId: request.auth.uid,
        number,
        result,
      });

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }

      logger.error("SMS function error", error);

      throw new HttpsError(
        "internal",
        "Unable to send SMS."
      );
    }
  }
);
