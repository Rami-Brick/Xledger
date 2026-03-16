import { supabase } from '@/lib/supabase'

export interface Product {
  id: string
  created_at: string
  name: string
  description: string | null
  is_active: boolean
}

export type ProductInsert = Omit<Product, 'id' | 'created_at'>

export async function getProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('name')

  if (error) throw error
  return data as Product[]
}

export async function createProduct(product: ProductInsert) {
  const { data, error } = await supabase
    .from('products')
    .insert(product)
    .select()
    .single()

  if (error) throw error
  return data as Product
}

export async function updateProduct(id: string, updates: Partial<ProductInsert>) {
  const { data, error } = await supabase
    .from('products')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Product
}

export async function toggleProductActive(id: string, is_active: boolean) {
  return updateProduct(id, { is_active })
}

export async function deleteProduct(id: string) {
  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', id)

  if (error) throw error
}