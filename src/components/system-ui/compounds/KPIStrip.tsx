import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { KPIMetric } from "./KPIMetric";
import { SegmentedBar, type Segment } from "../primitives/SegmentedBar";

export interface KPIMetricData {
  id: string;
  value: ReactNode;
  label: ReactNode;
}

export interface KPIStripProps extends HTMLAttributes<HTMLDivElement> {
  metrics: KPIMetricData[];
  segments: Segment[];
  barAriaLabel: string;
}

export const KPIStrip = forwardRef<HTMLDivElement, KPIStripProps>(
  ({ metrics, segments, barAriaLabel, className, ...props }, ref) => {
    if (import.meta.env.DEV && metrics.length !== segments.length) {
      console.warn(
        "[KPIStrip] metrics and segments counts differ. The strip will still render, but correspondence becomes unclear.",
      );
    }

    return (
      <div
        ref={ref}
        className={cn("flex w-full flex-col gap-3", className)}
        {...props}
      >
        <div className="flex w-full">
          {metrics.map((metric) => (
            <KPIMetric
              key={metric.id}
              value={metric.value}
              label={metric.label}
            />
          ))}
        </div>

        <SegmentedBar
          segments={segments}
          aria-label={barAriaLabel}
        />
      </div>
    );
  },
);

KPIStrip.displayName = "KPIStrip";
