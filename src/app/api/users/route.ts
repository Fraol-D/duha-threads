import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { z } from "zod";
import type { FilterQuery } from "mongoose";
import { verifyAuth } from "@/lib/auth/session";
import { isAdmin } from "@/lib/auth/admin";
import { getDb } from "@/lib/db/connection";
import { UserModel } from "@/lib/db/models/User";
import { toPublicUser } from "@/types/user";
import type { UserDocument } from "@/types/user";
import { hashPassword } from "@/lib/auth/password";

const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8).optional(),
  role: z.enum(["user", "admin"]).default("user"),
  status: z.enum(["active", "inactive"]).default("active"),
});

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

/* cspell:ignore ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789 */
function randomPassword(length = 12) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*";
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += chars[bytes[i] % chars.length];
  }
  return out;
}

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    if (!auth.user || !isAdmin(auth.user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await getDb();
    const url = new URL(req.url);
    let page = Number(url.searchParams.get("page") || 1);
    let pageSize = Number(url.searchParams.get("pageSize") || DEFAULT_PAGE_SIZE);
    const q = url.searchParams.get("q")?.trim();
    const role = url.searchParams.get("role");
    const status = url.searchParams.get("status");

    if (!Number.isFinite(page) || page < 1) page = 1;
    if (!Number.isFinite(pageSize) || pageSize < 1) pageSize = DEFAULT_PAGE_SIZE;
    if (pageSize > MAX_PAGE_SIZE) pageSize = MAX_PAGE_SIZE;

    const filter: FilterQuery<UserDocument> = {};
    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
      ];
    }
    if (role === "user" || role === "admin") {
      filter.role = role;
    }
    if (status === "active" || status === "inactive") {
      filter.status = status;
    }

    const totalCount = await UserModel.countDocuments(filter);
    const docs = await UserModel.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .exec();

    const users = docs.map((doc) => toPublicUser(doc));

    return NextResponse.json({
      page,
      pageSize,
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
      users,
    });
  } catch (err) {
    console.error("[API_USERS_LIST]", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    if (!auth.user || !isAdmin(auth.user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const json = await req.json().catch(() => null);
    const parsed = createUserSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;
    await getDb();

    const existing = await UserModel.findOne({ email: data.email.toLowerCase() }).lean();
    if (existing) {
      return NextResponse.json({ error: "Email already exists" }, { status: 409 });
    }

    const finalPassword = data.password || randomPassword();
    const hashed = await hashPassword(finalPassword);

    const user = await UserModel.create({
      name: data.name,
      email: data.email.toLowerCase(),
      hashedPassword: hashed,
      role: data.role,
      status: data.status,
    });

    const payload = toPublicUser(user);

    return NextResponse.json(
      {
        user: payload,
        generatedPassword: data.password ? undefined : finalPassword,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[API_USERS_CREATE]", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
