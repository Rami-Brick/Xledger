import { supabase } from '@/lib/supabase'

export interface Subcategory {
  id: string
  created_at: string
  category: 'Transport' | 'Packaging'
  name: string
  is_active: boolean
}

export type SubcategoryInsert = Omit<Subcategory, 'id' | 'created_at'>

export async function getSubcategories() {
  const { data, error } = await supabase
    .from('subcategories')
    .select('*')
    .order('category')
    .order('name')

  if (error) throw error
  return data as Subcategory[]
}

export async function createSubcategory(subcategory: SubcategoryInsert) {
  const { data, error } = await supabase
    .from('subcategories')
    .insert(subcategory)
    .select()
    .single()

  if (error) throw error
  return data as Subcategory
}

export async function updateSubcategory(id: string, updates: Partial<SubcategoryInsert>) {
  const { data, error } = await supabase
    .from('subcategories')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Subcategory
}

export async function toggleSubcategoryActive(id: string, is_active: boolean) {
  return updateSubcategory(id, { is_active })
}

export async function deleteSubcategory(id: string) {
  const { error } = await supabase
    .from('subcategories')
    .delete()
    .eq('id', id)

  if (error) throw error
}