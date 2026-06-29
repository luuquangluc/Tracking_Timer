import { cn } from "../../lib/utils.js";

export function Progress({ value = 0, className, indicatorClassName, ...props }) {
  const safeValue = Math.max(0, Math.min(100, value));
  const width = `${safeValue}%`;
  const ariaLabel = props["aria-label"] || props["aria-labelledby"] ? undefined : "Progress";

  return (
    <div
      className={cn("relative h-2.5 w-full overflow-hidden rounded-control bg-surface-muted", className)}
      role="progressbar"
      aria-label={ariaLabel}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={safeValue}
      {...props}
    >
      <div className={cn("h-full rounded-control bg-primary transition-all duration-300", indicatorClassName)} style={{ width }} />
    </div>
  );
}
