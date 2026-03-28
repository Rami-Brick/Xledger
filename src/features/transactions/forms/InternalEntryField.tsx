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
    <div className="space-y-2 rounded-md border p-4">
      <div className="flex items-start gap-3">
        <input
          id="is-internal"
          type="checkbox"
          checked={checked}
          onChange={(event) => onCheckedChange(event.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-input"
        />
        <div className="space-y-1">
          <Label htmlFor="is-internal" className="cursor-pointer">
            Entree interne
          </Label>
          <p className="text-xs text-muted-foreground">
            Ne pas inclure cette entree dans les totaux globaux ni dans l&apos;historique.
            Elle restera visible dans les details de la categorie {categoryLabel}.
          </p>
        </div>
      </div>
    </div>
  )
}
