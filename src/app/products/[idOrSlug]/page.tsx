import { getDb } from "@/lib/db/connection";
import { ProductModel } from "@/lib/db/models/Product";
import type { ProductDocument, ProductImageDocument } from "@/types/product";
import ProductActionsClient from "../../../components/ProductActionsClient";
import Link from "next/link";
import { Card } from "@/components/ui/Card";

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
        <Card variant="glass" className="p-8 inline-block">
          <h1 className="text-2xl font-semibold mb-2">Product not found</h1>
          <Link href="/products" className="underline">Back to Products</Link>
        </Card>
      </div>
    );
  }
  const images: ProductImageDocument[] = doc.images || [];
  const primary = images.find((i) => i.isPrimary) || images[0];

  const productIdStr = typeof doc._id === "string" ? doc._id : (doc._id as unknown as { toString(): string }).toString();

  return (
    <div className="py-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div>
        <Card variant="glass" className="overflow-hidden">
          <div className="aspect-square bg-muted">
            {primary ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={primary.url} alt={primary.alt} className="w-full h-full object-cover" />
            ) : null}
          </div>
        </Card>
        {images.length > 1 && (
          <div className="mt-4 grid grid-cols-5 gap-2">
            {images.map((img, i: number) => (
              <Card key={i} interactive className="overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt={img.alt} className="w-full aspect-square object-cover" />
              </Card>
            ))}
          </div>
        )}
      </div>
      <div className="space-y-6">
        <div className="text-sm text-muted uppercase tracking-wide">{doc.category}</div>
        <h1 className="text-hero leading-tight">{doc.name}</h1>
        <div className="text-2xl font-bold">${doc.basePrice.toFixed(2)}</div>
        <p className="text-base leading-relaxed">{doc.description}</p>
        
        <div className="space-y-3">
          <div className="text-sm font-medium">Colors</div>
          <div className="flex gap-2 flex-wrap">
            {doc.colors?.map((c: string) => (
              <span key={c} className="soft-3d text-sm px-4 py-2 rounded-full">{c}</span>
            ))}
          </div>
        </div>
        
        <div className="space-y-3">
          <div className="text-sm font-medium">Sizes</div>
          <div className="flex gap-2 flex-wrap">
            {doc.sizes?.map((s: string) => (
              <span key={s} className="soft-3d text-sm px-4 py-2 rounded-full">{s}</span>
            ))}
          </div>
        </div>
        
        {/* Actions */}
        <ProductActionsClient
          productId={productIdStr}
          sizes={(doc.sizes as string[]) || []}
          colors={(doc.colors as string[]) || []}
        />
        
        <div className="pt-4 text-sm text-muted">Sales: {doc.salesCount || 0}</div>
      </div>
    </div>
  );
}
