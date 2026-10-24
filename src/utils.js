export const OFFICE_NAME =
  "Municipal Agricultural and Biosystems Engineering Office";

export const ASSOCIATIONS = [
  "Polot Bulan Irrigators Association",
  "SOMASTARIA",
  "AQUILALA",
  "John Peter Irrigators Association",
  "SANDETARFAB",
  "LAPAFARA",
  "R. GERONA Irrigators Association",
  "MATANAK Irrigators Association",
  "Sta. Remedios Farmers Association",
  "A Bonifacio Farmers Irrigators Association"
];

export const MAX_FILE_SIZE =
  5 * 1024 * 1024;

export const MAX_PROFILE_IMAGE_SIZE =
  350 * 1024;

const PH_TIME_ZONE = "Asia/Manila";

export const todayISO = () => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: PH_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());

  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value])
  );

  return `${values.year}-${values.month}-${values.day}`;
};

export function formatDate(date) {
  if (!date) return "";

  let value;

  if (date?.toDate) {
    value = date.toDate();
  } else if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    value = new Date(`${date}T12:00:00Z`);
  } else {
    value = new Date(date);
  }

  if (Number.isNaN(value.getTime())) return "";

  return new Intl.DateTimeFormat("en-PH", {
    timeZone: PH_TIME_ZONE,
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(value);
}

export function initials(name = "User") {
  return String(name)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((x) => x[0])
    .join("")
    .toUpperCase();
}

export function avatarUrl(user) {
  return user?.avatar || "";
}

export function isStrongPassword(password = "") {
  const value = String(password);

  return (
    value.length >= 8 &&
    /[A-Z]/.test(value) &&
    /[a-z]/.test(value) &&
    /\d/.test(value) &&
    /[^A-Za-z0-9]/.test(value)
  );
}