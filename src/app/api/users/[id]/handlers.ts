import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyAuth } from "@/lib/auth/session";
import { isAdmin } from "@/lib/auth/admin";
import { getDb } from "@/lib/db/connection";
import { UserModel } from "@/lib/db/models/User";
import { toPublicUser } from "@/types/user";
import type { UserDocument } from "@/types/user";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.enum(["user", "admin"]).optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

type RouteParams = { id: string };

export async function getUserHandler(req: NextRequest, params: RouteParams) {
  try {
    const auth = await verifyAuth(req);
    if (!auth.user || !isAdmin(auth.user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    await getDb();
    const user = await UserModel.findById(params.id);
    if (!user) {
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }
    return NextResponse.json({ user: toPublicUser(user) });
  } catch (err) {
    console.error("[API_USERS_DETAIL]", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function patchUserHandler(req: NextRequest, params: RouteParams) {
  try {
    const auth = await verifyAuth(req);
    if (!auth.user || !isAdmin(auth.user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const json = await req.json().catch(() => null);
    const parsed = updateSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    await getDb();
    const current = await UserModel.findById(params.id);
    if (!current) {
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }

    const updates: Partial<Pick<UserDocument, "name" | "role" | "status">> = {};
    if (parsed.data.name) updates.name = parsed.data.name;
    if (parsed.data.role) updates.role = parsed.data.role;
    if (parsed.data.status) updates.status = parsed.data.status;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ success: true, user: toPublicUser(current) });
    }

    if (current._id.toString() === auth.user.id && parsed.data.role && parsed.data.role !== "admin") {
      return NextResponse.json({ error: "You cannot demote yourself" }, { status: 400 });
    }

    if (current.role === "admin" && parsed.data.role === "user") {
      const otherAdmins = await UserModel.countDocuments({
        _id: { $ne: current._id },
        role: "admin",
        status: { $ne: "inactive" },
      });
      if (otherAdmins === 0) {
        return NextResponse.json({ error: "Cannot remove the last active admin" }, { status: 400 });
      }
    }

    const updated = await UserModel.findByIdAndUpdate(
      params.id,
      { $set: updates },
      { new: true }
    );

    if (!updated) {
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, user: toPublicUser(updated) });
  } catch (err) {
    console.error("[API_USERS_PATCH]", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function deleteUserHandler(req: NextRequest, params: RouteParams) {
  try {
    const auth = await verifyAuth(req);
    if (!auth.user || !isAdmin(auth.user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await getDb();
    if (params.id === auth.user.id) {
      return NextResponse.json({ error: "You cannot delete yourself" }, { status: 400 });
    }

    const target = await UserModel.findById(params.id);
    if (!target) {
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }

    if (target.role === "admin") {
      const otherAdmins = await UserModel.countDocuments({
        _id: { $ne: target._id },
        role: "admin",
        status: { $ne: "inactive" },
      });
      if (otherAdmins === 0) {
        return NextResponse.json({ error: "Cannot delete the last active admin" }, { status: 400 });
      }
    }

    await UserModel.deleteOne({ _id: target._id });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[API_USERS_DELETE]", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
