import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-10 w-full min-w-0 rounded-full border border-white/[0.08] bg-white/[0.04] px-4 text-sm text-white transition-colors outline-none",
        "file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-white",
        "placeholder:text-white/46",
        "focus-visible:border-white/30 focus-visible:bg-white/[0.06]",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-40",
        "aria-invalid:border-[#FF9A18]/50 aria-invalid:ring-2 aria-invalid:ring-[#FF9A18]/20",
        "[color-scheme:dark]",
        className
      )}
      {...props}
    />
  )
}

export { Input }
