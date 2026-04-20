import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { MetricBlock } from "../primitives/MetricBlock";

export interface KPIMetricProps extends HTMLAttributes<HTMLDivElement> {
  value: ReactNode;
  label: ReactNode;
}

export const KPIMetric = forwardRef<HTMLDivElement, KPIMetricProps>(
  ({ value, label, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("flex flex-1 flex-col", className)}
        {...props}
      >
        <MetricBlock
          value={value}
          label={label}
          size="lg"
          align="left"
        />
      </div>
    );
  },
);

KPIMetric.displayName = "KPIMetric";
