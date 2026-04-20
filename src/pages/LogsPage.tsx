import { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { SlidersHorizontal, X } from 'lucide-react'
import { toast } from 'sonner'
import {
  fetchLogs,
  fetchLogReferenceData,
  type AuditLog,
  type LogAction,
  type LogReferenceData,
} from '@/features/logs/api'
import {
  formatLogDescription,
  formatLogTimestamp,
  getActionLabel,
  getLogActorLabel,
} from '@/features/logs/format'
import { useRole } from '@/lib/RoleProvider'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Popover as PopoverPrimitive } from 'radix-ui'
import {
  CircularIconButton,
  GlassPanel,
  PillButton,
} from '@/components/system-ui/primitives'
import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

const PAGE_SIZE = 50

const TABLE_OPTIONS = [
  { value: 'all', label: 'Toutes' },
  { value: 'transactions', label: 'Transactions' },
  { value: 'employees', label: 'Employes' },
  { value: 'fixed_charges', label: 'Charges fixes' },
  { value: 'products', label: 'Produits' },
  { value: 'subcategories', label: 'Sous-categories' },
  { value: 'subscriptions', label: 'Abonnements' },
  { value: 'loan_contacts', label: 'Contacts de prets' },
  { value: 'profiles', label: 'Profils' },
]

const ACTION_OPTIONS: Array<{ value: 'all' | LogAction; label: string }> = [
  { value: 'all', label: 'Toutes' },
  { value: 'INSERT', label: 'Ajout' },
  { value: 'UPDATE', label: 'Modification' },
  { value: 'DELETE', label: 'Suppression' },
]

const EMPTY_REFERENCES: LogReferenceData = {
  users: {},
  employees: {},
  fixedCharges: {},
  products: {},
  subcategories: {},
  subscriptions: {},
  loanContacts: {},
}

const ACTION_COLOR: Record<LogAction, { bg: string; fg: string }> = {
  INSERT: { bg: '#2D7CF6', fg: '#FFFFFF' },
  UPDATE: { bg: '#FF9A18', fg: '#0A0B0A' },
  DELETE: { bg: '#D94BF4', fg: '#FFFFFF' },
}

function FilterField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-wide text-white/46">{label}</span>
      {children}
    </div>
  )
}

export default function LogsPage() {
  const { canManage } = useRole()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [referenceData, setReferenceData] = useState<LogReferenceData>(EMPTY_REFERENCES)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)

  const [userFilter, setUserFilter] = useState('all')
  const [tableFilter, setTableFilter] = useState('all')
  const [actionFilter, setActionFilter] = useState<'all' | LogAction>('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const userOptions = useMemo(() => {
    return Object.values(referenceData.users).sort((a, b) =>
      a.display_name.localeCompare(b.display_name),
    )
  }, [referenceData.users])

  const loadLogs = useCallback(
    async (offset: number, append: boolean) => {
      const data = await fetchLogs({
        user_id: userFilter !== 'all' ? userFilter : undefined,
        table_name: tableFilter !== 'all' ? tableFilter : undefined,
        action: actionFilter !== 'all' ? actionFilter : undefined,
        date_from: startDate || undefined,
        date_to: endDate || undefined,
        offset,
        limit: PAGE_SIZE,
      })

      setHasMore(data.length === PAGE_SIZE)
      setLogs((current) => (append ? [...current, ...data] : data))
    },
    [actionFilter, endDate, startDate, tableFilter, userFilter],
  )

  const loadReferenceData = useCallback(async () => {
    try {
      const references = await fetchLogReferenceData()
      setReferenceData(references)
    } catch {
      setReferenceData(EMPTY_REFERENCES)
    }
  }, [])

  useEffect(() => {
    loadReferenceData()
  }, [loadReferenceData])

  useEffect(() => {
    const run = async () => {
      setLoading(true)
      try {
        await loadLogs(0, false)
      } catch {
        toast.error('Erreur lors du chargement du journal')
      } finally {
        setLoading(false)
      }
    }

    run()
  }, [loadLogs])

  const handleLoadMore = async () => {
    setLoadingMore(true)
    try {
      await loadLogs(logs.length, true)
    } catch {
      toast.error('Erreur lors du chargement des logs')
    } finally {
      setLoadingMore(false)
    }
  }

  const clearFilters = () => {
    setUserFilter('all')
    setTableFilter('all')
    setActionFilter('all')
    setStartDate('')
    setEndDate('')
  }

  const hasActiveFilters =
    userFilter !== 'all' ||
    tableFilter !== 'all' ||
    actionFilter !== 'all' ||
    startDate ||
    endDate

  const activeFilterCount =
    (userFilter !== 'all' ? 1 : 0) +
    (tableFilter !== 'all' ? 1 : 0) +
    (actionFilter !== 'all' ? 1 : 0) +
    (startDate ? 1 : 0) +
    (endDate ? 1 : 0)

  if (!canManage) return <Navigate to="/" replace />

  return (
    <div className="relative w-full min-w-0">
      <div
        aria-hidden
        className="pointer-events-none fixed -top-40 -left-40 h-[480px] w-[480px] rounded-full blur-3xl"
        style={{ background: 'rgba(92,214,180,0.10)' }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed -bottom-40 -right-40 h-[520px] w-[520px] rounded-full blur-3xl"
        style={{ background: 'rgba(154,255,90,0.10)' }}
      />

      <div className="relative z-10 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex min-w-0 flex-col gap-0.5">
            <h1 className="text-xl font-semibold tracking-tight text-white md:text-2xl">
              Journal d&apos;activité
            </h1>
            <p className="text-xs text-white/60">
              Suivi des ajouts, modifications et suppressions
            </p>
          </div>

          <div className="ml-auto flex items-center gap-1.5">
            <PopoverPrimitive.Root>
              <PopoverPrimitive.Trigger asChild>
                <button
                  type="button"
                  aria-label="Filtres"
                  className={cn(
                    'relative inline-flex h-8 items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.06] px-3 text-xs font-medium text-white/90',
                    'transition-colors hover:bg-white/[0.10]',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-black',
                  )}
                >
                  <SlidersHorizontal className="size-3.5" />
                  Filtres
                  {activeFilterCount > 0 && (
                    <span className="ml-0.5 inline-flex size-4 items-center justify-center rounded-full bg-white/95 text-[10px] font-bold text-black">
                      {activeFilterCount}
                    </span>
                  )}
                </button>
              </PopoverPrimitive.Trigger>

              <PopoverPrimitive.Portal>
                <PopoverPrimitive.Content
                  align="end"
                  sideOffset={8}
                  className="z-50 w-[min(calc(100vw-2rem),320px)] rounded-2xl border border-white/[0.08] bg-[#141414] p-3 text-white shadow-xl"
                >
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-white/72">Filtres</span>
                      {hasActiveFilters && (
                        <button
                          type="button"
                          onClick={clearFilters}
                          className="text-[10px] text-white/46 hover:text-white/80"
                        >
                          Réinitialiser
                        </button>
                      )}
                    </div>

                    <FilterField label="Utilisateur">
                      <Select value={userFilter} onValueChange={setUserFilter}>
                        <SelectTrigger className="h-8 w-full rounded-full border-white/[0.08] bg-white/[0.04] text-xs text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tous</SelectItem>
                          {userOptions.map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.display_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FilterField>

                    <FilterField label="Table">
                      <Select value={tableFilter} onValueChange={setTableFilter}>
                        <SelectTrigger className="h-8 w-full rounded-full border-white/[0.08] bg-white/[0.04] text-xs text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TABLE_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FilterField>

                    <FilterField label="Action">
                      <Select
                        value={actionFilter}
                        onValueChange={(value) =>
                          setActionFilter(value as 'all' | LogAction)
                        }
                      >
                        <SelectTrigger className="h-8 w-full rounded-full border-white/[0.08] bg-white/[0.04] text-xs text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ACTION_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FilterField>

                    <div className="grid grid-cols-2 gap-2">
                      <FilterField label="Début">
                        <Input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="h-8 rounded-full border-white/[0.08] bg-white/[0.04] px-3 text-xs text-white [color-scheme:dark]"
                        />
                      </FilterField>
                      <FilterField label="Fin">
                        <Input
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="h-8 rounded-full border-white/[0.08] bg-white/[0.04] px-3 text-xs text-white [color-scheme:dark]"
                        />
                      </FilterField>
                    </div>
                  </div>
                </PopoverPrimitive.Content>
              </PopoverPrimitive.Portal>
            </PopoverPrimitive.Root>

            {hasActiveFilters && (
              <CircularIconButton
                variant="glass"
                size="sm"
                icon={<X />}
                aria-label="Réinitialiser les filtres"
                onClick={clearFilters}
              />
            )}
          </div>
        </div>

        {loading ? (
          <GlassPanel className="p-6">
            <p className="py-6 text-center text-sm text-white/46">Chargement…</p>
          </GlassPanel>
        ) : logs.length === 0 ? (
          <GlassPanel className="p-6">
            <p className="py-12 text-center text-sm text-white/60">
              Aucune activité trouvée.
            </p>
          </GlassPanel>
        ) : (
          <>
            <GlassPanel className="p-3 md:p-4">
              <div className="flex flex-col">
                {logs.map((log) => {
                  const actorLabel = getLogActorLabel(log.user_id, referenceData)
                  const actionColor = ACTION_COLOR[log.action]

                  return (
                    <div
                      key={log.id}
                      className="flex flex-col gap-1 rounded-2xl px-2 py-2.5"
                    >
                      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                        <span
                          className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide"
                          style={{
                            backgroundColor: actionColor.bg,
                            color: actionColor.fg,
                          }}
                        >
                          {getActionLabel(log.action)}
                        </span>
                        <span className="truncate text-[11px] text-white/72">
                          {actorLabel}
                        </span>
                        <span className="shrink-0 text-white/30">·</span>
                        <span className="shrink-0 text-[11px] text-white/46">
                          {formatLogTimestamp(log.created_at)}
                        </span>
                      </div>
                      <p className="text-[13px] leading-snug text-white/90">
                        {formatLogDescription(log, referenceData)}
                      </p>
                    </div>
                  )
                })}
              </div>
            </GlassPanel>

            {hasMore && (
              <div className="flex justify-center pt-1">
                <PillButton
                  variant="glass"
                  size="sm"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? 'Chargement…' : 'Charger plus'}
                </PillButton>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
