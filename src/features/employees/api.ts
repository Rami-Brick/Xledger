import { supabase } from '@/lib/supabase'

export interface Employee {
  id: string
  created_at: string
  name: string
  role: string | null
  base_salary: number
  pay_day: number
  is_active: boolean
}

export type EmployeeInsert = Omit<Employee, 'id' | 'created_at'>

export async function getEmployees() {
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .order('name')

  if (error) throw error
  return data as Employee[]
}

export async function createEmployee(employee: EmployeeInsert) {
  const { data, error } = await supabase
    .from('employees')
    .insert(employee)
    .select()
    .single()

  if (error) throw error
  return data as Employee
}

export async function updateEmployee(id: string, updates: Partial<EmployeeInsert>) {
  const { data, error } = await supabase
    .from('employees')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Employee
}

export async function toggleEmployeeActive(id: string, is_active: boolean) {
  return updateEmployee(id, { is_active })
}

export async function deleteEmployee(id: string) {
  const { error } = await supabase
    .from('employees')
    .delete()
    .eq('id', id)

  if (error) throw error
}