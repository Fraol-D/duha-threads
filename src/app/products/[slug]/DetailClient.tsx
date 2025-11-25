"use client";
import { useState } from 'react';
import type { PublicProduct } from '@/types/product';
import Link from 'next/link';
import Image from 'next/image';
import { Card } from '@/components/ui/Card';
import { Heart } from 'lucide-react';
import { useWishlist } from '@/components/WishlistProvider';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';

export default function DetailClient({ product }: { product: PublicProduct }) {
  const [size, setSize] = useState(product.sizes[0] || '');
  const [color, setColor] = useState(product.colors[0] || '');
  const [qty, setQty] = useState(1);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeImage, setActiveImage] = useState<string | null>(product.images.find(i => i.isPrimary)?.url || product.images[0]?.url || null);
  const { productIds, toggleWishlist } = useWishlist();

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

  const mainImage = product.images.find(i => i.url === activeImage) || product.images[0];

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
            <div className="flex items-center gap-1 text-yellow-500" aria-label="Rating placeholder">
              {Array.from({ length: 5 }).map((_, i) => (
                <span key={i}>{'★'}</span>
              ))}
            </div>
            <span className="text-xs text-muted">4.8 (placeholder)</span>
          </div>
          <div className="text-2xl font-medium">${product.basePrice.toFixed(2)}</div>
          <div className="space-y-4">
            {product.sizes.length > 0 && (
              <div className="space-y-1">
                <label className="text-xs font-medium">Size</label>
                <Select value={size} onChange={e => setSize(e.currentTarget.value)}>
                  {product.sizes.map(s => <option key={s} value={s}>{s}</option>)}
                </Select>
              </div>
            )}
            {product.colors.length > 0 && (
              <div className="space-y-1">
                <label className="text-xs font-medium">Color</label>
                <Select value={color} onChange={e => setColor(e.currentTarget.value)}>
                  {product.colors.map(c => <option key={c} value={c}>{c}</option>)}
                </Select>
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
    </div>
  );
}
