import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user?: DefaultSession["user"] & {
      id?: string;
      role?: "user" | "admin";
      image?: string;
    };
  }

  interface User {
    id?: string;
    role?: "user" | "admin";
    image?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: "user" | "admin";
    image?: string;
  }
}
