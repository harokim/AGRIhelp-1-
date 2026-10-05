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

export const todayISO = () =>
  new Date().toISOString().slice(0, 10);

export function formatDate(date) {
  if (!date) return "";

  const value = date?.toDate
    ? date.toDate()
    : new Date(`${date}T00:00:00`);

  return value.toLocaleDateString(
    undefined,
    {
      month: "short",
      day: "numeric",
      year: "numeric"
    }
  );
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