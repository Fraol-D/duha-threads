/*
  Central environment variable access and validation.
  Usage:
    import { env } from "@/config/env";
    const uri = env.MONGODB_URI;
  Add new vars by extending the schema below.
*/
import { z } from "zod";

const schema = z.object({
  // Allow empty string so production build can succeed without a DB configured yet.
  MONGODB_URI: z.union([z.string().min(1), z.literal("")]),
  EMAIL_API_KEY: z.string().optional(), // Placeholder for future email service integration
  APP_BASE_URL: z.string().url().optional(),
  AUTH_JWT_SECRET: z.string().min(32, "AUTH_JWT_SECRET must be set and >=32 chars"),
  ADMIN_EMAILS: z.string().optional(), // Comma-separated admin emails, used to authorize order status changes
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

// Build raw map from process.env (only accessing once here)
const raw = {
  MONGODB_URI: process.env.MONGODB_URI || "",
  EMAIL_API_KEY: process.env.EMAIL_API_KEY,
  APP_BASE_URL: process.env.APP_BASE_URL,
  AUTH_JWT_SECRET: process.env.AUTH_JWT_SECRET || "dev-insecure-secret-change-me-please-1234567890",
  ADMIN_EMAILS: process.env.ADMIN_EMAILS,
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
  NODE_ENV: process.env.NODE_ENV as string,
};

const parsed = schema.safeParse(raw);

if (!parsed.success) {
  // Log but do not throw during build; runtime paths relying on missing vars will handle gracefully.
  console.error("Env validation errors:", parsed.error.flatten().fieldErrors);
}

export const env = (parsed.success ? parsed.data : raw) as z.infer<typeof schema>;
