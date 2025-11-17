import clsx from "clsx";
import { forwardRef } from "react";

type Props = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = forwardRef<HTMLTextAreaElement, Props>(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={clsx(
        "w-full rounded border border-muted bg-transparent px-3 py-2 text-sm placeholder:text-muted-text focus:outline-none focus:ring-2 ring-token",
        className
      )}
      {...props}
    />
  );
});
