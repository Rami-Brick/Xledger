import { cva, type VariantProps } from "class-variance-authority";
import {
  forwardRef,
  useMemo,
  useState,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

const AVATAR_COLORS = {
  blue: "bg-[#2D7CF6] text-white",
  magenta: "bg-[#D94BF4] text-white",
  chartreuse: "bg-[#E8F21D] text-white",
  silver: "bg-[#D7D9DF] text-black",
  orange: "bg-[#FF9A18] text-white",
  cyan: "bg-[#38D3D3] text-white",
  neutral: "bg-white/[0.08] text-white",
} as const;

export type AvatarCircleColor = keyof typeof AVATAR_COLORS;

const avatarCircle = cva("relative inline-flex shrink-0 rounded-full", {
  variants: {
    size: {
      sm: "size-6",
      md: "size-9",
      lg: "size-14",
    },
  },
  defaultVariants: {
    size: "md",
  },
});

const initialText = cva("font-semibold leading-none select-none", {
  variants: {
    size: {
      sm: "text-[10px]",
      md: "text-sm",
      lg: "text-[22px]",
    },
  },
  defaultVariants: {
    size: "md",
  },
});

export interface AvatarCircleProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "color">,
    VariantProps<typeof avatarCircle> {
  name: string;
  src?: string;
  initial?: string;
  color?: AvatarCircleColor;
  badge?: ReactNode;
}

export const AvatarCircle = forwardRef<HTMLDivElement, AvatarCircleProps>(
  (
    {
      name,
      src,
      initial: initialOverride,
      color = "neutral",
      size,
      badge,
      className,
      ...props
    },
    ref,
  ) => {
    const [imageFailed, setImageFailed] = useState(false);

    const showImage = Boolean(src) && !imageFailed;

    const derivedInitial = useMemo(() => {
      const trimmed = name.trim();
      const fallback = trimmed ? trimmed.charAt(0).toUpperCase() : "?";
      return initialOverride?.trim() || fallback;
    }, [name, initialOverride]);

    return (
      <div ref={ref} className={cn(avatarCircle({ size }), className)} {...props}>
        <div
          className={cn(
            "flex h-full w-full items-center justify-center rounded-full",
            AVATAR_COLORS[color],
            showImage && "p-[2px]",
          )}
          role={showImage ? undefined : "img"}
          aria-label={showImage ? undefined : name}
        >
          {showImage ? (
            <img
              src={src}
              alt={name}
              onError={() => setImageFailed(true)}
              className="h-full w-full rounded-full object-cover"
            />
          ) : (
            <span aria-hidden="true" className={initialText({ size })}>
              {derivedInitial}
            </span>
          )}
        </div>

        {badge ? <div className="absolute -right-0.5 -top-0.5 z-10">{badge}</div> : null}
      </div>
    );
  },
);

AvatarCircle.displayName = "AvatarCircle";
