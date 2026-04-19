import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const pillStat = cva(
  "inline-flex h-12 min-w-0 items-center justify-between gap-3 rounded-full px-4",
  {
    variants: {
      variant: {
        light: "bg-white/95",
        muted: "bg-[#C7C9CE]",
        accent: "bg-[#DFFF2F]",
      },
    },
    defaultVariants: {
      variant: "light",
    },
  },
);

const label = cva("min-w-0 text-[12px] font-medium leading-tight", {
  variants: {
    variant: {
      light: "text-black/55",
      muted: "text-black/55",
      accent: "text-black/70",
    },
  },
  defaultVariants: {
    variant: "light",
  },
});

const value = cva("shrink-0 whitespace-nowrap text-[13px] text-black tracking-tight", {
  variants: {
    variant: {
      light: "font-semibold",
      muted: "font-semibold",
      accent: "font-bold",
    },
  },
  defaultVariants: {
    variant: "light",
  },
});

export interface PillStatProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children">,
    VariantProps<typeof pillStat> {
  label: ReactNode;
  value: ReactNode;
}

export const PillStat = forwardRef<HTMLDivElement, PillStatProps>(
  ({ label: labelNode, value: valueNode, variant, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(pillStat({ variant }), className)}
        {...props}
      >
        <span className={label({ variant })}>{labelNode}</span>
        <span className={value({ variant })}>{valueNode}</span>
      </div>
    );
  },
);

PillStat.displayName = "PillStat";
