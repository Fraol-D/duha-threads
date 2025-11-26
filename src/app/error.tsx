"use client";
import { useEffect } from "react";
import { logger } from "@/lib/logger";

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    logger.error("Global error boundary", { message: error.message, digest: error.digest });
  }, [error]);
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="p-6 rounded border bg-white shadow space-y-2 max-w-md w-full">
        <h1 className="text-lg font-semibold">Something went wrong</h1>
        <p className="text-sm text-gray-600">Please refresh or try again later.</p>
      </div>
    </div>
  );
}
