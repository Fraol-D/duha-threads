export type MascotVariant = "hero" | "emptyCart" | "emptyWishlist" | "orderSuccess" | "customBuilderHelper" | "404";

export function MascotSlot({ variant }: { variant: MascotVariant }) {
  return (
    <div className="rounded border border-dashed border-muted bg-[--surface] p-6 text-center">
      {/* TODO: Replace with actual mascot illustration for variant */}
      <div className="mx-auto h-24 w-24 rounded-full border border-muted flex items-center justify-center mb-3">🤖</div>
      <div className="text-sm text-muted">Mascot: {variant}</div>
    </div>
  );
}
