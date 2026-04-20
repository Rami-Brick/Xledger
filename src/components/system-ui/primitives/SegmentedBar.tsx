import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const SEGMENT_COLORS = {
  blue: "bg-[#2D7CF6]",
  magenta: "bg-[#D94BF4]",
  chartreuse: "bg-[#E8F21D]",
  silver: "bg-[#D7D9DF]",
  orange: "bg-[#FF9A18]",
  cyan: "bg-[#38D3D3]",
} as const;

export type SegmentColor = keyof typeof SEGMENT_COLORS;

export interface Segment {
  value: number;
  color: SegmentColor;
  label?: string;
}

const segmentedBar = cva(
  "relative flex w-full overflow-hidden rounded-full bg-white/[0.06]",
  {
    variants: {
      size: {
        sm: "h-1",
        md: "h-2.5",
        lg: "h-4",
      },
    },
    defaultVariants: {
      size: "md",
    },
  },
);

export interface SegmentedBarProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children">,
    VariantProps<typeof segmentedBar> {
  segments: Segment[];
  "aria-label": string;
}

export const SegmentedBar = forwardRef<HTMLDivElement, SegmentedBarProps>(
  ({ segments, size, className, ...props }, ref) => {
    const validSegments = segments.filter(
      (s) => Number.isFinite(s.value) && s.value > 0,
    );
    const total = validSegments.reduce((sum, s) => sum + s.value, 0);
    const hasData = total > 0;

    return (
      <div
        ref={ref}
        role="img"
        className={cn(segmentedBar({ size }), className)}
        {...props}
      >
        {hasData &&
          validSegments.map((segment, index) => {
            const widthPercent = (segment.value / total) * 100;
            return (
              <div
                key={`${segment.color}-${index}`}
                className={cn("h-full", SEGMENT_COLORS[segment.color])}
                style={{ width: `${widthPercent}%` }}
                aria-hidden="true"
              />
            );
          })}
      </div>
    );
  },
);

SegmentedBar.displayName = "SegmentedBar";
