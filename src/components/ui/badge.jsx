import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils.js";

const badgeVariants = cva("inline-flex items-center rounded-control px-3 py-1 text-xs font-medium tracking-normal", {
  variants: {
    variant: {
      default: "bg-primary text-primary-foreground",
      secondary: "bg-secondary text-secondary-foreground",
      outline: "border border-border bg-surface text-foreground",
      dark: "bg-[#272729] text-white",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

export function Badge({ className, variant, ...props }) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
