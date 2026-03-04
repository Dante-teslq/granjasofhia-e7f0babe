import * as React from "react";

import { cn } from "@/lib/utils";

type TooltipProviderProps = React.PropsWithChildren<{
  delayDuration?: number;
  skipDelayDuration?: number;
  disableHoverableContent?: boolean;
}>;

const TooltipProvider = ({ children }: TooltipProviderProps) => <>{children}</>;

const Tooltip = ({ children }: React.PropsWithChildren) => <>{children}</>;

const TooltipTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }
>(({ asChild = false, children, ...props }, ref) => {
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, props);
  }

  return (
    <button ref={ref} {...props}>
      {children}
    </button>
  );
});
TooltipTrigger.displayName = "TooltipTrigger";

const TooltipContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    side?: "top" | "right" | "bottom" | "left";
    align?: "start" | "center" | "end";
    sideOffset?: number;
  }
>(({ className, side, align, sideOffset, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md",
      className,
    )}
    {...props}
  />
));
TooltipContent.displayName = "TooltipContent";

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
