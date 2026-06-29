import { cn } from "../../lib/utils.js";

export function Card({ className, ...props }) {
  return <section className={cn("rounded-sm border border-border bg-surface text-card-foreground shadow-[0_1px_0_rgba(0,0,0,0.03)]", className)} {...props} />;
}

export function CardHeader({ className, ...props }) {
  return <div className={cn("space-y-1.5 p-5 sm:p-6", className)} {...props} />;
}

export function CardTitle({ className, ...props }) {
  return <h3 className={cn("text-[17px] font-semibold leading-tight tracking-normal", className)} {...props} />;
}

export function CardDescription({ className, ...props }) {
  return <p className={cn("text-[14px] leading-5 tracking-normal text-muted-foreground", className)} {...props} />;
}

export function CardContent({ className, ...props }) {
  return <div className={cn("p-5 pt-0 sm:p-6 sm:pt-0", className)} {...props} />;
}
