import crypto from "crypto";
import { env } from "@/config/env";

type Nullable<T> = T | null | undefined;

const CHAPA_SECRET_KEY = env.CHAPA_SECRET_KEY;
const CHAPA_PUBLIC_KEY = env.CHAPA_PUBLIC_KEY;
const CHAPA_ENCRYPTION_KEY = env.CHAPA_ENCRYPTION_KEY;
const APP_BASE_URL = env.APP_BASE_URL || "";

if ((!CHAPA_SECRET_KEY || !CHAPA_PUBLIC_KEY || !APP_BASE_URL) && process.env.NODE_ENV === "development") {
  console.warn("Chapa env vars are missing. Payments will not work.");
}

export type ChapaInitPayload = {
  amount: string;
  currency: string;
  email: string;
  first_name?: string;
  last_name?: string;
  tx_ref: string;
  callback_url: string;
  return_url?: string;
  customization?: {
    title?: string;
    description?: string;
  };
  custom_fields?: Record<string, unknown>[];
};

export type ChapaInitializeResponse = {
  status: string;
  message: string;
  data?: {
    checkout_url?: string;
    reference?: string;
    [key: string]: unknown;
  };
};
type ChapaRequestInit = Omit<RequestInit, "body" | "headers"> & {
  body?: unknown;
  headers?: Record<string, string>;
};

async function requestChapa<T>(path: string, options: ChapaRequestInit = {}): Promise<T> {
  if (!CHAPA_SECRET_KEY) {
    throw new Error("Chapa secret key not configured");
  }

  const { body, headers, ...rest } = options;
  const res = await fetch(`https://api.chapa.co${path}`, {
    ...rest,
    method: rest.method || "POST",
    headers: {
      Authorization: `Bearer ${CHAPA_SECRET_KEY}`,
      "Content-Type": "application/json",
      ...(headers || {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => res.statusText);
    console.error(`[CHAPA] Request failed (${res.status})`, errorText);
    throw new Error(`Chapa request failed: ${res.status}`);
  }

  return (await res.json()) as T;
}

export async function initializeChapaPayment(payload: ChapaInitPayload) {
  return requestChapa<ChapaInitializeResponse>("/v1/transaction/initialize", { body: payload });
}

export function computeRefundAmount(total: number): number {
  const feePercent = parseFloat(process.env.REFUND_FEE_PERCENT || "0");
  if (!feePercent) return total;
  const fee = (total * feePercent) / 100;
  return Math.max(0, Math.round((total - fee) * 100) / 100);
}

export function isRefundAllowedStatus(status: string): boolean {
  const allowed = (process.env.REFUND_MAX_STAGE || "pending,designing")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(status.toLowerCase());
}

export function verifyChapaSignature(rawBody: string, signature?: Nullable<string>) {
  const secret = process.env.CHAPA_WEBHOOK_SECRET;
  if (!secret || !signature) return true;

  const expected = crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  return expected === signature;
}

export function getChapaPublicKey() {
  return CHAPA_PUBLIC_KEY;
}

export function getChapaEncryptionKey() {
  return CHAPA_ENCRYPTION_KEY;
}

export function getAppBaseUrl() {
  if (!APP_BASE_URL) {
    throw new Error("APP_BASE_URL not configured");
  }
  return APP_BASE_URL;
}
