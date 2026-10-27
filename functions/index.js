
"use strict";

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

setGlobalOptions({
  maxInstances: 10,
});

const REGION = "asia-southeast1";

const ALLOWED_ORIGINS = [
  "https://agri-e005a.web.app",
  "https://agri-e005a.firebaseapp.com",
];

const semaphoreApiKey = defineSecret("SEMAPHORE_API_KEY");

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

function getRequestStatus(data) {
  return String(data?.status || "")
    .trim()
    .toLowerCase();
}

async function getExistingAuthUser(email) {
  try {
    return await adminAuth.getUserByEmail(email);
  } catch (error) {
    if (error.code === "auth/user-not-found") {
      return null;
    }

    throw error;
  }
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

function handleUnexpectedError(error, operation) {
  if (error instanceof HttpsError) {
    throw error;
  }

  logger.error(`${operation} failed`, {
    code: error?.code || "unknown",
    message: error?.message || String(error),
  });

  throw new HttpsError(
    "internal",
    "The operation could not be completed. Please try again."
  );
}

exports.submitAccountRequest = onCall(
  {
    region: REGION,
    cors: ALLOWED_ORIGINS,
  },
  async (request) => {
    try {
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

      const contactNumber = clean(data.contactNumber, 30).replace(/\D/g, "");

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

      const existingAuth = await getExistingAuthUser(email);

      if (existingAuth) {
        throw new HttpsError(
          "already-exists",
          "An account already exists for this email. Contact the office if you need help."
        );
      }

      const pendingRequests = await db
        .collection("accountRequests")
        .where("email", "==", email)
        .get();

      const existingEmailRequest = pendingRequests.docs.some((doc) =>
        ["pending", "approved", "processed"].includes(
          getRequestStatus(doc.data())
        )
      );

      if (existingEmailRequest) {
        throw new HttpsError(
          "already-exists",
          "An account request for this email is already pending or has been processed."
        );
      }

      const associationRequests = await db
        .collection("accountRequests")
        .where("associationKey", "==", payload.associationKey)
        .get();

      const existingAssociationRequest = associationRequests.docs.some((doc) =>
        ["pending", "approved"].includes(getRequestStatus(doc.data()))
      );

      if (existingAssociationRequest) {
        throw new HttpsError(
          "already-exists",
          "This association already has a pending account request."
        );
      }

      const users = await db
        .collection("users")
        .where("role", "==", "client")
        .get();

      const activeAssociationExists = users.docs.some((doc) => {
        const user = doc.data();

        return (
          user.status === "active" &&
          normalized(user.association) === payload.associationKey
        );
      });

      if (activeAssociationExists) {
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
    } catch (error) {
      handleUnexpectedError(error, "Account request submission");
    }
  }
);

exports.createClientAccount = onCall(
  {
    region: REGION,
    cors: ALLOWED_ORIGINS,
  },
  async (request) => {
    let createdUser = null;
    let profileCreated = false;
    let accountRequestId = "";

    try {
      await requireActiveEngineer(request);

      accountRequestId = requireString(
        request.data?.accountRequestId,
        "Account request ID",
        200
      );

      const requestRef = db.collection("accountRequests").doc(accountRequestId);
      const requestSnap = await requestRef.get();

      if (!requestSnap.exists) {
        throw new HttpsError(
          "not-found",
          "Account request not found."
        );
      }

      const accountRequest = requestSnap.data();

      if (getRequestStatus(accountRequest) !== "pending") {
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

      const activeAssociationExists = users.docs.some((doc) => {
        const user = doc.data();

        return (
          user.status === "active" &&
          normalized(user.association) === associationKey
        );
      });

      if (activeAssociationExists) {
        throw new HttpsError(
          "already-exists",
          "An active client account already exists for this association."
        );
      }

      const existingUser = await getExistingAuthUser(email);

      if (existingUser) {
        throw new HttpsError(
          "already-exists",
          "An Authentication account already exists for this email."
        );
      }

      const temporaryPassword =
        crypto.randomBytes(24).toString("base64url") + "A1!";

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

      await db.collection("users").doc(createdUser.uid).create(profile);
      profileCreated = true;

      const passwordResetLink =
        await adminAuth.generatePasswordResetLink(email);

      await requestRef.update({
        status: "processed",
        processedAt: FieldValue.serverTimestamp(),
        processedBy: request.auth.uid,
        createdUserId: createdUser.uid,
        updatedAt: FieldValue.serverTimestamp(),
      });

      logger.info("Client account created successfully", {
        accountRequestId,
        userId: createdUser.uid,
        createdBy: request.auth.uid,
      });

      return {
        success: true,
        userId: createdUser.uid,
        email,
        passwordResetLink,
        message:
          "Client account created successfully. Share the password-reset link securely with the client.",
      };
    } catch (error) {
      if (createdUser?.uid) {
        if (profileCreated) {
          await db
            .collection("users")
            .doc(createdUser.uid)
            .delete()
            .catch((rollbackError) => {
              logger.error("Failed to roll back client Firestore profile", {
                accountRequestId,
                userId: createdUser.uid,
                message: rollbackError.message,
              });
            });
        }

        await adminAuth
          .deleteUser(createdUser.uid)
          .catch((rollbackError) => {
            logger.error("Failed to roll back client Authentication account", {
              accountRequestId,
              userId: createdUser.uid,
              message: rollbackError.message,
            });
          });
      }

      if (error instanceof HttpsError) {
        throw error;
      }

      logger.error("Failed to create client account", {
        accountRequestId,
        code: error?.code || "unknown",
        message: error?.message || String(error),
      });

      throw new HttpsError(
        "internal",
        "The client account could not be created. Please check the function logs or try again."
      );
    }
  }
);

exports.sendSms = onCall(
  {
    region: REGION,
    cors: ALLOWED_ORIGINS,
    secrets: [semaphoreApiKey],
  },
  async (request) => {
    try {
      if (!request.auth) {
        throw new HttpsError(
          "unauthenticated",
          "You must be signed in to send an SMS."
        );
      }

      const data = request.data || {};
      const number = clean(data.number, 30);
      const message = String(data.message || "").trim();
      const sendername = clean(data.sendername, 50);

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
      });

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      handleUnexpectedError(error, "SMS sending");
    }
  }
);
