import { supabase } from '@/lib/supabase'
import type { Transaction } from '@/features/transactions/api'
import type { FixedCharge } from './api'
import { formatDateKey, generateFixedChargeDueDates, getTodayDateKey } from './recurrence'

export type FixedChargeRequestStatus = 'pending' | 'approved' | 'skipped'

export interface FixedChargeRequest {
  id: string
  created_at: string
  updated_at: string
  fixed_charge_id: string
  due_date: string
  suggested_amount: number
  status: FixedChargeRequestStatus
  approved_amount: number | null
  status_changed_by: string | null
  status_changed_at: string | null
  decision_note: string | null
  fixed_charges: Pick<FixedCharge, 'name' | 'default_amount' | 'is_active'> | null
}

export interface FixedChargeRequestInsert {
  fixed_charge_id: string
  due_date: string
  suggested_amount: number
}

export interface PossibleFixedChargeTransaction {
  id: string
  date: string
  amount: number
  description: string | null
  fixed_charge_id: string | null
  fixed_charge_request_id: string | null
}

const REQUEST_SELECT = `
  *,
  fixed_charges(name, default_amount, is_active)
`

function parseDate(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function addDays(value: string, days: number) {
  const date = parseDate(value)
  date.setDate(date.getDate() + days)
  return formatDateKey(date)
}

async function getCurrentUserId() {
  const { data } = await supabase.auth.getUser()
  return data.user?.id ?? null
}

export async function ensureFixedChargeRequestsGenerated(todayKey = getTodayDateKey()) {
  const { data: charges, error: chargesError } = await supabase
    .from('fixed_charges')
    .select('*')
    .eq('is_active', true)
    .eq('schedule_enabled', true)

  if (chargesError) throw chargesError

  const rows: FixedChargeRequestInsert[] = ((charges || []) as FixedCharge[]).flatMap((charge) =>
    generateFixedChargeDueDates(charge, todayKey).map((dueDate) => ({
      fixed_charge_id: charge.id,
      due_date: dueDate,
      suggested_amount: charge.default_amount,
    }))
  )

  if (rows.length === 0) return []

  const { data, error } = await supabase
    .from('fixed_charge_requests')
    .upsert(rows, {
      onConflict: 'fixed_charge_id,due_date',
      ignoreDuplicates: true,
    })
    .select(REQUEST_SELECT)

  if (error) throw error
  return (data || []) as FixedChargeRequest[]
}

export async function getPendingFixedChargeRequests() {
  const { data, error } = await supabase
    .from('fixed_charge_requests')
    .select(REQUEST_SELECT)
    .eq('status', 'pending')
    .order('due_date', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) throw error
  return (data || []) as FixedChargeRequest[]
}

export async function getUpcomingFixedChargeRequests(todayKey = getTodayDateKey()) {
  const { data, error } = await supabase
    .from('fixed_charge_requests')
    .select(REQUEST_SELECT)
    .gte('due_date', addDays(todayKey, -90))
    .lte('due_date', addDays(todayKey, 180))
    .order('due_date', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) throw error
  return (data || []) as FixedChargeRequest[]
}

async function getExistingApprovalTransaction(requestId: string) {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('fixed_charge_request_id', requestId)
    .maybeSingle()

  if (error) throw error
  return data as Transaction | null
}

async function createApprovalTransaction(request: FixedChargeRequest, amount: number) {
  const existing = await getExistingApprovalTransaction(request.id)
  if (existing) return existing

  const { data, error } = await supabase
    .from('transactions')
    .insert({
      date: request.due_date,
      category: 'Charges fixes',
      amount: -Math.abs(amount),
      description: request.fixed_charges?.name || null,
      fixed_charge_id: request.fixed_charge_id,
      fixed_charge_request_id: request.id,
      is_internal: false,
      salary_month: null,
      employee_id: null,
      product_id: null,
      subcategory_id: null,
      subscription_id: null,
      loan_contact_id: null,
    })
    .select()
    .single()

  if (error) {
    const existingAfterConflict = await getExistingApprovalTransaction(request.id)
    if (existingAfterConflict) return existingAfterConflict
    throw error
  }

  return data as Transaction
}

export async function approveFixedChargeRequest(request: FixedChargeRequest, amount: number) {
  const approvedAmount = Math.abs(amount)
  if (approvedAmount <= 0) throw new Error('Amount must be greater than 0')

  await createApprovalTransaction(request, approvedAmount)

  const userId = await getCurrentUserId()
  const { data, error } = await supabase
    .from('fixed_charge_requests')
    .update({
      status: 'approved',
      approved_amount: approvedAmount,
      status_changed_by: userId,
      status_changed_at: new Date().toISOString(),
    })
    .eq('id', request.id)
    .select(REQUEST_SELECT)
    .single()

  if (error) throw error
  return data as FixedChargeRequest
}

export async function skipFixedChargeRequest(request: FixedChargeRequest) {
  const userId = await getCurrentUserId()
  const { data, error } = await supabase
    .from('fixed_charge_requests')
    .update({
      status: 'skipped',
      status_changed_by: userId,
      status_changed_at: new Date().toISOString(),
    })
    .eq('id', request.id)
    .select(REQUEST_SELECT)
    .single()

  if (error) throw error
  return data as FixedChargeRequest
}

export async function findPossibleExistingFixedChargeTransactions(
  request: FixedChargeRequest,
  amount = request.suggested_amount
) {
  const minDate = addDays(request.due_date, -3)
  const maxDate = addDays(request.due_date, 3)
  const { data, error } = await supabase
    .from('transactions')
    .select('id, date, amount, description, fixed_charge_id, fixed_charge_request_id')
    .eq('category', 'Charges fixes')
    .eq('fixed_charge_id', request.fixed_charge_id)
    .gte('date', minDate)
    .lte('date', maxDate)

  if (error) throw error

  const absAmount = Math.abs(amount)
  const threshold = Math.max(5, absAmount * 0.1)

  return ((data || []) as PossibleFixedChargeTransaction[]).filter((transaction) => {
    if (transaction.fixed_charge_request_id === request.id) return false
    return Math.abs(Math.abs(transaction.amount) - absAmount) <= threshold
  })
}
