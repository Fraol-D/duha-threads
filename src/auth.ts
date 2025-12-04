import NextAuth, { type NextAuthConfig } from "next-auth";
import type { AdapterUser } from "next-auth/adapters";
import GoogleProvider from "next-auth/providers/google";
import EmailProvider from "next-auth/providers/email";
import { env } from "@/config/env";
import { getDb } from "@/lib/db/connection";
import { UserModel } from "@/lib/db/models/User";
import type { UserDocument } from "@/types/user";

type MinimalUser = Pick<UserDocument, "_id" | "role" | "email" | "name">;

function normalizeId(id: MinimalUser["_id"]): string {
  return typeof id === "string" ? id : id.toString();
}

function requireEnvString(value: string | undefined | null, name: string, fallback?: string): string {
  if (value) return value;
  if (fallback !== undefined && process.env.NODE_ENV !== "production") {
    console.warn(`[auth] ${name} missing; falling back to dev placeholder.`);
    return fallback;
  }
  throw new Error(`Missing required environment variable: ${name}`);
}

function requireEnvNumber(value: number | undefined | null, name: string, fallback?: number): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (fallback !== undefined && process.env.NODE_ENV !== "production") {
    console.warn(`[auth] ${name} missing; using dev fallback value ${fallback}.`);
    return fallback;
  }
  throw new Error(`Missing required environment variable: ${name}`);
}

async function findOrCreateUserByEmail(email: string, name?: string): Promise<MinimalUser> {
  await getDb();
  const normalizedEmail = email.toLowerCase();
  let user = await UserModel.findOne({ email: normalizedEmail }).lean<MinimalUser>();
  if (!user) {
    const fallbackName = name?.trim() && name.length >= 2 ? name.trim() : normalizedEmail.split("@")[0];
    const created = await UserModel.create({
      name: fallbackName,
      email: normalizedEmail,
      role: "user",
      status: "active",
    });
    user = created.toObject() as MinimalUser;
  }
  return user;
}

const providers = [
  GoogleProvider({
    clientId: requireEnvString(env.GOOGLE_CLIENT_ID, "GOOGLE_CLIENT_ID", "demo-google-client-id"),
    clientSecret: requireEnvString(env.GOOGLE_CLIENT_SECRET, "GOOGLE_CLIENT_SECRET", "demo-google-client-secret"),
  }),
  EmailProvider({
    server: {
      host: requireEnvString(env.EMAIL_SERVER_HOST, "EMAIL_SERVER_HOST", "localhost"),
      port: requireEnvNumber(env.EMAIL_SERVER_PORT, "EMAIL_SERVER_PORT", 1025),
      auth: {
        user: requireEnvString(env.EMAIL_SERVER_USER, "EMAIL_SERVER_USER", "user"),
        pass: requireEnvString(env.EMAIL_SERVER_PASSWORD, "EMAIL_SERVER_PASSWORD", "password"),
      },
    },
    from: requireEnvString(env.EMAIL_FROM, "EMAIL_FROM", "no-reply@example.com"),
  }),
];

export const authOptions: NextAuthConfig = {
  secret: env.AUTH_SECRET,
  session: { strategy: "jwt" },
  trustHost: true,
  providers,
  callbacks: {
    async signIn({ user }) {
      if (!user?.email) return false;
      const dbUser = await findOrCreateUserByEmail(user.email, user.name ?? undefined);
      const nextUser = user as AdapterUser & { role?: "user" | "admin" };
      nextUser.id = normalizeId(dbUser._id);
      nextUser.role = dbUser.role;
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        const nextUser = user as AdapterUser & { role?: "user" | "admin" };
        token.userId = nextUser.id ?? token.userId;
        token.role = nextUser.role ?? token.role ?? "user";
      }
      if ((!token.role || !token.userId) && token.email) {
        await getDb();
        const dbUser = await UserModel.findOne(
          { email: token.email.toLowerCase() },
          { role: 1 }
        ).lean<Pick<UserDocument, "_id" | "role"> | null>();
        if (dbUser) {
          token.userId = token.userId || normalizeId(dbUser._id);
          token.role = dbUser.role || "user";
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        if (typeof token.userId === "string") {
          session.user.id = token.userId;
        }
        session.user.role = (token.role as "user" | "admin") ?? "user";
      }
      return session;
    },
  },
};

export const { handlers: authHandlers, auth, signIn, signOut } = NextAuth(authOptions);
