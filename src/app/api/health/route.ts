import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { env } from "@/config/env";
import { getDb } from "@/lib/db/connection";

export async function GET() {
  let dbStatus: string = "skipped";
  try {
    if (env.MONGODB_URI) {
      await getDb();
      dbStatus = "connected";
    } else {
      dbStatus = "no-uri";
    }
  } catch (e) {
    logger.error("Health check DB error", e);
    dbStatus = "error";
  }
  return NextResponse.json({ status: "ok", db: dbStatus, env: env.NODE_ENV });
}
