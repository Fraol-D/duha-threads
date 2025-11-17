import clsx from "clsx";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={clsx("rounded border border-muted bg-[--surface]", className)} {...props} />;
}
