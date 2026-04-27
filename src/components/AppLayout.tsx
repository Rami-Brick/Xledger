import { useEffect, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  BarChart3,
  ChevronDown,
  LogOut,
  ScrollText,
  Settings,
  Info,
} from 'lucide-react'
import { useRole } from '@/lib/RoleProvider'
import { useAuth } from '@/features/auth/AuthProvider'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { AvatarCircle, PillButton } from '@/components/system-ui/primitives'
import { cn } from '@/lib/utils'

interface PrimaryTab {
  id: string
  to: string
  label: string
}

const primaryTabs: PrimaryTab[] = [
  { id: 'dashboard', to: '/dashboard', label: 'Tableau de bord' },
  { id: 'history', to: '/historique', label: 'Historique' },
  { id: 'categories', to: '/categories', label: 'Categories' },
]

const settingsItems = [
  { to: '/parametres/employes', label: 'Employes' },
  { to: '/parametres/charges-fixes', label: 'Charges fixes' },
  { to: '/parametres/produits', label: 'Produits' },
  { to: '/parametres/sous-categories', label: 'Sous-categories' },
  { to: '/parametres/abonnements', label: 'Abonnements' },
  { to: '/parametres/contacts-prets', label: 'Contacts prets' },
]

function formatBuildTimestamp(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return date.toLocaleString('fr-TN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function tabIdForPath(pathname: string): string | null {
  const match = primaryTabs.find((t) => pathname === t.to || pathname.startsWith(`${t.to}/`))
  return match?.id ?? null
}

export default function AppLayout() {
  const { user, signOut } = useAuth()
  const { canManage } = useRole()
  const location = useLocation()
  const navigate = useNavigate()
  const [profileOpen, setProfileOpen] = useState(false)
  const [settingsExpanded, setSettingsExpanded] = useState(false)

  // Pin the app to dark mode — the system-ui kit is dark-only.
  useEffect(() => {
    const root = document.documentElement
    root.classList.add('dark')
    return () => {
      root.classList.remove('dark')
    }
  }, [])

  const activeTabId = tabIdForPath(location.pathname)

  const buildInfo = __APP_BUILD_INFO__
  const buildLabel = `${buildInfo.envLabel} · ${buildInfo.shortSha}`

  return (
    <div className="min-h-screen bg-[#0A0B0A] text-white">
      <div className="mx-auto w-full max-w-[1400px] px-2 py-3 sm:px-4 sm:py-4 md:px-6 md:py-6">
        {/* Top row — tabs centered, profile right. No bar, no border. */}
        <div className="flex items-center gap-4">
          <nav
            aria-label="Navigation principale"
            className="flex min-w-0 flex-1 items-center justify-center overflow-x-auto pl-2 sm:pl-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            <div className="flex items-center gap-1">
              {primaryTabs.map((tab) => {
                const isActive = tab.id === activeTabId
                return (
                  <PillButton
                    key={tab.id}
                    variant={isActive ? 'light' : 'ghost'}
                    size="md"
                    aria-current={isActive ? 'page' : undefined}
                    onClick={() => {
                      if (!isActive) navigate(tab.to)
                    }}
                    className="shrink-0 h-8 px-3 text-xs md:h-10 md:px-5 md:text-sm"
                  >
                    {tab.label}
                  </PillButton>
                )
              })}
            </div>
          </nav>

          {/* Profile dropdown — anchored to the right edge */}
          <DropdownMenu open={profileOpen} onOpenChange={setProfileOpen}>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label={`Menu utilisateur${user?.email ? ` — ${user.email}` : ''}`}
                className="shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
              >
                <AvatarCircle
                  name={user?.email || 'User'}
                  color="magenta"
                  size="md"
                />
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              align="end"
              sideOffset={8}
              className="w-64 rounded-2xl border border-white/[0.08] bg-[#141414] p-1.5 text-white shadow-xl ring-0"
            >
              {user?.email && (
                <DropdownMenuLabel className="px-2 py-1.5 text-[11px] font-normal text-white/46">
                  {user.email}
                </DropdownMenuLabel>
              )}

              <DropdownMenuItem
                className="gap-2 rounded-lg px-2 py-2 text-sm text-white/90 focus:bg-white/[0.06] focus:text-white"
                onSelect={(e) => {
                  e.preventDefault()
                  setProfileOpen(false)
                  navigate('/rapports')
                }}
              >
                <BarChart3 className="size-4" />
                Rapports
              </DropdownMenuItem>

              {canManage && (
                <>
                  <DropdownMenuItem
                    className="gap-2 rounded-lg px-2 py-2 text-sm text-white/90 focus:bg-white/[0.06] focus:text-white"
                    onSelect={(e) => {
                      e.preventDefault()
                      setProfileOpen(false)
                      navigate('/logs')
                    }}
                  >
                    <ScrollText className="size-4" />
                    Journal
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    className="gap-2 rounded-lg px-2 py-2 text-sm text-white/90 focus:bg-white/[0.06] focus:text-white"
                    onSelect={(e) => {
                      e.preventDefault()
                      setSettingsExpanded((v) => !v)
                    }}
                  >
                    <Settings className="size-4" />
                    <span className="flex-1">Paramètres</span>
                    <ChevronDown
                      className={cn(
                        'size-4 text-white/46 transition-transform duration-150',
                        settingsExpanded && 'rotate-180',
                      )}
                    />
                  </DropdownMenuItem>

                  {settingsExpanded && (
                    <div className="flex flex-col">
                      {settingsItems.map((item) => (
                        <DropdownMenuItem
                          key={item.to}
                          className="rounded-lg px-2 py-1.5 pl-9 text-[13px] text-white/72 focus:bg-white/[0.06] focus:text-white"
                          onSelect={(e) => {
                            e.preventDefault()
                            setProfileOpen(false)
                            navigate(item.to)
                          }}
                        >
                          {item.label}
                        </DropdownMenuItem>
                      ))}
                    </div>
                  )}

                  <DropdownMenuSeparator className="my-1 bg-white/[0.06]" />
                </>
              )}

              <DropdownMenuItem
                className="gap-2 rounded-lg px-2 py-2 text-sm text-white/90 focus:bg-white/[0.06] focus:text-white"
                onSelect={(e) => {
                  e.preventDefault()
                  setProfileOpen(false)
                  signOut()
                }}
              >
                <LogOut className="size-4" />
                Deconnexion
              </DropdownMenuItem>

              <DropdownMenuSeparator className="my-1 bg-white/[0.06]" />

              <BuildInfoMenuSection
                buildLabel={buildLabel}
                envLabel={buildInfo.envLabel}
                commitSha={buildInfo.commitSha}
                builtAt={buildInfo.builtAt}
                deploymentId={buildInfo.deploymentId}
              />
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <main className="relative pt-4 md:pt-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

function BuildInfoMenuSection({
  buildLabel,
  envLabel,
  commitSha,
  builtAt,
  deploymentId,
}: {
  buildLabel: string
  envLabel: string
  commitSha: string
  builtAt: string
  deploymentId: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="px-1 py-1">
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault()
          setOpen((v) => !v)
        }}
        className={cn(
          'flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5',
          'text-[11px] text-white/46 transition-colors',
          'hover:bg-white/[0.04] hover:text-white/70',
        )}
        title="Build actuel"
      >
        <span className="inline-flex items-center gap-1.5">
          <Info className="size-3" />
          Build actuel
        </span>
        <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 font-medium tracking-wide">
          {buildLabel}
        </span>
      </button>
      {open && (
        <div className="mt-1 space-y-1 rounded-lg border border-white/[0.06] bg-white/[0.02] px-2 py-2 text-[10px] text-white/46">
          <p className="break-all">Build: {envLabel} · {commitSha}</p>
          <p>Deploye: {formatBuildTimestamp(builtAt)}</p>
          {deploymentId && <p className="break-all">Deployment: {deploymentId}</p>}
        </div>
      )}
    </div>
  )
}
