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
import { Card, CardContent } from '@/components/ui/card'
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
    <div className="w-full min-w-0 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl font-bold sm:text-2xl">Journal d'activite</h2>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            Suivi des ajouts, modifications et suppressions
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs">
              Reinitialiser
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="text-xs sm:hidden"
          >
            <ListFilter className="mr-1 h-3.5 w-3.5" />
            Filtres
          </Button>
        </div>
      </div>

      <div className={`${showFilters ? 'block' : 'hidden'} space-y-3 sm:block`}>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <Select value={userFilter} onValueChange={setUserFilter}>
            <SelectTrigger className="text-xs sm:text-sm">
              <SelectValue placeholder="Utilisateur" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Utilisateur - Tous</SelectItem>
              {userOptions.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.display_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={tableFilter} onValueChange={setTableFilter}>
            <SelectTrigger className="text-xs sm:text-sm">
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

          <Select value={actionFilter} onValueChange={(value) => setActionFilter(value as 'all' | LogAction)}>
            <SelectTrigger className="text-xs sm:text-sm">
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
            className="text-xs sm:text-sm"
          />

          <Input
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
            className="text-xs sm:text-sm"
          />
        </div>
      </div>

      {loading ? (
        <p className="py-12 text-center text-muted-foreground">Chargement...</p>
      ) : logs.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <p>Aucune activite trouvee.</p>
        </div>
      ) : (
        <>
          <div className="space-y-1.5">
            {logs.map((log) => {
              const actorLabel = getLogActorLabel(log.user_id, referenceData)
              const actorInitial = actorLabel.charAt(0).toUpperCase()

              return (
                <Card key={log.id} className="gap-0 rounded-md border-border/80 py-1 shadow-none sm:py-1.5">
                  <CardContent className="px-2 py-0.5 sm:px-2.5 sm:py-0.5">
                    <div className="space-y-0.5">
                      <div className="flex flex-wrap items-center gap-1">
                        <Badge className={`${getActionBadgeClass(log.action)} h-3.5 px-1 py-0 text-[9px] leading-none`}>
                          {getActionLabel(log.action)}
                        </Badge>
                        <span className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-muted/30 px-1 py-0 text-[10px] text-muted-foreground">
                          <span className="flex h-3 w-3 items-center justify-center rounded-full bg-muted text-[8px] font-semibold text-foreground/80">
                            {actorInitial}
                          </span>
                          <span className="max-w-[96px] truncate sm:max-w-[140px]">
                            {actorLabel}
                          </span>
                        </span>
                        <span className="text-[10px] text-muted-foreground sm:text-[11px]">
                          {formatLogTimestamp(log.created_at)}
                        </span>
                      </div>
                      <p className="text-[13px] leading-[1.05rem] sm:text-[12.5px]">
                        {formatLogDescription(log, referenceData)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {hasMore && (
            <div className="flex justify-center pt-2">
              <Button variant="outline" onClick={handleLoadMore} disabled={loadingMore}>
                {loadingMore ? 'Chargement...' : 'Charger plus'}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
