import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db/connection";
import { ProductModel } from "@/lib/db/models/Product";
import { toProductListItem, type ProductListResponse, type ProductSort, type ProductDocument } from "@/types/product";
import { env } from "@/config/env";

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(60).default(12),
  category: z.string().optional(),
  size: z.string().optional(),
  color: z.string().optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  sort: z.enum(["newest", "price_asc", "price_desc", "best_selling"]).default("newest"),
});

type SortTuple = [string, 1 | -1];
function buildSort(sort: ProductSort): SortTuple[] {
  switch (sort) {
    case "price_asc":
      return [["basePrice", 1]];
    case "price_desc":
      return [["basePrice", -1]];
    case "best_selling":
      return [["salesCount", -1]];
    case "newest":
    default:
      return [["createdAt", -1]];
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams.entries()));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query" }, { status: 400 });
  }
  const { page, pageSize, category, size, color, minPrice, maxPrice, sort } = parsed.data;

  // If DB is not configured, return an empty list gracefully during dev
  if (!env.MONGODB_URI || !env.MONGODB_URI.startsWith("mongodb")) {
    const empty: ProductListResponse = {
      products: [],
      total: 0,
      page,
      pageSize,
      totalPages: 1,
    };
    return NextResponse.json(empty);
  }

  await getDb();

  type PriceFilter = { $gte?: number; $lte?: number };
  type ProductFilter = {
    isActive: boolean;
    category?: string;
    sizes?: string;
    colors?: string;
    basePrice?: PriceFilter;
  };
  const filter: ProductFilter = { isActive: true };
  if (category) filter.category = category;
  if (size) filter.sizes = size;
  if (color) filter.colors = color;
  if (minPrice != null || maxPrice != null) {
    filter.basePrice = {};
    if (minPrice != null) filter.basePrice.$gte = minPrice;
    if (maxPrice != null) filter.basePrice.$lte = maxPrice;
  }

  const skip = (page - 1) * pageSize;
  const [docs, total] = await Promise.all([
    ProductModel.find(filter)
      .sort(buildSort(sort))
      .skip(skip)
      .limit(pageSize)
      .lean(),
    ProductModel.countDocuments(filter),
  ]);

  const products = docs.map((d) => toProductListItem(d as unknown as ProductDocument));
  const response: ProductListResponse = {
    products,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize) || 1,
  };
  return NextResponse.json(response);
}
