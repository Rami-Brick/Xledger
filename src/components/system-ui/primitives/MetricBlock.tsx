import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const metricBlock = cva("flex flex-col gap-1", {
  variants: {
    align: {
      left: "items-start text-left",
      right: "items-end text-right",
    },
  },
  defaultVariants: {
    align: "left",
  },
});

const metricValue = cva("text-white font-semibold tracking-tight leading-none", {
  variants: {
    size: {
      sm: "text-[17px]",
      md: "text-[20px]",
      lg: "text-[28px]",
    },
  },
  defaultVariants: {
    size: "md",
  },
});

const metricLabel = cva("text-white/[0.46] font-normal leading-snug", {
  variants: {
    size: {
      sm: "text-[11px]",
      md: "text-xs",
      lg: "text-[12px]",
    },
  },
  defaultVariants: {
    size: "md",
  },
});

export interface MetricBlockProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children">,
    VariantProps<typeof metricBlock> {
  value: ReactNode;
  label: ReactNode;
  size?: "sm" | "md" | "lg";
}

export const MetricBlock = forwardRef<HTMLDivElement, MetricBlockProps>(
  ({ value, label, align, size = "md", className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(metricBlock({ align }), className)}
        {...props}
      >
        <span className={metricValue({ size })}>{value}</span>
        <span className={metricLabel({ size })}>{label}</span>
      </div>
    );
  },
);

MetricBlock.displayName = "MetricBlock";
