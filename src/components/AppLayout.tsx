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
} from 'lucide-react'
import { useRole } from '@/lib/RoleProvider'
import { useAuth } from '@/features/auth/AuthProvider'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
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
      <div className="p-6">
        <h1 className="text-lg font-bold">Xledger</h1>
        {email && <p className="mt-1 text-xs text-muted-foreground">{email}</p>}
      </div>

      <Separator />

      <nav className="flex-1 overflow-y-auto space-y-1 p-4">
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
                `flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          )
        })}

        {canManage && (
          <>
            <Separator className="my-4" />
            <Collapsible open={settingsOpen} onOpenChange={setSettingsOpen}>
              <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                <span className="flex items-center gap-3">
                  <Settings className="h-4 w-4" />
                  Parametres
                </span>
                <ChevronDown
                  className={`h-4 w-4 transition-transform duration-200 ${
                    settingsOpen ? 'rotate-180' : ''
                  }`}
                />
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-1 space-y-1">
                {settingsItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-md px-3 py-2 pl-10 text-sm transition-colors ${
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`
                    }
                  >
                    {item.label}
                  </NavLink>
                ))}
              </CollapsibleContent>
            </Collapsible>
          </>
        )}
      </nav>

      <div className="space-y-3 border-t p-4">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            className="justify-start gap-3 text-muted-foreground"
            onClick={() => {
              signOut()
              onNavigate?.()
            }}
          >
            <LogOut className="h-4 w-4" />
            Deconnexion
          </Button>
          <ThemeToggle />
        </div>

        <Collapsible open={buildInfoOpen} onOpenChange={setBuildInfoOpen}>
          <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
            <span className="truncate">Build actuel</span>
            <CollapsibleTrigger asChild>
              <button
                type="button"
                title={buildDetails}
                className="shrink-0 rounded-full border border-border/70 bg-muted/40 px-2 py-0.5 font-medium tracking-wide transition-colors hover:bg-muted/70"
              >
                {buildLabel}
              </button>
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent className="pt-2">
            <div className="space-y-1 rounded-md border border-border/60 bg-muted/30 px-2.5 py-2 text-[10px] text-muted-foreground">
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
      <aside className="hidden w-64 border-r bg-muted/30 md:flex md:flex-col h-screen sticky top-0">
        <SidebarContent
          signOut={signOut}
          email={user?.email}
          canCreateTransactions={canCreateTransactions}
          canManage={canManage}
        />
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center gap-3 border-b bg-background px-4 py-3 md:hidden">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
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
          <h1 className="flex-1 text-lg font-bold">Xledger</h1>
          <ThemeToggle />
        </header>

        <main className="flex-1 overflow-auto">
          <div className="p-4 md:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
