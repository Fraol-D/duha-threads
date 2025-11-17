import { getDb } from "@/lib/db/connection";
import { ProductModel } from "@/lib/db/models/Product";
import type { ProductDocument, ProductImageDocument } from "@/types/product";
import ProductActionsClient from "../../../components/ProductActionsClient";
import Link from "next/link";

function isObjectId(id: string) {
  return /^[a-fA-F0-9]{24}$/.test(id);
}

export default async function ProductDetailPage({ params }: { params: { idOrSlug: string } }) {
  const { idOrSlug } = params;
  await getDb();
  const query = isObjectId(idOrSlug) ? { _id: idOrSlug, isActive: true } : { slug: idOrSlug, isActive: true };
  const doc = (await ProductModel.findOne(query).lean()) as ProductDocument | null;
  if (!doc) {
    return (
      <div className="py-24 text-center">
        <h1 className="text-2xl font-semibold mb-2">Product not found</h1>
        <Link href="/products" className="underline">Back to Products</Link>
      </div>
    );
  }
  const images: ProductImageDocument[] = doc.images || [];
  const primary = images.find((i) => i.isPrimary) || images[0];

  const productIdStr = typeof doc._id === "string" ? doc._id : (doc._id as unknown as { toString(): string }).toString();

  return (
    <div className="py-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div>
        <div className="aspect-square bg-gray-100 rounded overflow-hidden">
          {primary ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={primary.url} alt={primary.alt} className="w-full h-full object-cover" />
          ) : null}
        </div>
        {images.length > 1 && (
          <div className="mt-4 grid grid-cols-5 gap-2">
            {images.map((img, i: number) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={img.url} alt={img.alt} className="w-full aspect-square object-cover rounded border" />
            ))}
          </div>
        )}
      </div>
      <div className="space-y-4">
        <div className="text-sm text-gray-500">{doc.category}</div>
        <h1 className="text-3xl font-semibold">{doc.name}</h1>
        <div className="text-xl">${" "}{doc.basePrice.toFixed(2)}</div>
        <p className="text-gray-700">{doc.description}</p>
        <div className="flex gap-2 flex-wrap">
          {doc.colors?.map((c: string) => (
            <span key={c} className="text-xs border rounded px-2 py-1">{c}</span>
          ))}
        </div>
        <div className="flex gap-2 flex-wrap">
          {doc.sizes?.map((s: string) => (
            <span key={s} className="text-xs border rounded px-2 py-1">{s}</span>
          ))}
        </div>
        {/* Actions */}
        <ProductActionsClient
          productId={productIdStr}
          sizes={(doc.sizes as string[]) || []}
          colors={(doc.colors as string[]) || []}
        />
        <div className="pt-4 text-sm text-gray-500">Sales: {doc.salesCount || 0}</div>
      </div>
    </div>
  );
}
