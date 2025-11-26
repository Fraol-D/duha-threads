/*
  Mongoose connection helper ensuring a single cached connection in dev.
  Usage in a route handler:
    import { getDb } from "@/lib/db/connection";
    const conn = await getDb();
  The function resolves once a connection is established or returns the cached connection.
*/
import mongoose from "mongoose";
import { env } from "@/config/env";

interface Cached {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var __MONGOOSE_CACHE__: Cached | undefined;
}

const globalCache = global.__MONGOOSE_CACHE__ || { conn: null, promise: null };
if (!global.__MONGOOSE_CACHE__) {
  global.__MONGOOSE_CACHE__ = globalCache;
}

export async function getDb(): Promise<typeof mongoose> {
  if (globalCache.conn) return globalCache.conn;
  if (!globalCache.promise) {
    const uri = env.MONGODB_URI;
    if (!uri) {
      throw new Error('MONGODB_URI environment variable is not set');
    }
    globalCache.promise = mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000, // Fail fast if can't connect
      socketTimeoutMS: 10000,
    }).then((m) => m).catch((err) => {
      // Reset promise so next call can retry
      globalCache.promise = null;
      throw err;
    });
  }
  globalCache.conn = await globalCache.promise;
  return globalCache.conn;
}
