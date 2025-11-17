import { forwardRef } from "react";
import clsx from "clsx";

type Variant = "primary" | "secondary" | "ghost";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { className, variant = "primary", ...props },
  ref
) {
  const base = "inline-flex items-center justify-center rounded px-4 py-2 text-sm transition focus:outline-none ring-token focus:ring-2";
  const styles: Record<Variant, string> = {
    primary: "bg-black text-white hover:opacity-90 disabled:opacity-50",
    secondary: "border border-muted text-[--fg] hover:bg-[--surface] disabled:opacity-50",
    ghost: "text-[--fg] hover:bg-[--surface] disabled:opacity-50",
  };
  return <button ref={ref} className={clsx(base, styles[variant], className)} {...props} />;
});
