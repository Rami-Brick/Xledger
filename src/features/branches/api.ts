import { supabase } from '@/lib/supabase'

export interface Branch {
  id: string
  slug: string
  name: string
  country_code: string
  currency_code: string
  is_active: boolean
}

export async function getMyBranches(): Promise<Branch[]> {
  const { data, error } = await supabase
    .from('branch_memberships')
    .select(`
      branch:branches (
        id,
        slug,
        name,
        country_code,
        currency_code,
        is_active
      )
    `)

  if (error) throw error

  // Supabase returns the joined row as either Branch | Branch[] depending on
  // FK shape. branch_memberships -> branches is single-valued, but the typed
  // client returns it as an array; collapse it here.
  const rows = (data ?? []) as unknown as Array<{ branch: Branch | Branch[] | null }>
  return rows
    .flatMap((r) => (Array.isArray(r.branch) ? r.branch : r.branch ? [r.branch] : []))
    .filter((b) => b.is_active)
    .sort((a, b) => a.name.localeCompare(b.name))
}
