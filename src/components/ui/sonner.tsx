import { Toaster as Sonner, type ToasterProps } from "sonner"
import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      icons={{
        success: (
          <CircleCheckIcon className="size-4 text-[#B8EB3C]" />
        ),
        info: (
          <InfoIcon className="size-4 text-[#38D3D3]" />
        ),
        warning: (
          <TriangleAlertIcon className="size-4 text-[#FF9A18]" />
        ),
        error: (
          <OctagonXIcon className="size-4 text-[#FF9A18]" />
        ),
        loading: (
          <Loader2Icon className="size-4 animate-spin text-white/72" />
        ),
      }}
      style={
        {
          "--normal-bg": "#141414",
          "--normal-text": "#FFFFFF",
          "--normal-border": "rgba(255,255,255,0.08)",
          "--success-bg": "#141414",
          "--success-text": "#FFFFFF",
          "--success-border": "rgba(184,235,60,0.25)",
          "--error-bg": "#141414",
          "--error-text": "#FFFFFF",
          "--error-border": "rgba(255,154,24,0.25)",
          "--warning-bg": "#141414",
          "--warning-text": "#FFFFFF",
          "--warning-border": "rgba(255,154,24,0.25)",
          "--info-bg": "#141414",
          "--info-text": "#FFFFFF",
          "--info-border": "rgba(56,211,211,0.25)",
          "--border-radius": "20px",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast:
            "!bg-[#141414] !text-white !border !border-white/[0.08] !shadow-xl !rounded-2xl !font-sans backdrop-blur-xl",
          title: "!text-white !text-sm !font-semibold",
          description: "!text-white/60 !text-xs",
          actionButton:
            "!bg-white/95 !text-black !rounded-full !h-7 !px-3 !text-xs !font-medium",
          cancelButton:
            "!bg-white/[0.06] !text-white !border !border-white/[0.08] !rounded-full !h-7 !px-3 !text-xs !font-medium",
          closeButton:
            "!bg-white/[0.06] !text-white !border-white/[0.08] hover:!bg-white/[0.10]",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
