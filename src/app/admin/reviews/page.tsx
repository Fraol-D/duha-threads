"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

interface ReviewListItem {
  id: string;
  rating: number;
  comment: string;
  featured: boolean;
  updatedAt: string;
  user: { name: string };
  product: { name: string };
}

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<ReviewListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/reviews");
      if (!res.ok) {
        throw new Error("Failed to load reviews");
      }
      const data = await res.json();
      setReviews(data.reviews || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load reviews");
    } finally {
      setLoading(false);
    }
  }

  async function toggleFeatured(id: string, next: boolean) {
    setTogglingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/reviews/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ featured: next }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to update review");
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update review");
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <div className="max-w-5xl mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Reviews</h1>
        <Button variant="secondary" onClick={load} disabled={loading}>
          Refresh
        </Button>
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      {loading && <p className="text-sm text-muted-foreground">Loading reviews…</p>}
      <div className="grid gap-4">
        {reviews.map((review) => (
          <Card key={review.id} className="p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold">{review.product.name}</p>
                <p className="text-xs text-muted-foreground">{review.user.name}</p>
              </div>
              <Badge>{review.rating.toFixed(1)} ★</Badge>
            </div>
            <p className="text-sm text-foreground leading-relaxed">{review.comment || "(no comment)"}</p>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Updated {new Date(review.updatedAt).toLocaleDateString()}</span>
              <Button
                variant={review.featured ? "primary" : "outline"}
                size="sm"
                className="text-xs"
                onClick={() => toggleFeatured(review.id, !review.featured)}
                disabled={togglingId === review.id}
              >
                {review.featured ? "Featured" : "Set as featured"}
              </Button>
            </div>
          </Card>
        ))}
        {!loading && reviews.length === 0 && (
          <Card className="p-6 text-center text-sm text-muted-foreground">
            No reviews yet.
          </Card>
        )}
      </div>
    </div>
  );
}
