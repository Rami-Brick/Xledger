import { useState, type ComponentType } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import {
  BarChart3,
  ChevronDown,
  Grid3X3,
  LayoutDashboard,
  List,
  LogOut,
  Menu,
  PlusCircle,
  ScrollText,
  Settings,
  Wallet,
} from 'lucide-react'
import { useRole } from '@/lib/RoleProvider'
import { useAuth } from '@/features/auth/AuthProvider'
import { Button } from '@/components/ui/button'
import ThemeToggle from '@/components/ThemeToggle'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'

interface NavItem {
  to: string
  icon: ComponentType<{ className?: string }>
  label: string
  requiresCreateTransactions?: boolean
  requiresManage?: boolean
}

const navItems: NavItem[] = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Tableau de bord' },
  { to: '/ajouter', icon: PlusCircle, label: 'Ajouter', requiresCreateTransactions: true },
  { to: '/historique', icon: List, label: 'Historique' },
  { to: '/categories', icon: Grid3X3, label: 'Categories' },
  { to: '/rapports', icon: BarChart3, label: 'Rapports' },
  { to: '/logs', icon: ScrollText, label: 'Journal', requiresManage: true },
]

const settingsItems = [
  { to: '/parametres/employes', label: 'Employes' },
  { to: '/parametres/charges-fixes', label: 'Charges fixes' },
  { to: '/parametres/produits', label: 'Produits' },
  { to: '/parametres/sous-categories', label: 'Sous-categories' },
  { to: '/parametres/abonnements', label: 'Abonnements' },
  { to: '/parametres/contacts-prets', label: 'Contacts prets' },
]

const navLinkBase =
  'relative flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium tracking-[-0.01em] transition-colors'
const navLinkInactive =
  'text-sidebar-foreground hover:bg-sidebar-accent'
const navLinkActive =
  'bg-sidebar-accent text-sidebar-foreground shadow-[inset_2px_0_0_0_var(--color-primary)]'

function BrandMark() {
  return (
    <div className="grid h-7 w-7 place-items-center rounded-lg bg-primary text-primary-foreground">
      <Wallet className="h-3.5 w-3.5" />
    </div>
  )
}

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

function SidebarContent({
  onNavigate,
  signOut,
  email,
  canCreateTransactions,
  canManage,
}: {
  onNavigate?: () => void
  signOut: () => void
  email?: string
  canCreateTransactions: boolean
  canManage: boolean
}) {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [buildInfoOpen, setBuildInfoOpen] = useState(false)
  const buildInfo = __APP_BUILD_INFO__
  const buildLabel = `${buildInfo.envLabel} • ${buildInfo.shortSha}`
  const buildDetails = [
    `Build: ${buildInfo.envLabel} • ${buildInfo.commitSha}`,
    `Deploye: ${formatBuildTimestamp(buildInfo.builtAt)}`,
    buildInfo.deploymentId ? `Deployment: ${buildInfo.deploymentId}` : null,
  ]
    .filter(Boolean)
    .join('\n')

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 px-3 pt-4 pb-3">
        <BrandMark />
        <div className="min-w-0 flex-1">
          <h1 className="text-[15px] font-semibold tracking-tight leading-none">Xledger</h1>
          {email && (
            <p className="mt-1 truncate text-[10.5px] text-sidebar-foreground/80">{email}</p>
          )}
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pb-2 space-y-0.5">
        {navItems.map((item) => {
          if (item.requiresCreateTransactions && !canCreateTransactions) return null
          if (item.requiresManage && !canManage) return null

          return (
            <NavLink
              key={item.to}
              to={item.to}
              end
              onClick={onNavigate}
              className={({ isActive }) =>
                `${navLinkBase} ${isActive ? navLinkActive : navLinkInactive}`
              }
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </NavLink>
          )
        })}

        {canManage && (
          <div className="mt-4">
            <Collapsible open={settingsOpen} onOpenChange={setSettingsOpen}>
              <CollapsibleTrigger
                className={`${navLinkBase} ${navLinkInactive} w-full justify-between`}
              >
                <span className="flex items-center gap-3">
                  <Settings className="h-4 w-4 shrink-0" />
                  Parametres
                </span>
                <ChevronDown
                  className={`h-3.5 w-3.5 text-sidebar-foreground/70 transition-transform duration-200 ${
                    settingsOpen ? 'rotate-180' : ''
                  }`}
                />
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-1 space-y-0.5">
                {settingsItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      `${navLinkBase} pl-9 text-[12.5px] ${
                        isActive ? navLinkActive : navLinkInactive
                      }`
                    }
                  >
                    {item.label}
                  </NavLink>
                ))}
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}
      </nav>

      <div className="mt-auto border-t border-sidebar-border p-3 space-y-2">
        <div className="flex justify-end">
          <ThemeToggle />
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-3 rounded-lg text-sidebar-foreground hover:text-destructive hover:bg-destructive/10"
          onClick={() => {
            signOut()
            onNavigate?.()
          }}
        >
          <LogOut className="h-4 w-4" />
          Deconnexion
        </Button>

        <Collapsible open={buildInfoOpen} onOpenChange={setBuildInfoOpen}>
          <div className="flex items-center justify-between gap-2 pt-1 text-[11px] text-sidebar-foreground/75">
            <span className="truncate">Build actuel</span>
            <CollapsibleTrigger asChild>
              <button
                type="button"
                title={buildDetails}
                className="shrink-0 rounded-full border border-sidebar-border bg-sidebar-accent/50 px-2 py-0.5 text-[10px] font-medium tracking-wide transition-colors hover:bg-sidebar-accent"
              >
                {buildLabel}
              </button>
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent className="pt-2">
            <div className="space-y-1 rounded-lg border border-sidebar-border bg-sidebar-accent/40 px-2.5 py-2 text-[10px] text-muted-foreground">
              <p className="break-all">Build: {buildInfo.envLabel} • {buildInfo.commitSha}</p>
              <p>Deploye: {formatBuildTimestamp(buildInfo.builtAt)}</p>
              {buildInfo.deploymentId && <p className="break-all">Deployment: {buildInfo.deploymentId}</p>}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  )
}

export default function AppLayout() {
  const { user, signOut } = useAuth()
  const { canCreateTransactions, canManage } = useRole()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex min-h-screen">
      <aside className="sidebar-atmosphere hidden w-56 border-r border-sidebar-border text-sidebar-foreground md:flex md:flex-col h-screen sticky top-0">
        <SidebarContent
          signOut={signOut}
          email={user?.email}
          canCreateTransactions={canCreateTransactions}
          canManage={canManage}
        />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-sidebar-border bg-background px-4 py-3 md:hidden">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="sidebar-atmosphere w-64 p-0 text-sidebar-foreground">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <SidebarContent
                onNavigate={() => setMobileOpen(false)}
                signOut={signOut}
                email={user?.email}
                canCreateTransactions={canCreateTransactions}
                canManage={canManage}
              />
            </SheetContent>
          </Sheet>
          <div className="flex flex-1 items-center gap-2">
            <BrandMark />
            <h1 className="text-base font-semibold tracking-tight">Xledger</h1>
          </div>
          <ThemeToggle />
        </header>

        <main className="min-w-0 flex-1 overflow-auto app-atmosphere">
          <div className="min-w-0 p-4 md:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
