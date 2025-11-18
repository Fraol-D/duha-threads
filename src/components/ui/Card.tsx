import clsx from "clsx";

type CardVariant = "flat" | "glass" | "soft3D";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  interactive?: boolean;
}

export function Card({ className, variant = "flat", interactive = false, ...props }: CardProps) {
  const variants: Record<CardVariant, string> = {
    flat: "bg-[--surface] border border-muted",
    glass: "glass",
    soft3D: "soft-3d",
  };
  
  const interactiveStyles = interactive ? "shadow-3d cursor-pointer" : "";
  
  return (
    <div 
      className={clsx("rounded-lg", variants[variant], interactiveStyles, className)} 
      {...props} 
    />
  );
}
