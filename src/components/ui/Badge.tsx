import clsx from "clsx";

export function Badge({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return <span className={clsx("inline-flex items-center rounded border border-muted px-2 py-0.5 text-xs", className)} {...props} />;
}
