import { supabase } from '@/lib/supabase'

export interface FixedCharge {
  id: string
  created_at: string
  name: string
  default_amount: number
  is_active: boolean
}

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