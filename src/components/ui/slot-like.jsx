import { cloneElement, isValidElement } from "react";
import { cn } from "../../lib/utils.js";

export function SlotLike({ children, className, ...props }) {
  if (!isValidElement(children)) return null;
  return cloneElement(children, {
    ...props,
    className: cn(children.props.className, className),
  });
}
