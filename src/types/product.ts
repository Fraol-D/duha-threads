export interface ProductImageDocument {
  url: string;
  alt: string;
  isPrimary: boolean;
}

export interface ProductDocument {
  _id: string;
  name: string;
  slug: string;
  description: string;
  basePrice: number;
  category: string;
  colors: string[];
  sizes: string[];
  images: ProductImageDocument[];
  isActive: boolean;
  salesCount: number;
  viewCount: number;
  sku?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PublicProduct {
  id: string;
  name: string;
  slug: string;
  description: string;
  basePrice: number;
  category: string;
  colors: string[];
  sizes: string[];
  images: ProductImageDocument[];
  salesCount: number;
  sku?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductListItem {
  id: string;
  name: string;
  slug: string;
  basePrice: number;
  category: string;
  primaryImage?: ProductImageDocument;
  salesCount: number;
  sku?: string;
}

export interface ProductFilters {
  category?: string;
  size?: string;
  color?: string;
  minPrice?: number;
  maxPrice?: number;
}

export type ProductSort = 'newest' | 'price_asc' | 'price_desc' | 'best_selling';

export interface ProductListResponse {
  products: ProductListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function toPublicProduct(doc: ProductDocument): PublicProduct {
  return {
    id: doc._id.toString(),
    name: doc.name,
    slug: doc.slug,
    description: doc.description,
    basePrice: doc.basePrice,
    category: doc.category,
    colors: doc.colors,
    sizes: doc.sizes,
    images: doc.images,
    salesCount: doc.salesCount,
    sku: doc.sku,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

export function toProductListItem(doc: ProductDocument): ProductListItem {
  const primaryImage = doc.images.find((img) => img.isPrimary) || doc.images[0];
  return {
    id: doc._id.toString(),
    name: doc.name,
    slug: doc.slug,
    basePrice: doc.basePrice,
    category: doc.category,
    primaryImage,
    salesCount: doc.salesCount,
    sku: doc.sku,
  };
}
