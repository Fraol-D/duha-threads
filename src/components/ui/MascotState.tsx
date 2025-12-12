"use client";
import clsx from "clsx";

type Variant = "loading" | "empty" | "error" | "success";

export type MascotStateProps = {
  variant: Variant;
  title?: string;
  message?: string;
  actionLabel?: string;
  onActionClick?: () => void;
  className?: string;
};

const DEFAULT_TITLES: Record<Variant, string> = {
  loading: "Loading...",
  empty: "Nothing here yet",
  error: "Something went wrong",
  success: "All set",
};

const ACCENTS: Record<Variant, string> = {
  loading: "text-indigo-500",
  empty: "text-muted-foreground",
  error: "text-red-500",
  success: "text-emerald-500",
};

const BUBBLE_CLASSES: Record<Variant, string> = {
  loading: "border-indigo-200 bg-indigo-50/30 dark:border-indigo-500/30 dark:bg-indigo-500/5",
  empty: "border-muted bg-[--surface-alt]",
  error: "border-red-200 bg-red-50/40 dark:border-red-500/20 dark:bg-red-500/5",
  success: "border-emerald-200 bg-emerald-50/40 dark:border-emerald-500/20 dark:bg-emerald-500/5",
};

export function MascotState({ variant, title, message, actionLabel, onActionClick, className }: MascotStateProps) {
  const resolvedTitle = title ?? DEFAULT_TITLES[variant];
  const resolvedMessage = message;

  return (
    <div
      className={clsx(
        "flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-muted/60 bg-[--surface] px-6 py-10 text-center shadow-inner",
        className,
      )}
    >
      <div className="relative">
        <div
          className={clsx(
            "h-28 w-28 rounded-full border bg-[--surface-alt] flex items-center justify-center",
            BUBBLE_CLASSES[variant],
            variant === "loading" && "animate-pulse",
          )}
        >
          <ThreadMascot variant={variant} />
        </div>
        {variant === "loading" && (
          <span className="pointer-events-none absolute inset-0 -z-10 animate-ping rounded-full border border-indigo-200" />
        )}
      </div>
      <div className="space-y-2 max-w-md">
        <p className="text-base font-semibold text-foreground">{resolvedTitle}</p>
        {resolvedMessage && <p className="text-sm text-muted-foreground">{resolvedMessage}</p>}
      </div>
      {actionLabel && onActionClick && (
        <button
          type="button"
          onClick={onActionClick}
          className="inline-flex items-center gap-2 rounded-full border border-token px-4 py-1.5 text-sm font-medium text-token hover:bg-token/10"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

function ThreadMascot({ variant }: { variant: Variant }) {
  const accent = ACCENTS[variant];
  const eyeClass = clsx("h-1.5 w-1.5 rounded-full bg-current", accent);
  return (
    <div className={clsx("flex flex-col items-center gap-1 text-4xl", accent)}>
      <div className="relative flex items-center justify-center gap-3">
        <span className={eyeClass} />
        <span className={eyeClass} />
      </div>
      <div className="text-3xl">
        {variant === "loading" && "🧵"}
        {variant === "empty" && "🪡"}
        {variant === "error" && "💢"}
        {variant === "success" && "✨"}
      </div>
      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground/80">Duha</div>
    </div>
  );
}
