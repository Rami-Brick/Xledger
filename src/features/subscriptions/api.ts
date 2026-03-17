import { supabase } from '@/lib/supabase'

export interface Subscription {
  id: string
  created_at: string
  name: string
  default_amount: number
  is_active: boolean
}

export type SubscriptionInsert = Omit<Subscription, 'id' | 'created_at'>

export async function getSubscriptions() {
  const { data, error } = await supabase.from('subscriptions').select('*').order('name')
  if (error) throw error
  return data as Subscription[]
}

export async function createSubscription(sub: SubscriptionInsert) {
  const { data, error } = await supabase.from('subscriptions').insert(sub).select().single()
  if (error) throw error
  return data as Subscription
}

export async function updateSubscription(id: string, updates: Partial<SubscriptionInsert>) {
  const { data, error } = await supabase.from('subscriptions').update(updates).eq('id', id).select().single()
  if (error) throw error
  return data as Subscription
}

export async function toggleSubscriptionActive(id: string, is_active: boolean) {
  return updateSubscription(id, { is_active })
}

export async function deleteSubscription(id: string) {
  const { error } = await supabase.from('subscriptions').delete().eq('id', id)
  if (error) throw error
}