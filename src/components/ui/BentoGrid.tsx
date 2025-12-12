import clsx from "clsx";

interface BentoGridProps {
  children: React.ReactNode;
  className?: string;
}

export function BentoGrid({ children, className }: BentoGridProps) {
  return (
    <div className={clsx(
      "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 auto-rows-fr",
      className
    )}>
      {children}
    </div>
  );
}

interface BentoTileProps extends React.HTMLAttributes<HTMLDivElement> {
  span?: "1" | "2" | "3" | "full";
  rowSpan?: "1" | "2" | "3";
  variant?: "flat" | "glass" | "soft3D";
}

export function BentoTile({ 
  span = "1", 
  rowSpan = "1", 
  variant = "flat", 
  className, 
  children,
  ...props 
}: BentoTileProps) {
  const spanClasses = {
    "1": "md:col-span-1",
    "2": "md:col-span-2",
    "3": "lg:col-span-3",
    "full": "col-span-full"
  };
  
  const rowSpanClasses = {
    "1": "",
    "2": "md:row-span-2",
    "3": "md:row-span-3"
  };
  
  const variantClasses = {
    flat: "bg-[--surface] border border-muted",
    glass: "glass",
    soft3D: "soft-3d"
  };
  
  return (
    <div 
      className={clsx(
        "rounded-lg p-6 md:p-8",
        spanClasses[span],
        rowSpanClasses[rowSpan],
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
