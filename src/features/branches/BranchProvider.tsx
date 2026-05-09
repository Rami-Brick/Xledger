import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useAuth } from '@/features/auth/AuthProvider'
import { getMyBranches, type Branch } from './api'

const STORAGE_KEY = 'xledger.activeBranchId'

interface BranchContextType {
  branches: Branch[]
  activeBranch: Branch | null
  setActiveBranchId: (id: string) => void
  loading: boolean
  error: string | null
}

const BranchContext = createContext<BranchContextType>({
  branches: [],
  activeBranch: null,
  setActiveBranchId: () => {},
  loading: true,
  error: null,
})

export function BranchProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth()
  const [branches, setBranches] = useState<Branch[]>([])
  const [activeBranchId, setActiveBranchIdState] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      setBranches([])
      setActiveBranchIdState(null)
      setLoading(false)
      setError(null)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    getMyBranches()
      .then((list) => {
        if (cancelled) return
        setBranches(list)

        const stored = localStorage.getItem(STORAGE_KEY)
        const storedIsValid = stored !== null && list.some((b) => b.id === stored)
        const next = storedIsValid ? stored : (list[0]?.id ?? null)
        setActiveBranchIdState(next)
        if (next && next !== stored) {
          localStorage.setItem(STORAGE_KEY, next)
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setBranches([])
        setActiveBranchIdState(null)
        setError(err instanceof Error ? err.message : 'Erreur de chargement des branches')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [user, authLoading])

  const setActiveBranchId = useCallback(
    (id: string) => {
      if (!branches.some((b) => b.id === id)) return
      setActiveBranchIdState(id)
      localStorage.setItem(STORAGE_KEY, id)
    },
    [branches],
  )

  const activeBranch = useMemo(
    () => branches.find((b) => b.id === activeBranchId) ?? null,
    [branches, activeBranchId],
  )

  return (
    <BranchContext.Provider
      value={{ branches, activeBranch, setActiveBranchId, loading, error }}
    >
      {children}
    </BranchContext.Provider>
  )
}

export function useBranch() {
  return useContext(BranchContext)
}
