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
  isFeatured?: boolean;
  featuredRank?: number | null;
  displayOrder?: number | null;
  ratingAverage?: number;
  ratingCount?: number;
   isHero?: boolean;
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
  isFeatured?: boolean;
  featuredRank?: number | null;
  displayOrder?: number | null;
  ratingAverage?: number;
  ratingCount?: number;
   isHero?: boolean;
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
  // Added for product card quick add defaults
  colors?: string[];
  sizes?: string[];
  // Optional rating fields (future-proof)
  ratingAverage?: number;
  ratingCount?: number;
  isFeatured?: boolean;
  featuredRank?: number | null;
  displayOrder?: number | null;
  isHero?: boolean;
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
    isFeatured: doc.isFeatured,
    featuredRank: doc.featuredRank ?? null,
    displayOrder: doc.displayOrder ?? null,
    ratingAverage: doc.ratingAverage ?? 0,
    ratingCount: doc.ratingCount ?? 0,
    isHero: doc.isHero ?? false,
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
    colors: doc.colors,
    sizes: doc.sizes,
    isFeatured: doc.isFeatured,
    featuredRank: doc.featuredRank ?? null,
    displayOrder: doc.displayOrder ?? null,
    ratingAverage: doc.ratingAverage ?? 0,
    ratingCount: doc.ratingCount ?? 0,
    isHero: doc.isHero ?? false,
  };
}
