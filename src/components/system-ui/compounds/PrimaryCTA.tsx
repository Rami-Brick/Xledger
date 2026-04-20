import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface PrimaryCTAProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  label: ReactNode;
  icon: ReactNode;
  "aria-label": string;
}

export const PrimaryCTA = forwardRef<HTMLButtonElement, PrimaryCTAProps>(
  ({ label, icon, className, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        disabled={disabled}
        className={cn(
          "group inline-flex h-10 items-center gap-2 rounded-full",
          "bg-white/95 pl-5 pr-1 text-black",
          "transition-[background-color,transform] duration-150",
          "hover:bg-white active:bg-white/85 active:scale-[0.98]",
          "disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none",
          "focus-visible:outline-none focus-visible:ring-2",
          "focus-visible:ring-white/40 focus-visible:ring-offset-2",
          "focus-visible:ring-offset-black",
          className,
        )}
        {...props}
      >
        <span className="text-sm font-medium whitespace-nowrap">{label}</span>

        <span
          aria-hidden="true"
          className={cn(
            "inline-flex size-8 shrink-0 items-center justify-center rounded-full",
            "bg-[#0A0B0A] text-white [&>svg]:size-[18px]",
            "transition-colors duration-150",
            "group-hover:bg-[#141414]",
          )}
        >
          {icon}
        </span>
      </button>
    );
  },
);

PrimaryCTA.displayName = "PrimaryCTA";
