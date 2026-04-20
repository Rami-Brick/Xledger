import { cn } from '@/lib/utils'

interface InternalEntryFieldProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  categoryLabel: string
}

export default function InternalEntryField({
  checked,
  onCheckedChange,
  categoryLabel,
}: InternalEntryFieldProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      className="flex w-full items-center justify-between gap-4 rounded-2xl px-1 py-2 text-left transition-colors hover:bg-white/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
    >
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-sm font-medium text-white">Entrée interne</span>
        <span className="text-[11px] text-white/46">
          Ne pas inclure dans les totaux. Reste visible dans {categoryLabel}.
        </span>
      </div>

      <span
        aria-hidden
        className={cn(
          'relative inline-flex h-6 w-10 shrink-0 items-center rounded-full transition-colors duration-200',
          checked ? 'bg-white/95' : 'bg-white/[0.10]',
        )}
      >
        <span
          className={cn(
            'inline-block size-5 rounded-full shadow transition-all duration-200',
            checked ? 'translate-x-[18px] bg-black' : 'translate-x-0.5 bg-white',
          )}
        />
      </span>
    </button>
  )
}
