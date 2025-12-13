import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import { z } from "zod";
import clientPromise from "@/lib/db/mongodb";
import { getDb } from "@/lib/db/connection";
import { UserModel } from "@/lib/db/models/User";
import { verifyPassword } from "@/lib/auth/password";
import { env } from "@/config/env";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

type Role = "user" | "admin";
type AppUser = {
  id?: string;
  email?: string | null;
  name?: string | null;
  role?: Role;
};

function resolveRole(email: string): "user" | "admin" {
  const adminEmails = env.ADMIN_EMAILS?.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean) || [];
  return adminEmails.includes(email.toLowerCase()) ? "admin" : "user";
}

async function syncUserProfile(input: { email: string; name?: string | null }) {
  await getDb();
  const email = input.email.toLowerCase();
  const existing = await UserModel.findOne({ email });
  const role = resolveRole(email);

  if (existing) {
    let shouldSave = false;
    if (!existing.name && input.name) {
      existing.name = input.name;
      shouldSave = true;
    }
    if (existing.role !== role && role === "admin") {
      existing.role = role;
      shouldSave = true;
    }
    if (existing.status !== "active") {
      existing.status = "active";
      shouldSave = true;
    }
    if (shouldSave) await existing.save();
    return existing;
  }

  const name = input.name || email.split("@")[0];
  const user = await UserModel.create({
    name,
    email,
    hashedPassword: null,
    role,
    status: "active",
  });
  return user;
}

const providers: NextAuthConfig["providers"] = [];

const googleClientId = env.GOOGLE_CLIENT_ID || env.AUTH_GOOGLE_ID;
const googleClientSecret = env.GOOGLE_CLIENT_SECRET || env.AUTH_GOOGLE_SECRET;

if (googleClientId && googleClientSecret) {
  providers.push(
    Google({
      clientId: googleClientId,
      clientSecret: googleClientSecret,
    })
  );
}

providers.push(
  Credentials({
    authorize: async (credentials) => {
      const parsed = credentialsSchema.safeParse(credentials);
      if (!parsed.success) return null;

      await getDb();
      const user = await UserModel.findOne({ email: parsed.data.email.toLowerCase() });
      if (!user || !user.hashedPassword) return null;

      const ok = await verifyPassword(parsed.data.password, user.hashedPassword);
      if (!ok) return null;

      return {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
      };
    },
  })
);

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: MongoDBAdapter(clientPromise),
  secret: env.AUTH_SECRET || env.AUTH_JWT_SECRET,
  session: { strategy: "jwt" },
  providers,
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async signIn({ user }) {
      const appUser = user as AppUser;
      if (!appUser.email) return false;
      const synced = await syncUserProfile({ email: appUser.email, name: appUser.name });
      appUser.id = synced._id.toString();
      appUser.role = synced.role;
      return true;
    },
    async jwt({ token, user }) {
      const appUser = user as AppUser | undefined;
      if (appUser) {
        token.id = appUser.id ?? token.id;
        token.role = appUser.role ?? (token.role as Role | undefined) ?? "user";
      }

      if (!token.role && token.email) {
        const synced = await syncUserProfile({
          email: token.email as string,
          name: (token.name as string) || undefined,
        });
        token.id = synced._id.toString();
        token.role = synced.role;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string | undefined) ?? session.user.id;
        session.user.role = (token.role as Role | undefined) ?? session.user.role;
      }
      return session;
    },
  },
});
