import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const pillButton = cva(
  [
    "inline-flex items-center justify-center gap-2 rounded-full shrink-0",
    "font-medium whitespace-nowrap select-none",
    "transition-[background-color,transform,border-color,color] duration-150",
    "disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40",
    "focus-visible:ring-offset-2",
  ],
  {
    variants: {
      variant: {
        light: [
          "bg-white/95 text-black",
          "hover:bg-white",
          "active:bg-white/85",
          "active:scale-[0.98]",
          "focus-visible:ring-offset-black",
        ],
        glass: [
          "bg-white/[0.06] text-white",
          "border border-white/[0.08]",
          "hover:bg-white/[0.10]",
          "active:bg-white/[0.04]",
          "active:scale-[0.98]",
          "focus-visible:ring-offset-black",
        ],
        ghost: [
          "bg-transparent text-white/80",
          "hover:bg-white/[0.04] hover:text-white",
          "active:bg-white/[0.02]",
          "active:scale-[0.98]",
          "focus-visible:ring-offset-black",
        ],
      },
      size: {
        sm: "h-8 px-3 text-xs [&_svg]:size-4",
        md: "h-10 px-5 text-sm [&_svg]:size-4",
        lg: "h-12 px-6 text-base [&_svg]:size-[18px]",
      },
    },
    defaultVariants: {
      variant: "light",
      size: "md",
    },
  },
);

export interface PillButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof pillButton> {
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
}

export const PillButton = forwardRef<HTMLButtonElement, PillButtonProps>(
  (
    { leadingIcon, trailingIcon, children, variant, size, className, ...props },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        type="button"
        className={cn(pillButton({ variant, size }), className)}
        {...props}
      >
        {leadingIcon && <span className="shrink-0">{leadingIcon}</span>}
        <span>{children}</span>
        {trailingIcon && <span className="shrink-0">{trailingIcon}</span>}
      </button>
    );
  },
);

PillButton.displayName = "PillButton";
