import { forwardRef } from "react";
import clsx from "clsx";

type Variant = "primary" | "secondary" | "ghost" | "outline";
type Size = "sm" | "md" | "lg";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { className, variant = "primary", size = "md", ...props },
  ref
) {
  const base = "inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 focus:outline-none ring-token focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const sizes: Record<Size, string> = {
    sm: "px-4 py-2 text-xs",
    md: "px-6 py-3 text-sm",
    lg: "px-8 py-4 text-base",
  };

  const styles: Record<Variant, string> = {
    primary: "bg-black text-white hover:shadow-[0_6px_20px_rgba(0,0,0,0.3)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-[0_2px_8px_rgba(0,0,0,0.2)]",
    secondary: "border border-muted text-[--fg] soft-3d hover:-translate-y-0.5 active:translate-y-0",
    ghost: "text-[--fg] hover:bg-[--surface] hover:-translate-y-0.5 active:translate-y-0",
    outline: "border border-muted text-[--fg] hover:bg-[--surface] hover:-translate-y-0.5 active:translate-y-0",
  };
  
  return <button ref={ref} className={clsx(base, sizes[size], styles[variant], className)} {...props} />;
});
