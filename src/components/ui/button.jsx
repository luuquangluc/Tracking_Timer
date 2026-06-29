import { SlotLike } from "./slot-like.jsx";
import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils.js";

const buttonVariants = cva(
  "inline-flex min-h-[var(--touch-target)] items-center justify-center gap-2 rounded-control text-[15px] font-normal tracking-normal transition duration-200 active:scale-95 disabled:pointer-events-none disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
  {
    variants: {
      variant: {
        default: "bg-primary px-6 text-primary-foreground",
        outline: "border border-primary bg-transparent px-6 text-primary",
        secondary: "border border-border bg-surface-muted px-4 text-foreground",
        ghost: "bg-transparent px-3 text-primary hover:bg-surface-muted",
        dark: "rounded-sm bg-[#1d1d1f] px-4 text-white",
      },
      size: {
        default: "h-[var(--touch-target)]",
        sm: "h-9 min-h-9 px-4 text-sm",
        icon: "h-[var(--touch-target)] w-[var(--touch-target)] min-w-[var(--touch-target)] rounded-control p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export function Button({ className, variant, size, asChild = false, ...props }) {
  const Comp = asChild ? SlotLike : "button";
  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export { buttonVariants };
