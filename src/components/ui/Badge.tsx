import clsx from "clsx";
import type { HTMLAttributes } from "react";

type BadgeVariant = "default" | "secondary";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
};

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const variantClasses =
    variant === "secondary"
      ? "bg-muted text-foreground/80 border-muted"
      : "bg-transparent text-foreground border-muted";

  return (
    <span
      className={clsx(
        "inline-flex items-center rounded border px-2 py-0.5 text-xs",
        variantClasses,
        className
      )}
      {...props}
    />
  );
}
