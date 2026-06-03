/**
 * Email allowlist for who may use the app. Populated from VITE_ALLOWED_EMAILS
 * (comma-separated). Keep this in sync with the allowlist in firestore.rules —
 * the rules are the real security gate; this is the client-side UX gate.
 */
const raw = import.meta.env.VITE_ALLOWED_EMAILS ?? "";

export const ALLOWED_EMAILS: string[] = raw
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

export function isEmailAllowed(email: string | null | undefined): boolean {
  // When no allowlist is configured, fall back to allowing any signed-in user.
  if (ALLOWED_EMAILS.length === 0) return true;
  if (!email) return false;
  return ALLOWED_EMAILS.includes(email.toLowerCase());
}
