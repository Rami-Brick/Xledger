import { supabase } from '@/lib/supabase'

export interface InvestmentRecipient {
  id: string
  created_at: string
  branch_id: string
  name: string
  description: string | null
  is_active: boolean
}

export type InvestmentRecipientInsert = Omit<InvestmentRecipient, 'id' | 'created_at'>

export async function getInvestmentRecipients(branchId: string) {
  const { data, error } = await supabase
    .from('investment_recipients')
    .select('*')
    .eq('branch_id', branchId)
    .order('name')
  if (error) throw error
  return data as InvestmentRecipient[]
}

export async function createInvestmentRecipient(recipient: InvestmentRecipientInsert) {
  const { data, error } = await supabase
    .from('investment_recipients')
    .insert(recipient)
    .select()
    .single()
  if (error) throw error
  return data as InvestmentRecipient
}

export async function updateInvestmentRecipient(
  id: string,
  updates: Partial<InvestmentRecipientInsert>,
) {
  const { data, error } = await supabase
    .from('investment_recipients')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as InvestmentRecipient
}

export async function toggleInvestmentRecipientActive(id: string, is_active: boolean) {
  return updateInvestmentRecipient(id, { is_active })
}

export async function deleteInvestmentRecipient(id: string) {
  const { error } = await supabase.from('investment_recipients').delete().eq('id', id)
  if (error) throw error
}

// Per-recipient invested/returned/net for the active branch.
// Sign convention: negative tx amount = Investi (money out), positive = Retour.
export async function getInvestmentBalances(branchId: string) {
  const { data, error } = await supabase
    .from('transactions')
    .select('investment_recipient_id, amount, investment_recipients(name)')
    .eq('branch_id', branchId)
    .eq('category', 'Investissements')
    .not('investment_recipient_id', 'is', null)

  if (error) throw error

  const balances = new Map<string, { name: string; invested: number; returned: number }>()

  for (const tx of data || []) {
    const id = tx.investment_recipient_id as string
    const name = (tx.investment_recipients as any)?.name || 'Inconnu'
    const existing = balances.get(id) || { name, invested: 0, returned: 0 }
    const amount = Number(tx.amount)
    if (amount < 0) existing.invested += Math.abs(amount)
    else existing.returned += amount
    balances.set(id, existing)
  }

  return Array.from(balances.entries()).map(([id, { name, invested, returned }]) => ({
    investment_recipient_id: id,
    name,
    total_invested: invested,
    total_returned: returned,
    net_invested: invested - returned,
  }))
}
