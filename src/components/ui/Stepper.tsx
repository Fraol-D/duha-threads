import clsx from "clsx";

interface Step {
  label: string;
  status: "completed" | "current" | "upcoming";
}

export function Stepper({ steps, activeIndex }: { steps: string[] | Step[]; activeIndex?: number }) {
  // Handle both string[] and Step[] formats
  const stepItems: Array<{ label: string; status?: string }> = Array.isArray(steps)
    ? steps.map((s) => (typeof s === "string" ? { label: s } : s))
    : [];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
      {stepItems.map((s, i) => {
        const isActive = s.status
          ? s.status === "current" || s.status === "completed"
          : activeIndex !== undefined && i <= activeIndex;

        return (
          <div
            key={s.label}
            className={clsx(
              "text-center text-xs py-2 rounded border",
              isActive ? "bg-black text-white border-black" : "bg-[--surface] text-[--fg] border-muted"
            )}
          >
            {s.label}
          </div>
        );
      })}
    </div>
  );
}
