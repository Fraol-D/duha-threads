import clsx from "clsx";

export function Section({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <section className={clsx("py-10 md:py-14", className)} {...props} />;
}
