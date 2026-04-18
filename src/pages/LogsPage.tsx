import { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { ListFilter } from 'lucide-react'
import { toast } from 'sonner'
import { fetchLogs, fetchLogReferenceData, type AuditLog, type LogAction, type LogReferenceData } from '@/features/logs/api'
import {
  formatLogDescription,
  formatLogTimestamp,
  getActionBadgeClass,
  getActionLabel,
  getLogActorLabel,
} from '@/features/logs/format'
import { useRole } from '@/lib/RoleProvider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

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

export default function LogsPage() {
  const { canManage } = useRole()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [referenceData, setReferenceData] = useState<LogReferenceData>(EMPTY_REFERENCES)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [showFilters, setShowFilters] = useState(false)

  const [userFilter, setUserFilter] = useState('all')
  const [tableFilter, setTableFilter] = useState('all')
  const [actionFilter, setActionFilter] = useState<'all' | LogAction>('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const userOptions = useMemo(() => {
    return Object.values(referenceData.users)
      .sort((a, b) => a.display_name.localeCompare(b.display_name))
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
    [actionFilter, endDate, startDate, tableFilter, userFilter]
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
    userFilter !== 'all' || tableFilter !== 'all' || actionFilter !== 'all' || startDate || endDate

  if (!canManage) return <Navigate to="/" replace />

  return (
    <div className="space-y-6 max-w-[1400px] w-full min-w-0">
      {/* Page header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-[22px] sm:text-[28px] font-semibold tracking-tight leading-tight">
            Journal d'activité
          </h2>
          <p className="mt-1 text-[13px] sm:text-sm text-muted-foreground">
            Suivi des ajouts, modifications et suppressions
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-foreground hover:bg-muted"
            >
              <span className="hidden sm:inline">Réinitialiser</span>
              <span className="sm:hidden">×</span>
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="sm:hidden"
          >
            <ListFilter className="mr-1.5 h-3.5 w-3.5" />
            Filtres
          </Button>
        </div>
      </div>

      {/* Compact filter bar */}
      <div
        className={`${showFilters ? 'grid' : 'hidden'} grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center`}
      >
        <Select value={userFilter} onValueChange={setUserFilter}>
          <SelectTrigger className="h-8 w-full sm:w-auto min-w-0 sm:min-w-[150px] rounded-lg text-[13px]">
            <SelectValue placeholder="Utilisateur" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les utilisateurs</SelectItem>
            {userOptions.map((user) => (
              <SelectItem key={user.id} value={user.id}>
                {user.display_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={tableFilter} onValueChange={setTableFilter}>
          <SelectTrigger className="h-8 w-full sm:w-auto min-w-0 sm:min-w-[130px] rounded-lg text-[13px]">
            <SelectValue placeholder="Table" />
          </SelectTrigger>
          <SelectContent>
            {TABLE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={actionFilter}
          onValueChange={(value) => setActionFilter(value as 'all' | LogAction)}
        >
          <SelectTrigger className="h-8 w-full sm:w-auto min-w-0 sm:min-w-[120px] rounded-lg text-[13px]">
            <SelectValue placeholder="Action" />
          </SelectTrigger>
          <SelectContent>
            {ACTION_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          type="date"
          value={startDate}
          onChange={(event) => setStartDate(event.target.value)}
          className="h-8 w-full sm:w-auto rounded-lg text-[13px]"
          aria-label="Date de début"
        />

        <Input
          type="date"
          value={endDate}
          onChange={(event) => setEndDate(event.target.value)}
          className="h-8 w-full sm:w-auto rounded-lg text-[13px]"
          aria-label="Date de fin"
        />
      </div>

      {/* List container */}
      <div className="premium-surface premium-surface-airy surface-tint-violet rounded-2xl p-4 sm:p-6">
        <div className="mb-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Activité
          </p>
          <h3 className="mt-1 text-base font-semibold text-foreground">
            {loading
              ? 'Chargement…'
              : `${logs.length} entrée${logs.length !== 1 ? 's' : ''}`}
          </h3>
        </div>

        {loading ? (
          <div className="space-y-2.5">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-2xl bg-muted/50" />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            Aucune activité trouvée
          </p>
        ) : (
          <>
            <div className="space-y-2">
              {logs.map((log) => {
                const actorLabel = getLogActorLabel(log.user_id, referenceData)
                const actorInitial = actorLabel.charAt(0).toUpperCase()

                return (
                  <div key={log.id} className="row-surface rounded-2xl px-3 py-2.5">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge
                          className={`${getActionBadgeClass(log.action)} h-4 rounded-full px-1.5 text-[9px] font-medium leading-none`}
                        >
                          {getActionLabel(log.action)}
                        </Badge>
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 text-[10px] text-foreground">
                          <span className="grid h-3.5 w-3.5 place-items-center rounded-full bg-primary text-[8px] font-semibold text-primary-foreground">
                            {actorInitial}
                          </span>
                          <span className="max-w-[120px] truncate sm:max-w-[180px]">
                            {actorLabel}
                          </span>
                        </span>
                        <span className="text-[10px] tabular-nums text-muted-foreground sm:text-[11px]">
                          {formatLogTimestamp(log.created_at)}
                        </span>
                      </div>
                      <p className="text-[12.5px] text-foreground tracking-tight leading-[1.25rem]">
                        {formatLogDescription(log, referenceData)}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>

            {hasMore && (
              <div className="flex justify-center pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="rounded-full"
                >
                  {loadingMore ? 'Chargement...' : 'Charger plus'}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
