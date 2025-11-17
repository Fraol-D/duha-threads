import clsx from "clsx";
import { forwardRef } from "react";

type Props = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, Props>(function Input({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={clsx(
        "w-full rounded border border-muted bg-transparent px-3 py-2 text-sm placeholder:text-muted-text focus:outline-none focus:ring-2 ring-token",
        className
      )}
      {...props}
    />
  );
});
