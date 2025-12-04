export interface GuestCartItem {
  productId: string;
  size: string;
  color: string;
  quantity: number;
}

const STORAGE_KEY = "duha:guest-cart";

function isBrowser() {
  return typeof window !== "undefined";
}

function parse(value: string | null): GuestCartItem[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.filter((item) =>
        item && typeof item.productId === "string" && typeof item.size === "string" && typeof item.color === "string" && typeof item.quantity === "number"
      );
    }
  } catch {
    // ignore
  }
  return [];
}

export function readGuestCart(): GuestCartItem[] {
  if (!isBrowser()) return [];
  return parse(window.localStorage.getItem(STORAGE_KEY));
}

export function writeGuestCart(items: GuestCartItem[]) {
  if (!isBrowser()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function addGuestCartItem(newItem: GuestCartItem) {
  if (!isBrowser()) return;
  const items = readGuestCart();
  const idx = items.findIndex((item) =>
    item.productId === newItem.productId && item.size === newItem.size && item.color === newItem.color
  );
  if (idx >= 0) {
    items[idx].quantity += newItem.quantity;
  } else {
    items.push(newItem);
  }
  writeGuestCart(items);
}

export function updateGuestCartItem(target: GuestCartItem, delta: number) {
  if (!isBrowser()) return;
  const items = readGuestCart();
  const idx = items.findIndex((item) =>
    item.productId === target.productId && item.size === target.size && item.color === target.color
  );
  if (idx >= 0) {
    items[idx].quantity = Math.max(0, items[idx].quantity + delta);
    if (items[idx].quantity === 0) {
      items.splice(idx, 1);
    }
    writeGuestCart(items);
  }
}

export function setGuestCartItems(items: GuestCartItem[]) {
  writeGuestCart(items);
}

export function clearGuestCart() {
  if (!isBrowser()) return;
  window.localStorage.removeItem(STORAGE_KEY);
}
