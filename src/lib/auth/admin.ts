type MaybeUser = { role?: string | null } | null | undefined;

export function isAdmin(user: MaybeUser): user is { role: "admin" } {
  return user?.role === "admin";
}

export function assertAdmin(user: MaybeUser): asserts user is { role: "admin" } {
  if (!isAdmin(user)) {
    throw new Error("FORBIDDEN_ADMIN");
  }
}