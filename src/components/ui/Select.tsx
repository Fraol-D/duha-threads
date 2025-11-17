import clsx from "clsx";
import { forwardRef } from "react";

type Props = React.SelectHTMLAttributes<HTMLSelectElement>;

export const Select = forwardRef<HTMLSelectElement, Props>(function Select({ className, ...props }, ref) {
  return (
    <select
      ref={ref}
      className={clsx(
        "w-full rounded border border-muted bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 ring-token",
        className
      )}
      {...props}
    />
  );
});
