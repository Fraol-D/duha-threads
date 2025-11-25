"use client";
import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Badge } from '@/components/ui/Badge';

interface ProductListItem { id: string; name: string; slug: string; basePrice: number; category: string; primaryImage?: { url: string; alt: string }; salesCount: number; isFeatured?: boolean; featuredRank?: number | null }

export default function AdminProductsPage() {
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string|null>(null); // validation or general
  const [uploadError, setUploadError] = useState<string|null>(null); // image upload specific
  const [success, setSuccess] = useState<string|null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string|null>(null);
  const [name, setName] = useState('');
  const [price, setPrice] = useState<number>(0);
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('general');
  const [colors, setColors] = useState<string>('black,white');
  const [sizes, setSizes] = useState<string>('S,M,L,XL');
  const [isActive, setIsActive] = useState(true);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [sku, setSku] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(()=>{ load(); },[]);

  async function load() {
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/admin/products');
      if (!res.ok) throw new Error('Failed to load products');
      const data = await res.json();
      setProducts(data.products || []);
    } catch(e) { setError(e instanceof Error ? e.message : 'Failed to load products'); } finally { setLoading(false); }
  }

  async function handleUploadFiles(files: FileList | null) {
    if (!files) return;
    const list = Array.from(files).slice(0,4); // cap at 4
    const uploaded: string[] = [];
    for (const f of list) {
      const fd = new FormData();
      fd.append('file', f);
      try {
        const res = await fetch('/api/uploads/product-image', { method: 'POST', body: fd });
        if (!res.ok) {
          const j = await res.json().catch(()=>({}));
          throw new Error(j.error || 'Image upload failed');
        }
        const json = await res.json();
        if (!json.url) throw new Error('Image upload failed');
        uploaded.push(json.url);
      } catch (e) {
        setUploadError(e instanceof Error ? e.message : 'Image upload failed');
        break;
      }
    }
    if (uploaded.length) {
      setUploadError(null);
      setImageUrls(prev => [...prev, ...uploaded]);
    }
  }

  async function handleCreate() {
    setSubmitting(true); setError(null); setUploadError(null); setSuccess(null);
    try {
      if (!name.trim()) {
        setError('Name is required'); setSubmitting(false); return;
      }
      if (!description.trim()) {
        setError('Description is required'); setSubmitting(false); return;
      }
      if (price <= 0) {
        setError('Price must be positive'); setSubmitting(false); return;
      }
      if (imageUrls.length === 0) {
        setError('At least one image is required'); setSubmitting(false); return;
      }
      const payload = {
        name,
        basePrice: price,
        description,
        category,
        colors: colors.split(',').map(c=>c.trim()).filter(Boolean),
        sizes: sizes.split(',').map(s=>s.trim()).filter(Boolean),
        imageUrls,
        isActive,
        sku: sku.trim() || undefined,
      };
      const res = await fetch('/api/admin/products', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
      if (!res.ok) { const j = await res.json().catch(()=>({})); throw new Error(j.error || 'Failed to create product'); }
      await load();
      // reset form
      setShowForm(false); setEditingId(null); setName(''); setPrice(0); setDescription(''); setImageUrls([]); setSku('');
      setSuccess('Product created');
    } catch(e) { setError(e instanceof Error ? e.message : 'Failed to create product'); } finally { setSubmitting(false); }
  }

  async function openEdit(id: string) {
    setError(null);
    try {
      const res = await fetch(`/api/admin/products/${id}`);
      if (!res.ok) throw new Error('Failed to load product');
      const { product } = await res.json();
      setEditingId(id);
      setShowForm(true);
      setName(product.name);
      setPrice(product.basePrice);
      setDescription(product.description || '');
      setCategory(product.category || 'general');
      setColors((product.colors || []).join(','));
      setSizes((product.sizes || []).join(','));
      setIsActive(true);
      setImageUrls((product.images || []).map((img: { url: string }) => img.url));
      setSku(product.sku || '');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load product');
    }
  }

  async function handleUpdate() {
    if (!editingId) return;
    setSubmitting(true); setError(null); setUploadError(null); setSuccess(null);
    try {
      if (!name.trim()) { setError('Name is required'); setSubmitting(false); return; }
      if (!description.trim()) { setError('Description is required'); setSubmitting(false); return; }
      if (price < 0) { setError('Price must be non-negative'); setSubmitting(false); return; }
      if (imageUrls.length === 0) { setError('At least one image is required'); setSubmitting(false); return; }
      const payload = {
        name,
        description,
        basePrice: price,
        category,
        colors: colors.split(',').map(c=>c.trim()).filter(Boolean),
        sizes: sizes.split(',').map(s=>s.trim()).filter(Boolean),
        imageUrls,
        isActive,
        sku: sku.trim() || undefined,
      };
      const res = await fetch(`/api/admin/products/${editingId}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
      if (!res.ok) { const j = await res.json().catch(()=>({})); throw new Error(j.error || 'Failed to update product'); }
      await load();
      setShowForm(false); setEditingId(null); setName(''); setPrice(0); setDescription(''); setImageUrls([]); setSku('');
      setSuccess('Product updated');
    } catch(e) { setError(e instanceof Error ? e.message : 'Failed to update product'); } finally { setSubmitting(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this product?')) return;
    setError(null);
    try {
      const res = await fetch(`/api/admin/products/${id}`, { method: 'DELETE' });
      if (!res.ok) { const j = await res.json().catch(()=>({})); throw new Error(j.error || 'Delete failed'); }
      await load();
    } catch(e) { setError(e instanceof Error ? e.message : 'Delete failed'); }
  }

  return (
    <div className="max-w-6xl mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-3xl font-semibold tracking-tight">Admin Products</h1>
        <Button onClick={()=>{ if (showForm && editingId) { setEditingId(null); } setShowForm(v=>!v); }} variant={showForm ? 'secondary' : 'primary'}>{showForm? (editingId ? 'Close Edit' : 'Close Form') :'Add Product'}</Button>
      </div>
      {(error || uploadError) && <div className="text-sm text-red-600 space-y-1">
        {error && <div>{error}</div>}
        {uploadError && <div>{uploadError}</div>}
      </div>}
      {success && <div className="text-sm text-green-600">{success}</div>}
      {showForm && (
        <Card className="p-6 space-y-4">
          <h2 className="text-lg font-medium">{editingId ? 'Edit Product' : 'New Product'}</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="space-y-1"><label className="text-xs font-medium">Name</label><Input value={name} onChange={e=>setName(e.currentTarget.value)} /></div>
              <div className="space-y-1"><label className="text-xs font-medium">Price</label><Input type="number" value={price} onChange={e=>setPrice(parseFloat(e.currentTarget.value)||0)} /></div>
              <div className="space-y-1"><label className="text-xs font-medium">Category</label><Input value={category} onChange={e=>setCategory(e.currentTarget.value)} /></div>
              <div className="space-y-1"><label className="text-xs font-medium">Colors (csv)</label><Input value={colors} onChange={e=>setColors(e.currentTarget.value)} /></div>
              <div className="space-y-1"><label className="text-xs font-medium">Sizes (csv)</label><Input value={sizes} onChange={e=>setSizes(e.currentTarget.value)} /></div>
              <div className="space-y-1"><label className="text-xs font-medium">SKU (optional)</label><Input value={sku} onChange={e=>setSku(e.currentTarget.value)} placeholder="e.g. DT-001" /></div>
              <div className="flex items-center gap-2"><input id="isActive" type="checkbox" checked={isActive} onChange={e=>setIsActive(e.currentTarget.checked)} /><label htmlFor="isActive" className="text-xs">Active</label></div>
            </div>
            <div className="space-y-3">
              <div className="space-y-1"><label className="text-xs font-medium">Description</label><Textarea value={description} onChange={e=>setDescription(e.currentTarget.value)} rows={8} /></div>
              <div className="space-y-2">
                <label className="text-xs font-medium">Images (max 4)</label>
                <input type="file" accept="image/*" multiple onChange={e=>handleUploadFiles(e.currentTarget.files)} className="text-xs" />
                <div className="grid grid-cols-4 gap-2">
                  {imageUrls.map(u => (
                    <div key={u} className="aspect-square bg-muted rounded overflow-hidden border">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={u} alt="preview" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>
              {editingId ? (
                <div className="flex gap-2">
                  <Button disabled={submitting} onClick={handleUpdate}>{submitting? 'Saving...' : 'Update Product'}</Button>
                  <Button variant="ghost" onClick={()=>{ setEditingId(null); setShowForm(false); }}>Cancel</Button>
                </div>
              ) : (
                <Button disabled={submitting} onClick={handleCreate}>{submitting? 'Saving...':'Create Product'}</Button>
              )}
            </div>
          </div>
        </Card>
      )}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading && <div>Loading products...</div>}
        {!loading && products.map(p => (
          <Card key={p.id} className="p-4 space-y-3">
            <div className="aspect-square bg-muted rounded overflow-hidden">
              {p.primaryImage && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.primaryImage.url} alt={p.primaryImage.alt} className="w-full h-full object-cover" />
              )}
            </div>
            <div className="space-y-1">
              <div className="font-medium flex items-center gap-2">{p.name} <Badge>{p.category}</Badge>{p.isFeatured && <span className="text-[10px] px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-600">Featured</span>}</div>
              <div className="text-sm">${p.basePrice.toFixed(2)}</div>
              <div className="text-xs text-muted">Sales: {p.salesCount}</div>
              <div className="flex items-center gap-2 pt-1">
                <label className="flex items-center gap-1 text-[11px]">
                  <input
                    type="checkbox"
                    checked={!!p.isFeatured}
                    onChange={async (e) => {
                      const isFeatured = e.currentTarget.checked;
                      await fetch(`/api/admin/products/${p.id}/featured`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isFeatured, featuredRank: isFeatured ? (p.featuredRank ?? 1) : null }) });
                      load();
                    }}
                  />
                  <span>Featured</span>
                </label>
                {p.isFeatured && (
                  <input
                    type="number"
                    className="w-16 border rounded px-1 py-0.5 text-[11px]"
                    defaultValue={p.featuredRank ?? 1}
                    min={1}
                    onBlur={async (e) => {
                      const rank = parseInt(e.currentTarget.value, 10) || 1;
                      await fetch(`/api/admin/products/${p.id}/featured`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isFeatured: true, featuredRank: rank }) });
                      load();
                    }}
                    aria-label="Featured rank"
                  />
                )}
              </div>
              <div className="pt-2 flex gap-2">
                <Button variant="secondary" onClick={()=>openEdit(p.id)}>Edit</Button>
                <Button variant="ghost" onClick={()=>handleDelete(p.id)}>Delete</Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
