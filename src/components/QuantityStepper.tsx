import { Minus, Plus } from "lucide-react";

interface Props {
  value: number;
  onChange: (next: number) => void;
  max?: number;
  label?: string;
}

export default function QuantityStepper({ value, onChange, max = 99, label = "Quantity" }: Props) {
  return (
    <div
      className="inline-flex items-center rounded-xl border border-border bg-surface-2"
      role="group"
      aria-label={label}
    >
      <button
        type="button"
        className="btn btn-ghost !rounded-l-xl !px-3"
        aria-label="Decrease quantity"
        onClick={() => onChange(Math.max(1, value - 1))}
      >
        <Minus className="h-4 w-4" aria-hidden="true" />
      </button>
      <span className="min-w-9 text-center text-sm font-bold tabular-nums" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        className="btn btn-ghost !rounded-r-xl !px-3"
        aria-label="Increase quantity"
        onClick={() => onChange(Math.min(max, value + 1))}
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}