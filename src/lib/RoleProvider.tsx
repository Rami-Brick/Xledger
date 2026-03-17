import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/features/auth/AuthProvider'

export type UserRole = 'admin' | 'viewer'

interface RoleContextType {
  role: UserRole | null
  isAdmin: boolean
  loading: boolean
}

const RoleContext = createContext<RoleContextType>({ role: null, isAdmin: false, loading: true })

export function RoleProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [role, setRole] = useState<UserRole | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
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
  }, [user])

  return (
    <RoleContext.Provider value={{ role, isAdmin: role === 'admin', loading }}>
      {children}
    </RoleContext.Provider>
  )
}

export function useRole() {
  return useContext(RoleContext)
}