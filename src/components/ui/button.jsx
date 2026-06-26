import { SlotLike } from "./slot-like.jsx";
import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils.js";

const buttonVariants = cva(
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full text-[15px] font-normal tracking-[-0.12px] transition active:scale-95 disabled:pointer-events-none disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
  {
    variants: {
      variant: {
        default: "bg-primary px-6 text-primary-foreground",
        outline: "border border-primary bg-transparent px-6 text-primary",
        secondary: "border border-black/5 bg-[#fafafc] px-4 text-[#333]",
        ghost: "bg-transparent px-3 text-primary hover:bg-black/[0.03]",
        dark: "rounded-sm bg-[#1d1d1f] px-4 text-white",
      },
      size: {
        default: "h-11",
        sm: "h-9 min-h-9 px-4 text-sm",
        icon: "h-11 w-11 min-w-11 rounded-full p-0",
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
