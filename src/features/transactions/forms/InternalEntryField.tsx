import { Label } from '@/components/ui/label'

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
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
      <div className="flex items-start gap-3">
        <input
          id="is-internal"
          type="checkbox"
          checked={checked}
          onChange={(event) => onCheckedChange(event.target.checked)}
          className="mt-0.5 size-4 rounded border-white/20 bg-transparent accent-white"
        />
        <div className="space-y-1">
          <Label htmlFor="is-internal" className="cursor-pointer text-sm text-white/90">
            Entrée interne
          </Label>
          <p className="text-xs text-white/46">
            Ne pas inclure cette entrée dans les totaux globaux ni dans l&apos;historique.
            Elle restera visible dans les détails de la catégorie {categoryLabel}.
          </p>
        </div>
      </div>
    </div>
  )
}
