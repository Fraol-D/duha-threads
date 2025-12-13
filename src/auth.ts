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

async function syncUserProfile(input: { email: string; name?: string | null; image?: string | null }) {
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
    if (input.image && existing.image !== input.image) {
      existing.image = input.image;
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
    image: input.image,
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
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
        };
      },
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
  trustHost: true,
  allowDangerousEmailAccountLinking: true,
  callbacks: {
    async signIn({ user, account, profile, email, credentials }) {
      // Allow sign in for credentials
      if (account?.provider === 'credentials') return true;

      // For OAuth (Google), link to existing user if email matches
      if (account?.provider === 'google' && user?.email) {
        const db = await getDb();
        const existing = await UserModel.findOne({ email: user.email.toLowerCase() });
        if (existing) {
          // If the user does not have an image, update it
          if (profile && profile.picture && existing.image !== profile.picture) {
            existing.image = profile.picture;
            await existing.save();
          }
          // Check if Google account link exists in accounts collection
          const AccountModel = db.models.Account || db.model('Account', new db.Schema({}, { strict: false }), 'accounts');
          const existingAccount = await AccountModel.findOne({
            userId: existing._id.toString(),
            provider: 'google',
            providerAccountId: account.providerAccountId,
          });
          if (!existingAccount) {
            // Link Google account to existing user
            await AccountModel.create({
              userId: existing._id.toString(),
              type: 'oauth',
              provider: 'google',
              providerAccountId: account.providerAccountId,
              access_token: account.access_token,
              token_type: account.token_type,
              id_token: account.id_token,
              scope: account.scope,
              expires_at: account.expires_at,
              refresh_token: account.refresh_token,
              session_state: account.session_state,
            });
          }
          return true;
        }
      }
      // Default: allow sign in
      return true;
    },
    async jwt({ token, user, account, profile }) {
      const appUser = user as AppUser | undefined;
      if (appUser) {
        token.id = appUser.id ?? token.id;
        token.role = appUser.role ?? (token.role as Role | undefined) ?? "user";
        if ((appUser as any).image) {
          token.image = (appUser as any).image;
        }
      }

      if (!token.role && token.email) {
        const synced = await syncUserProfile({
          email: token.email as string,
          name: (token.name as string) || undefined,
          image: (token.image as string) || undefined,
        });
        token.id = synced._id.toString();
        token.role = synced.role;
        if (synced.image) token.image = synced.image;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string | undefined) ?? session.user.id;
        session.user.role = (token.role as Role | undefined) ?? session.user.role;
        if (token.image) session.user.image = token.image as string;
      }
      return session;
    },
  },
});
