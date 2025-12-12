import jwt from "jsonwebtoken";
import { env } from "@/config/env";

interface TokenPayload {
  uid: string;
}

const COOKIE_NAME = "auth_token";
const EXPIRES_IN = "7d"; // adjust later

export function signAuthToken(userId: string): string {
  return jwt.sign({ uid: userId } as TokenPayload, env.AUTH_JWT_SECRET, { expiresIn: EXPIRES_IN });
}

export function verifyAuthToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, env.AUTH_JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

export { COOKIE_NAME };
