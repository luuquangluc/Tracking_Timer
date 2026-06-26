import { useEffect, useId, useRef } from "react";
import { cn } from "../../lib/utils.js";

export function Dialog({ open, onOpenChange, title, description, children }) {
  const ref = useRef(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="w-[min(760px,calc(100vw-28px))] rounded-lg border border-border bg-card p-0 text-card-foreground backdrop:bg-black/45"
      aria-labelledby={title ? titleId : undefined}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(event) => {
        event.preventDefault();
        onOpenChange?.(false);
      }}
      onClose={() => onOpenChange?.(false)}
    >
      {title ? <span id={titleId} className="sr-only">{title}</span> : null}
      {description ? <span id={descriptionId} className="sr-only">{description}</span> : null}
      {children}
    </dialog>
  );
}

export function DialogContent({ className, ...props }) {
  return <div className={cn("p-5 sm:p-6", className)} {...props} />;
}

export function DialogHeader({ className, ...props }) {
  return <div className={cn("mb-5 flex items-start justify-between gap-4", className)} {...props} />;
}

export function DialogTitle({ className, ...props }) {
  return <h2 className={cn("text-2xl font-semibold tracking-[-0.28px]", className)} {...props} />;
}

export function DialogDescription({ className, ...props }) {
  return <p className={cn("mt-1 text-sm text-muted-foreground", className)} {...props} />;
}

export function DialogFooter({ className, ...props }) {
  return <div className={cn("mt-6 grid gap-3 sm:flex sm:justify-between", className)} {...props} />;
}
