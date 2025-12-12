/* Simple logger abstraction, replace console.* with a real service later */
export const logger = {
  info: (msg: string, meta?: unknown) => console.info(msg, meta ?? ""),
  warn: (msg: string, meta?: unknown) => console.warn(msg, meta ?? ""),
  error: (msg: string, meta?: unknown) => console.error(msg, meta ?? ""),
};
