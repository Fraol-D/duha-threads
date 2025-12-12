export function generateOrderNumber(date: Date = new Date(), sequence = 0): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const base = `ORD-${year}${month}${day}`;
  const suffix = String(sequence).padStart(3, '0');
  return `${base}-${suffix}`;
}

export function isOrderNumberDuplicateError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const code = (err as { code?: number }).code;
  const message = (err as { message?: unknown }).message;
  return code === 11000 && typeof message === 'string' && message.includes('orderNumber');
}
