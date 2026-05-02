import { supabase } from '@/lib/supabase'

export interface FixedCharge {
  id: string
  created_at: string
  name: string
  default_amount: number
  is_active: boolean
  schedule_enabled: boolean
  recurrence_frequency: RecurrenceFrequency
  recurrence_interval: number
  schedule_start_date: string | null
  due_day_of_week: number | null
  due_day_of_month: number | null
  due_month: number | null
  due_day_mode: DueDayMode
  generate_days_ahead: number
}

export type RecurrenceFrequency = 'weekly' | 'monthly' | 'yearly'
export type DueDayMode = 'day_of_month' | 'last_day_of_month'
export type FixedChargeInsert = Omit<FixedCharge, 'id' | 'created_at'>

export async function getFixedCharges() {
  const { data, error } = await supabase
    .from('fixed_charges')
    .select('*')
    .order('name')

  if (error) throw error
  return data as FixedCharge[]
}

export async function createFixedCharge(charge: FixedChargeInsert) {
  const { data, error } = await supabase
    .from('fixed_charges')
    .insert(charge)
    .select()
    .single()

  if (error) throw error
  return data as FixedCharge
}

export async function updateFixedCharge(id: string, updates: Partial<FixedChargeInsert>) {
  const { data, error } = await supabase
    .from('fixed_charges')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as FixedCharge
}

export async function toggleFixedChargeActive(id: string, is_active: boolean) {
  return updateFixedCharge(id, { is_active })
}

export async function deleteFixedCharge(id: string) {
  const { error } = await supabase
    .from('fixed_charges')
    .delete()
    .eq('id', id)

  if (error) throw error
}
