import { notFound } from 'next/navigation';
import { getDb } from '@/lib/db/connection';
import { ProductModel } from '@/lib/db/models/Product';
import { toPublicProduct, type ProductDocument } from '@/types/product';
import DetailClient from './DetailClient';

type Params = { slug: string };

export default async function ProductDetailPage({ params }: { params: Promise<Params> | Params }) {
  const { slug } = await params; // Await in case Next provides a promise
  await getDb();
  const doc = await ProductModel.findOne({ slug, isActive: true }).lean<ProductDocument>();
  if (!doc) return notFound();
  void ProductModel.updateOne({ _id: doc._id }, { $inc: { viewCount: 1 } }).exec();
  const product = toPublicProduct(doc);
  return <DetailClient product={product} />;
}
