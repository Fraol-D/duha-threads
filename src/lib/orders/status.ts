export const DELIVERED_STATUSES = ["DELIVERED", "COMPLETED", "FULFILLED"] as const;
const DELIVERED_STATE_SET = new Set<string>(DELIVERED_STATUSES);

export function isDeliveredStatus(status?: string | null): boolean {
  if (!status) return false;
  const normalized = status.toString().trim().toUpperCase();
  return DELIVERED_STATE_SET.has(normalized);
}
