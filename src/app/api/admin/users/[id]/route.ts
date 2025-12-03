import type { NextRequest } from "next/server";
import {
  deleteUserHandler,
  getUserHandler,
  patchUserHandler,
  type RouteParams,
} from "../../../users/userHandlers";

type RouteContext = { params: Promise<RouteParams> } | { params: RouteParams };

async function resolveParams(ctx: RouteContext): Promise<RouteParams> {
  const value = ctx.params as RouteParams | Promise<RouteParams>;
  return value && typeof (value as Promise<RouteParams>).then === "function"
    ? await (value as Promise<RouteParams>)
    : (value as RouteParams);
}

export async function GET(req: NextRequest, ctx: RouteContext) {
  return getUserHandler(req, await resolveParams(ctx));
}

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  return patchUserHandler(req, await resolveParams(ctx));
}

export async function DELETE(req: NextRequest, ctx: RouteContext) {
  return deleteUserHandler(req, await resolveParams(ctx));
}
