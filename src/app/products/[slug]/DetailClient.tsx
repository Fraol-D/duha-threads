"use client";
import { useState, useEffect, useCallback, type FormEvent } from 'react';
import type { PublicProduct } from '@/types/product';
import Link from 'next/link';
import Image from 'next/image';
import { Card } from '@/components/ui/Card';
import { Heart } from 'lucide-react';
import { useWishlist } from '@/components/WishlistProvider';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { useRouter } from 'next/navigation';

export default function DetailClient({ product }: { product: PublicProduct }) {
  const router = useRouter();
  const [size, setSize] = useState(product.sizes[0] || '');
  const [color, setColor] = useState(product.colors[0] || '');
  const [qty, setQty] = useState(1);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeImage, setActiveImage] = useState<string | null>(product.images.find(i => i.isPrimary)?.url || product.images[0]?.url || null);
  const { productIds, toggleWishlist } = useWishlist();
  type ApiReviewResponse = {
    id: string;
    rating: number;
    comment?: string | null;
    updatedAt: string;
    author?: string | null;
    featured?: boolean;
    isOwner?: boolean;
  };
  type ReviewEntry = {
    id: string;
    rating: number;
    comment: string | null;
    updatedAt: string;
    author: string;
    featured: boolean;
    isOwner: boolean;
  };
  type ReviewEligibility = { eligible: boolean; orderId: string | null; orderNumber: string | null };
  type RatingSnapshot = {
    ratingAverage: number;
    ratingCount: number;
    userRating: { rating: number; comment: string | null; updatedAt?: string; orderId: string | null } | null;
    reviews: ReviewEntry[];
    reviewEligibility: ReviewEligibility;
  };
  type PublicDesign = { id: string; title: string; description: string | null; previewImageUrl: string | null; baseColor?: string | null; createdAt?: string };
  const [ratingSummary, setRatingSummary] = useState<RatingSnapshot & { loading: boolean }>(
    {
      ratingAverage: product.ratingAverage ?? 0,
      ratingCount: product.ratingCount ?? 0,
      userRating: null,
      reviews: [],
      reviewEligibility: { eligible: false, orderId: null, orderNumber: null },
      loading: false,
    }
  );
  const [ratingError, setRatingError] = useState<string | null>(null);
  const [reviewSuccess, setReviewSuccess] = useState<string | null>(null);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [publicDesigns, setPublicDesigns] = useState<{ items: PublicDesign[]; loading: boolean; error: string | null }>({
    items: [],
    loading: true,
    error: null,
  });

  const fetchRatingSnapshot = useCallback(async (signal?: AbortSignal): Promise<RatingSnapshot> => {
    const res = await fetch(`/api/products/${product.id}/rating`, { signal, cache: 'no-store' });
    if (!res.ok) {
      throw new Error('Failed to load ratings');
    }
    const data = await res.json();
    return {
      ratingAverage: data.ratingAverage ?? 0,
      ratingCount: data.ratingCount ?? 0,
      userRating: data.userRating
        ? {
            rating: data.userRating.rating,
            comment: data.userRating.comment ?? null,
            updatedAt: data.userRating.updatedAt,
            orderId: data.userRating.orderId ?? null,
          }
        : null,
      reviews: Array.isArray(data.reviews)
        ? (data.reviews as ApiReviewResponse[]).map((entry) => ({
            id: entry.id,
            rating: entry.rating,
            comment: entry.comment ?? null,
            updatedAt: entry.updatedAt,
            author: entry.author || 'Verified customer',
            featured: !!entry.featured,
            isOwner: !!entry.isOwner,
          }))
        : [],
      reviewEligibility: {
        eligible: Boolean(data.reviewEligibility?.eligible),
        orderId: data.reviewEligibility?.orderId ?? null,
        orderNumber: data.reviewEligibility?.orderNumber ?? null,
      },
    };
  }, [product.id]);

  useEffect(() => {
    const controller = new AbortController();
    setRatingError(null);
    setRatingSummary(prev => ({ ...prev, loading: true }));
    fetchRatingSnapshot(controller.signal)
      .then(snapshot => setRatingSummary({ ...snapshot, loading: false }))
      .catch(err => {
        if ((err as Error).name === 'AbortError') return;
        setRatingSummary(prev => ({ ...prev, loading: false }));
        setRatingError(err instanceof Error ? err.message : 'Failed to load ratings');
      });
    return () => controller.abort();
  }, [fetchRatingSnapshot]);

  useEffect(() => {
    if (ratingSummary.userRating) {
      setReviewRating(ratingSummary.userRating.rating);
      setReviewComment(ratingSummary.userRating.comment ?? "");
    }
  }, [ratingSummary.userRating]);

  useEffect(() => {
    const controller = new AbortController();
    setPublicDesigns(prev => ({ ...prev, loading: true, error: null }));
    fetch(`/api/products/${product.id}/public-designs`, { signal: controller.signal, cache: 'no-store' })
      .then(res => {
        if (!res.ok) throw new Error('Failed to load designs');
        return res.json();
      })
      .then(data => {
        setPublicDesigns({ items: Array.isArray(data.designs) ? data.designs : [], loading: false, error: null });
      })
      .catch(err => {
        if (err instanceof Error && err.name === 'AbortError') return;
        setPublicDesigns(prev => ({ ...prev, loading: false, error: err instanceof Error ? err.message : 'Failed to load designs' }));
      });
    return () => controller.abort();
  }, [product.id]);

  async function addToCart() {
    setError(null); setSuccess(null); setAdding(true);
    try {
      if (product.sizes.length && !size) { setError('Select a size'); setAdding(false); return; }
      if (product.colors.length && !color) { setError('Select a color'); setAdding(false); return; }
      const res = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product.id, size: size || 'standard', color: color || 'standard', quantity: qty })
      });
      if (!res.ok) {
        type CartError = { error?: string };
        const j: CartError = await res.json().catch(() => ({} as CartError));
        throw new Error(j.error || 'Failed to add to cart');
      }
      // Fire optimistic cart update event so badge updates immediately
      window.dispatchEvent(new CustomEvent('cart:updated', { detail: { type: 'optimistic-add', productId: product.id, size: size || 'standard', color: color || 'standard', quantity: qty } }));
      setSuccess('Added to cart');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add to cart');
    } finally {
      setAdding(false);
    }
  }

  function handleSelectRating(value: number) {
    setReviewRating(value);
  }

  async function handleReviewSubmit(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (submittingReview) return;
    if (reviewRating < 1) {
      setRatingError('Select a star rating to continue.');
      return;
    }
    setRatingError(null);
    setReviewSuccess(null);
    setSubmittingReview(true);
    try {
      const payload: Record<string, unknown> = { rating: reviewRating };
      const trimmedComment = reviewComment.trim();
      if (trimmedComment) {
        payload.comment = trimmedComment;
      }
      const orderIdToSend = ratingSummary.reviewEligibility.orderId || ratingSummary.userRating?.orderId || null;
      if (orderIdToSend) {
        payload.orderId = orderIdToSend;
      }
      const res = await fetch(`/api/products/${product.id}/rating`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.status === 401) {
        router.push(`/login?redirect=/products/${product.slug}#reviews`);
        return;
      }
      if (!res.ok) {
        const responsePayload = await res.json().catch(() => ({}));
        throw new Error(responsePayload.error || 'Failed to save review');
      }
      const data = await res.json();
      setRatingSummary(prev => ({
        ...prev,
        ratingAverage: data.ratingAverage ?? prev.ratingAverage,
        ratingCount: data.ratingCount ?? prev.ratingCount,
        userRating: data.userRating ?? prev.userRating,
      }));
      setReviewSuccess('Thanks for sharing your thoughts!');
      await fetchRatingSnapshot()
        .then(snapshot => setRatingSummary({ ...snapshot, loading: false }))
        .catch(() => undefined);
    } catch (err: unknown) {
      setRatingError(err instanceof Error ? err.message : 'Failed to save review');
    } finally {
      setSubmittingReview(false);
    }
  }

  const mainImage = product.images.find(i => i.url === activeImage) || product.images[0];
  const showDeliveredReminder = ratingSummary.reviewEligibility.eligible && !ratingSummary.userRating;
  const reviewHelperText = ratingSummary.reviewEligibility.eligible
    ? 'You received this product — tell us what you think.'
    : 'Help other makers decide by sharing fit, print, or fabric notes.';
  const reviewCharLimit = 300;
  const lastReviewUpdateLabel = ratingSummary.userRating?.updatedAt
    ? new Date(ratingSummary.userRating.updatedAt).toLocaleDateString()
    : null;

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 space-y-6">
      <div>
        <Link href="/products" className="text-xs underline text-muted hover:opacity-80">← Back to products</Link>
      </div>
      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-3">
          <Card className="p-4">
            <div className="relative w-full aspect-square bg-muted rounded overflow-hidden">
              {mainImage && (
                <Image src={mainImage.url} alt={mainImage.alt || product.name} fill sizes="(max-width:768px) 90vw, 480px" className="object-cover" />
              )}
            </div>
            {product.images.length > 1 && (
              <div className="mt-4 grid grid-cols-5 gap-2">
                {product.images.map(img => (
                  <button
                    key={img.url}
                    onClick={() => setActiveImage(img.url)}
                    className={`relative aspect-square rounded overflow-hidden border bg-muted ${activeImage === img.url ? 'ring-2 ring-primary' : ''}`}
                    aria-label={`Show image: ${img.alt || product.name}`}
                    type="button"
                  >
                    <Image src={img.url} alt={img.alt || product.name} fill sizes="120px" className="object-cover" />
                  </button>
                ))}
              </div>
            )}
          </Card>
        </div>
        <div className="space-y-5">
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-3xl font-semibold tracking-tight">{product.name}</h1>
            <button
              type="button"
              onClick={() => toggleWishlist(product.id)}
              aria-label={productIds.has(product.id) ? 'Remove from wishlist' : 'Add to wishlist'}
              className="rounded-full p-2 bg-black/40 backdrop-blur text-white hover:scale-110 transition-transform focus:outline-none focus:ring-2 ring-white/50"
            >
              <Heart className={`h-5 w-5 ${productIds.has(product.id) ? 'fill-red-500 text-red-500' : 'text-white'}`} />
            </button>
          </div>
          {product.sku && <div className="text-xs text-muted">SKU: <span className="font-mono">{product.sku}</span></div>}
          <div className="text-sm text-muted leading-relaxed whitespace-pre-line">{product.description}</div>
          <div className="flex items-center gap-3 text-sm">
            <div
              className="flex items-center gap-1 text-yellow-500"
              aria-label={`Average rating ${ratingSummary.ratingAverage.toFixed(1)} out of 5`}
            >
              {Array.from({ length: 5 }).map((_, i) => (
                <span key={i}>{i < Math.round(ratingSummary.ratingAverage ?? 0) ? '★' : '☆'}</span>
              ))}
            </div>
            <span className="text-xs text-muted">
              {ratingSummary.ratingCount > 0
                ? `${ratingSummary.ratingAverage.toFixed(1)} (${ratingSummary.ratingCount})`
                : ratingSummary.loading ? 'Loading ratings…' : 'No ratings yet'}
            </span>
          </div>
          <div className="text-2xl font-medium">${product.basePrice.toFixed(2)}</div>
          <div className="space-y-4">
            {product.sizes.length > 0 && (
              <div className="space-y-1">
                <label className="text-xs font-medium">Size</label>
                <Select
                  value={size}
                  onChange={setSize}
                  options={product.sizes.map((s) => ({ label: s, value: s }))}
                  placeholder="Select size"
                />
              </div>
            )}
            {product.colors.length > 0 && (
              <div className="space-y-1">
                <label className="text-xs font-medium">Color</label>
                <Select
                  value={color}
                  onChange={setColor}
                  options={product.colors.map((c) => ({ label: c, value: c }))}
                  placeholder="Select color"
                />
              </div>
            )}
            <div className="space-y-1">
              <label className="text-xs font-medium">Quantity</label>
              <div className="flex items-center gap-2">
                <Button variant="secondary" onClick={() => setQty(q => Math.max(1, q - 1))} disabled={qty <= 1}>-</Button>
                <Input value={qty} onChange={e => setQty(Math.max(1, parseInt(e.currentTarget.value) || 1))} type="number" className="w-20 text-center" />
                <Button variant="secondary" onClick={() => setQty(q => q + 1)}>+</Button>
              </div>
            </div>
            <Button onClick={addToCart} disabled={adding} variant="primary" className="w-full">{adding ? 'Adding...' : 'Add to Cart'}</Button>
            {(error || success) && (
              <div className="text-xs space-y-1">
                {error && <div className="text-red-600">{error}</div>}
                {success && <div className="text-green-600">{success}</div>}
              </div>
            )}
          </div>
        </div>
      </div>
        <Card id="reviews" className="p-6 space-y-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Ratings &amp; Reviews</h2>
              <p className="text-xs text-muted">
                {ratingSummary.ratingCount > 0
                  ? `${ratingSummary.ratingCount} rating${ratingSummary.ratingCount === 1 ? '' : 's'}`
                  : ratingSummary.loading ? 'Loading ratings…' : 'No ratings yet'}
              </p>
            </div>
            <div className="flex items-center gap-2 text-3xl font-semibold">
              {ratingSummary.ratingAverage.toFixed(1)}
              <div className="flex text-yellow-500 text-base">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span key={i}>{i < Math.round(ratingSummary.ratingAverage ?? 0) ? '★' : '☆'}</span>
                ))}
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <div className="space-y-1">
              <span className="text-sm font-medium">Share your review</span>
              <p className="text-xs text-muted">{reviewHelperText}</p>
            </div>
            {showDeliveredReminder && (
              <div className="rounded-lg border border-green-500/40 bg-green-500/10 p-3 text-xs text-green-700">
                {ratingSummary.reviewEligibility.orderNumber
                  ? `Order ${ratingSummary.reviewEligibility.orderNumber} arrived — tell us how it went.`
                  : 'You bought this — tell us what you think.'}
              </div>
            )}
            <form onSubmit={(event) => void handleReviewSubmit(event)} className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                {Array.from({ length: 5 }).map((_, idx) => {
                  const value = idx + 1;
                  const active = reviewRating >= value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => handleSelectRating(value)}
                      disabled={submittingReview}
                      className={`text-2xl transition-transform ${active ? 'text-yellow-500' : 'text-muted'} ${submittingReview ? 'opacity-60' : 'hover:scale-110'}`}
                      aria-label={`Rate ${value} star${value > 1 ? 's' : ''}`}
                    >
                      {active ? '★' : '☆'}
                    </button>
                  );
                })}
                <span className="text-xs text-muted">
                  {reviewRating > 0 ? `${reviewRating}/5 selected` : 'Tap a star to rate'}
                </span>
                {submittingReview && <span className="text-xs text-muted">Saving…</span>}
              </div>
              <Textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.currentTarget.value)}
                maxLength={reviewCharLimit}
                rows={4}
                placeholder="Share fit, fabric, and print notes (optional)"
              />
              <div className="flex flex-col gap-2 text-[11px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                <span>{reviewComment.length}/{reviewCharLimit} characters</span>
                <Button type="submit" disabled={submittingReview} variant="primary">
                  {submittingReview ? 'Submitting…' : ratingSummary.userRating ? 'Update review' : 'Submit review'}
                </Button>
              </div>
            </form>
            {ratingError && <p className="text-xs text-red-600">{ratingError}</p>}
            {reviewSuccess && <p className="text-xs text-green-600">{reviewSuccess}</p>}
            {lastReviewUpdateLabel && (
              <p className="text-[11px] text-muted-foreground">Last updated {lastReviewUpdateLabel}</p>
            )}
          </div>
          {ratingSummary.loading ? (
            <p className="text-xs text-muted">Loading reviews…</p>
          ) : ratingSummary.reviews.length > 0 ? (
            <div className="space-y-3">
              <div className="text-sm font-medium">What people are saying</div>
              <div className="space-y-3">
                {ratingSummary.reviews.map((r) => (
                  <div key={r.id} className="border border-muted rounded-md p-3 bg-[--surface] space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground">{r.author}</span>
                      {r.featured && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wide text-amber-600 border border-amber-500/40">Featured</span>
                      )}
                      {r.isOwner && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] text-emerald-600 border border-emerald-500/40">You</span>
                      )}
                      <span className="ml-auto text-[10px]">{r.updatedAt ? new Date(r.updatedAt).toLocaleDateString() : ''}</span>
                    </div>
                    <div className="flex text-yellow-500 text-base gap-0.5">
                      {Array.from({ length: 5 }).map((_, starIdx) => (
                        <span key={starIdx}>{starIdx < r.rating ? '★' : '☆'}</span>
                      ))}
                    </div>
                    {r.comment && <p className="text-xs text-muted">{r.comment}</p>}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted">No reviews yet. Be the first to share.</p>
          )}
        </Card>
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xl font-semibold">Community Designs</h2>
            {publicDesigns.loading && <span className="text-xs text-muted">Loading…</span>}
          </div>
          {publicDesigns.error && <p className="text-xs text-red-600">{publicDesigns.error}</p>}
          {publicDesigns.items.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {publicDesigns.items.map((design) => (
                <Card key={design.id} className="p-3 space-y-2">
                  <div className="relative aspect-square rounded-lg bg-muted overflow-hidden">
                    {design.previewImageUrl ? (
                      <Image src={design.previewImageUrl} alt={design.title} fill sizes="220px" className="object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-muted">Preview unavailable</div>
                    )}
                  </div>
                  <div className="text-sm font-medium truncate" title={design.title}>{design.title}</div>
                  {design.description && (
                    <p className="text-xs text-muted line-clamp-2">{design.description}</p>
                  )}
                </Card>
              ))}
            </div>
          ) : !publicDesigns.loading ? (
            <p className="text-xs text-muted">No community designs for this product yet.</p>
          ) : null}
        </Card>
    </div>
  );
}
