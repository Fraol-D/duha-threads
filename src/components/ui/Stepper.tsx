import clsx from "clsx";

interface Step {
  key: string;
  label: string;
  status: 'completed' | 'current' | 'upcoming';
  clickable?: boolean; // allow navigation back to previous steps
}

interface StepperProps {
  steps: Step[];
  onStepClick?: (key: string) => void;
}

export function Stepper({ steps, onStepClick }: StepperProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {steps.map((step) => {
        const canNavigate = step.clickable && step.status !== 'current';
        return (
          <button
            type="button"
            key={step.key}
            disabled={!canNavigate}
            onClick={() => canNavigate && onStepClick?.(step.key)}
            className={clsx(
              'group relative text-center text-xs py-2 rounded border transition-colors',
              step.status === 'current' && 'bg-black text-white border-black',
              step.status === 'completed' && 'bg-token/10 text-token border-token/40',
              step.status === 'upcoming' && 'bg-[--surface] text-[--fg] border-muted',
              canNavigate && 'cursor-pointer hover:border-token hover:bg-token/5'
            )}
          >
            <span className="font-medium">{step.label}</span>
            {step.status === 'completed' && (
              <span className="absolute top-1 right-1 text-[10px]">✓</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
