import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface PanelHeaderProps extends HTMLAttributes<HTMLDivElement> {
  leading: ReactNode;
  center?: ReactNode;
  trailing?: ReactNode;
}

export const PanelHeader = forwardRef<HTMLDivElement, PanelHeaderProps>(
  ({ leading, center, trailing, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("flex w-full items-center justify-between gap-4", className)}
        {...props}
      >
        <div className="flex shrink-0 items-center gap-3">
          {leading}
        </div>

        {center ? (
          <div className="flex flex-1 items-center justify-center">
            {center}
          </div>
        ) : null}

        {trailing ? (
          <div className="flex shrink-0 items-center gap-2">
            {trailing}
          </div>
        ) : null}
      </div>
    );
  },
);

PanelHeader.displayName = "PanelHeader";
