import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/features/auth/AuthProvider'

export type UserRole = 'admin' | 'mod' | 'viewer'

interface RoleContextType {
  role: UserRole | null
  isAdmin: boolean
  isMod: boolean
  canManage: boolean   // admin OR mod — can manage entities/settings
  canCreateTransactions: boolean
  canEditTransactions: boolean
  canDeleteTransactions: boolean
  loading: boolean
}

const RoleContext = createContext<RoleContextType>({
  role: null,
  isAdmin: false,
  isMod: false,
  canManage: false,
  canCreateTransactions: false,
  canEditTransactions: false,
  canDeleteTransactions: false,
  loading: true,
})

export function RoleProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth()
  const [role, setRole] = useState<UserRole | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      setRole(null)
      setLoading(false)
      return
    }

    const fetchRole = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()

        if (error) throw error
        setRole(data.role as UserRole)
      } catch {
        setRole('viewer')
      } finally {
        setLoading(false)
      }
    }

    fetchRole()
  }, [user, authLoading])

  const isAdmin = role === 'admin'
  const isMod = role === 'mod'

  return (
    <RoleContext.Provider value={{
      role,
      isAdmin,
      isMod,
      canManage: isAdmin || isMod,
      canCreateTransactions: isAdmin,
      canEditTransactions: isAdmin || isMod,
      canDeleteTransactions: isAdmin,
      loading,
    }}>
      {children}
    </RoleContext.Provider>
  )
}

export function useRole() {
  return useContext(RoleContext)
}
