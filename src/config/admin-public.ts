// Admin email list exposed to client for conditional UI.
// Prefer NEXT_PUBLIC_ADMIN_EMAILS; fallback to ADMIN_EMAILS.
// NOTE: Do not export other sensitive env values.
export const ADMIN_EMAILS: string[] = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || process.env.ADMIN_EMAILS || "")
  .split(",")
  .map(e => e.trim().toLowerCase())
  .filter(Boolean);

export function isAdminEmail(email?: string | null): boolean {
  return !!email && ADMIN_EMAILS.includes(email.toLowerCase());
}
