import clsx from "clsx";

export function Stepper({ steps, activeIndex = 0 }: { steps: string[]; activeIndex?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
      {steps.map((s, i) => (
        <div
          key={s}
          className={clsx(
            "text-center text-xs py-2 rounded border",
            i <= activeIndex ? "bg-black text-white border-black" : "bg-[--surface] text-[--fg] border-muted"
          )}
        >
          {s}
        </div>
      ))}
    </div>
  );
}
