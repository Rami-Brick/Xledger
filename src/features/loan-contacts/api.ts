import { supabase } from '@/lib/supabase'

export interface LoanContact {
  id: string
  created_at: string
  name: string
  description: string | null
  is_active: boolean
}

export type LoanContactInsert = Omit<LoanContact, 'id' | 'created_at'>

export async function getLoanContacts() {
  const { data, error } = await supabase.from('loan_contacts').select('*').order('name')
  if (error) throw error
  return data as LoanContact[]
}

export async function createLoanContact(contact: LoanContactInsert) {
  const { data, error } = await supabase.from('loan_contacts').insert(contact).select().single()
  if (error) throw error
  return data as LoanContact
}

export async function updateLoanContact(id: string, updates: Partial<LoanContactInsert>) {
  const { data, error } = await supabase.from('loan_contacts').update(updates).eq('id', id).select().single()
  if (error) throw error
  return data as LoanContact
}

export async function toggleLoanContactActive(id: string, is_active: boolean) {
  return updateLoanContact(id, { is_active })
}

export async function deleteLoanContact(id: string) {
  const { error } = await supabase.from('loan_contacts').delete().eq('id', id)
  if (error) throw error
}

// Get loan balance per contact (total lent - total repaid)
export async function getLoanBalances() {
  const { data, error } = await supabase
    .from('transactions')
    .select('loan_contact_id, amount, loan_contacts(name)')
    .eq('category', 'Prêts')
    .not('loan_contact_id', 'is', null)

  if (error) throw error

  const balances = new Map<string, { name: string; lent: number; repaid: number }>()

  for (const tx of data || []) {
    const id = tx.loan_contact_id as string
    const name = (tx.loan_contacts as any)?.name || 'Inconnu'
    const existing = balances.get(id) || { name, lent: 0, repaid: 0 }
    const amount = Number(tx.amount)
    if (amount > 0) {
      // Reçu — money came in (company received a loan)
      existing.lent += amount
    } else {
      // Rendu — money went out (company paid back)
      existing.repaid += Math.abs(amount)
    }
    balances.set(id, existing)
  }

  return Array.from(balances.entries()).map(([id, { name, lent, repaid }]) => ({
    loan_contact_id: id,
    name,
    total_lent: lent,
    total_repaid: repaid,
    remaining: lent - repaid,
  }))
}