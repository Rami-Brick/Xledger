import { useEffect, useState, type FormEvent } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type {
  DueDayMode,
  FixedCharge,
  FixedChargeInsert,
  RecurrenceFrequency,
} from './api'

interface FixedChargeFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  charge?: FixedCharge | null
  onSubmit: (data: FixedChargeInsert) => Promise<void>
}

const weekdays = [
  { value: 1, label: 'Lundi' },
  { value: 2, label: 'Mardi' },
  { value: 3, label: 'Mercredi' },
  { value: 4, label: 'Jeudi' },
  { value: 5, label: 'Vendredi' },
  { value: 6, label: 'Samedi' },
  { value: 7, label: 'Dimanche' },
]

const months = [
  { value: 1, label: 'Janvier' },
  { value: 2, label: 'Fevrier' },
  { value: 3, label: 'Mars' },
  { value: 4, label: 'Avril' },
  { value: 5, label: 'Mai' },
  { value: 6, label: 'Juin' },
  { value: 7, label: 'Juillet' },
  { value: 8, label: 'Aout' },
  { value: 9, label: 'Septembre' },
  { value: 10, label: 'Octobre' },
  { value: 11, label: 'Novembre' },
  { value: 12, label: 'Decembre' },
]

function getTodayDateKey() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getIsoWeekday(date = new Date()) {
  const weekday = date.getDay()
  return weekday === 0 ? 7 : weekday
}

function createEmptyForm(): FixedChargeInsert {
  const now = new Date()
  return {
    name: '',
    default_amount: 0,
    is_active: true,
    schedule_enabled: false,
    recurrence_frequency: 'monthly',
    recurrence_interval: 1,
    schedule_start_date: getTodayDateKey(),
    due_day_of_week: getIsoWeekday(now),
    due_day_of_month: now.getDate(),
    due_month: now.getMonth() + 1,
    due_day_mode: 'day_of_month',
    generate_days_ahead: 45,
  }
}

function numberValue(value: string, fallback: number) {
  const next = Number(value)
  return Number.isFinite(next) ? next : fallback
}

export default function FixedChargeFormDialog({
  open,
  onOpenChange,
  charge,
  onSubmit,
}: FixedChargeFormDialogProps) {
  const [form, setForm] = useState<FixedChargeInsert>(createEmptyForm)
  const [loading, setLoading] = useState(false)

  const isEditing = !!charge

  useEffect(() => {
    if (charge) {
      setForm({
        name: charge.name,
        default_amount: charge.default_amount,
        is_active: charge.is_active,
        schedule_enabled: charge.schedule_enabled,
        recurrence_frequency: charge.recurrence_frequency,
        recurrence_interval: charge.recurrence_interval,
        schedule_start_date: charge.schedule_start_date,
        due_day_of_week: charge.due_day_of_week,
        due_day_of_month: charge.due_day_of_month,
        due_month: charge.due_month,
        due_day_mode: charge.due_day_mode,
        generate_days_ahead: charge.generate_days_ahead,
      })
    } else {
      setForm(createEmptyForm())
    }
  }, [charge, open])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await onSubmit(form)
      onOpenChange(false)
    } finally {
      setLoading(false)
    }
  }

  const handleScheduleToggle = (enabled: boolean) => {
    setForm((current) => ({
      ...current,
      schedule_enabled: enabled,
      schedule_start_date: current.schedule_start_date || getTodayDateKey(),
      due_day_of_week: current.due_day_of_week || getIsoWeekday(),
      due_day_of_month: current.due_day_of_month || new Date().getDate(),
      due_month: current.due_month || new Date().getMonth() + 1,
      recurrence_interval: current.recurrence_interval || 1,
      generate_days_ahead: current.generate_days_ahead || 45,
    }))
  }

  const handleFrequencyChange = (frequency: RecurrenceFrequency) => {
    setForm((current) => ({
      ...current,
      recurrence_frequency: frequency,
      due_day_of_week: current.due_day_of_week || getIsoWeekday(),
      due_day_of_month: current.due_day_of_month || new Date().getDate(),
      due_month: current.due_month || new Date().getMonth() + 1,
    }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Modifier la charge' : 'Ajouter une charge fixe'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nom de la charge</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ex: Loyer bureau, Internet, Electricite"
              required
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="default_amount">Montant par defaut (TND)</Label>
            <Input
              id="default_amount"
              type="number"
              step="1"
              min="0"
              value={form.default_amount || ''}
              onChange={(e) =>
                setForm({ ...form, default_amount: parseFloat(e.target.value) || 0 })
              }
              required
            />
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
            <label className="flex items-center justify-between gap-3">
              <span className="min-w-0">
                <span className="block text-sm font-medium text-white">Planification</span>
                <span className="mt-0.5 block text-xs text-white/46">
                  Creer automatiquement des charges a valider.
                </span>
              </span>
              <input
                type="checkbox"
                checked={form.schedule_enabled}
                onChange={(e) => handleScheduleToggle(e.target.checked)}
                className="size-5 accent-white"
              />
            </label>

            {form.schedule_enabled && (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Periodicite</Label>
                  <Select
                    value={form.recurrence_frequency}
                    onValueChange={(value) =>
                      handleFrequencyChange(value as RecurrenceFrequency)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Hebdomadaire</SelectItem>
                      <SelectItem value="monthly">Mensuelle</SelectItem>
                      <SelectItem value="yearly">Annuelle</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="recurrence_interval">Tous les</Label>
                  <Input
                    id="recurrence_interval"
                    type="number"
                    min="1"
                    step="1"
                    value={form.recurrence_interval || ''}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        recurrence_interval: Math.max(1, numberValue(e.target.value, 1)),
                      })
                    }
                    required={form.schedule_enabled}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="schedule_start_date">Debut</Label>
                  <Input
                    id="schedule_start_date"
                    type="date"
                    value={form.schedule_start_date || ''}
                    onChange={(e) =>
                      setForm({ ...form, schedule_start_date: e.target.value || null })
                    }
                    required={form.schedule_enabled}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="generate_days_ahead">Generer a l&apos;avance</Label>
                  <Input
                    id="generate_days_ahead"
                    type="number"
                    min="0"
                    max="730"
                    step="1"
                    value={form.generate_days_ahead || ''}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        generate_days_ahead: Math.min(
                          730,
                          Math.max(0, numberValue(e.target.value, 45))
                        ),
                      })
                    }
                    required={form.schedule_enabled}
                  />
                </div>

                {form.recurrence_frequency === 'weekly' && (
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Jour de la semaine</Label>
                    <Select
                      value={String(form.due_day_of_week || getIsoWeekday())}
                      onValueChange={(value) =>
                        setForm({ ...form, due_day_of_week: Number(value) })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {weekdays.map((weekday) => (
                          <SelectItem key={weekday.value} value={String(weekday.value)}>
                            {weekday.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {form.recurrence_frequency === 'yearly' && (
                  <div className="space-y-2">
                    <Label>Mois</Label>
                    <Select
                      value={String(form.due_month || new Date().getMonth() + 1)}
                      onValueChange={(value) => setForm({ ...form, due_month: Number(value) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {months.map((month) => (
                          <SelectItem key={month.value} value={String(month.value)}>
                            {month.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {form.recurrence_frequency !== 'weekly' && (
                  <>
                    <div className="space-y-2">
                      <Label>Jour</Label>
                      <Select
                        value={form.due_day_mode}
                        onValueChange={(value) =>
                          setForm({ ...form, due_day_mode: value as DueDayMode })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="day_of_month">Jour exact</SelectItem>
                          <SelectItem value="last_day_of_month">Dernier jour</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {form.due_day_mode === 'day_of_month' && (
                      <div className="space-y-2">
                        <Label htmlFor="due_day_of_month">Jour du mois</Label>
                        <Input
                          id="due_day_of_month"
                          type="number"
                          min="1"
                          max="31"
                          step="1"
                          value={form.due_day_of_month || ''}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              due_day_of_month: Math.min(
                                31,
                                Math.max(1, numberValue(e.target.value, 1))
                              ),
                            })
                          }
                          required={form.schedule_enabled}
                        />
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Enregistrement...' : isEditing ? 'Modifier' : 'Ajouter'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
