import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const circularIconButton = cva(
  [
    "inline-flex items-center justify-center rounded-full shrink-0",
    "transition-[background-color,transform,border-color,color] duration-150",
    "disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40",
    "focus-visible:ring-offset-2",
  ],
  {
    variants: {
      variant: {
        glass: [
          "bg-white/[0.06] text-white",
          "border border-white/[0.08]",
          "backdrop-blur-sm",
          "hover:bg-white/[0.10]",
          "active:bg-white/[0.04]",
          "active:scale-[0.98]",
          "focus-visible:ring-offset-black",
        ],
        light: [
          "bg-white/95 text-black",
          "hover:bg-white",
          "active:bg-white/85",
          "active:scale-[0.98]",
          "focus-visible:ring-offset-black",
        ],
        solid: [
          "bg-[#0A0B0A] text-white",
          "hover:bg-[#141414]",
          "active:bg-[#050505]",
          "active:scale-[0.98]",
          "focus-visible:ring-offset-white",
        ],
      },
      size: {
        sm: "size-8 [&>svg]:size-4",
        md: "size-10 [&>svg]:size-[18px]",
        lg: "size-12 [&>svg]:size-5",
      },
    },
    defaultVariants: {
      variant: "glass",
      size: "md",
    },
  },
);

export interface CircularIconButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof circularIconButton> {
  icon: ReactNode;
  "aria-label": string;
}

export const CircularIconButton = forwardRef<
  HTMLButtonElement,
  CircularIconButtonProps
>(({ icon, variant, size, className, ...props }, ref) => {
  return (
    <button
      ref={ref}
      type="button"
      className={cn(circularIconButton({ variant, size }), className)}
      {...props}
    >
      {icon}
    </button>
  );
});

CircularIconButton.displayName = "CircularIconButton";
