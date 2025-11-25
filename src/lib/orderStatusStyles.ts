// Centralized status color mapping for orders (standard & custom)
// Returns tailwind utility classes for badge styling.
export function getOrderStatusClasses(status?: string) {
  if (!status) return "bg-muted text-muted-foreground border border-muted";
  const s = status.toUpperCase();
  if (/^(CANCELLED|REFUNDED|CANCEL|VOID)/.test(s)) return "bg-red-500/15 text-red-600 border border-red-500/30";
  if (/^(DELIVERED|COMPLETED|FULFILLED)/.test(s)) return "bg-green-500/15 text-green-600 border border-green-500/30";
  if (/^(READY_FOR_PICKUP)/.test(s)) return "bg-purple-500/15 text-purple-600 border border-purple-500/30";
  if (/^(OUT_FOR_DELIVERY|SHIPPED)/.test(s)) return "bg-indigo-500/15 text-indigo-600 border border-indigo-500/30";
  if (/^(IN_PROGRESS|IN_PRINTING|PRINTING|IN_DESIGN|DESIGNING)/.test(s)) return "bg-blue-500/15 text-blue-600 border border-blue-500/30";
  if (/^(APPROVED|CONFIRMED|PAID)/.test(s)) return "bg-cyan-500/15 text-cyan-600 border border-cyan-500/30";
  if (/^(PENDING|PENDING_REVIEW|REVIEW)/.test(s)) return "bg-amber-500/15 text-amber-600 border border-amber-500/30";
  return "bg-muted text-foreground/80 border border-muted";
}

export function normalizeStatusLabel(status?: string) {
  return status ? status.replace(/_/g, ' ') : '—';
}