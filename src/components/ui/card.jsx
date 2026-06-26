import { cn } from "../../lib/utils.js";

export function Card({ className, ...props }) {
  return <section className={cn("rounded-lg border border-black/[0.06] bg-white/88 text-card-foreground", className)} {...props} />;
}

export function CardHeader({ className, ...props }) {
  return <div className={cn("space-y-1.5 p-6", className)} {...props} />;
}

export function CardTitle({ className, ...props }) {
  return <h3 className={cn("text-[17px] font-semibold leading-tight tracking-[-0.22px]", className)} {...props} />;
}

export function CardDescription({ className, ...props }) {
  return <p className={cn("text-[14px] leading-5 tracking-[-0.12px] text-muted-foreground", className)} {...props} />;
}

export function CardContent({ className, ...props }) {
  return <div className={cn("p-6 pt-0", className)} {...props} />;
}
