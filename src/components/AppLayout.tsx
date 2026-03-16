import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
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
  SheetTrigger,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  LayoutDashboard,
  PlusCircle,
  List,
  BarChart3,
  Settings,
  LogOut,
  Wallet,
  ChevronDown,
  Menu,
} from 'lucide-react'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Tableau de bord' },
  { to: '/ajouter', icon: PlusCircle, label: 'Ajouter' },
  { to: '/historique', icon: List, label: 'Historique' },
  { to: '/salaires', icon: Wallet, label: 'Salaires' },
  { to: '/rapports', icon: BarChart3, label: 'Rapports' },
]

const settingsItems = [
  { to: '/parametres/employes', label: 'Employés' },
  { to: '/parametres/charges-fixes', label: 'Charges fixes' },
  { to: '/parametres/produits', label: 'Produits' },
  { to: '/parametres/sous-categories', label: 'Sous-catégories' },
]

function SidebarContent({
  onNavigate,
  signOut,
  email,
}: {
  onNavigate?: () => void
  signOut: () => void
  email?: string
}) {
  const [settingsOpen, setSettingsOpen] = useState(false)

  return (
    <div className="flex flex-col h-full">
      {/* Logo / Title */}
      <div className="p-6">
        <h1 className="text-lg font-bold">Xledger</h1>
        {email && <p className="text-xs text-muted-foreground mt-1">{email}</p>}
      </div>

      <Separator />

      {/* Main Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`
            }
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        ))}

        <Separator className="my-4" />

        {/* Collapsible Settings Section */}
        <Collapsible open={settingsOpen} onOpenChange={setSettingsOpen}>
          <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
            <span className="flex items-center gap-3">
              <Settings className="h-4 w-4" />
              Paramètres
            </span>
            <ChevronDown
              className={`h-4 w-4 transition-transform duration-200 ${
                settingsOpen ? 'rotate-180' : ''
              }`}
            />
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-1 mt-1">
            {settingsItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onNavigate}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 pl-10 rounded-md text-sm transition-colors ${
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
      </nav>

      {/* Footer */}
      <div className="p-4 border-t flex items-center justify-between">
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
          Déconnexion
        </Button>
        <ThemeToggle />
      </div>
    </div>
  )
}

export default function AppLayout() {
  const { user, signOut } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="min-h-screen flex">
      {/* Desktop Sidebar — hidden on mobile */}
      <aside className="hidden md:flex w-64 border-r bg-muted/30 flex-col">
        <SidebarContent signOut={signOut} email={user?.email} />
      </aside>

      {/* Mobile Header + Sheet — visible on mobile only */}
      <div className="flex flex-col flex-1">
        <header className="md:hidden flex items-center gap-3 border-b px-4 py-3 bg-background">
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
              />
            </SheetContent>
          </Sheet>
          <h1 className="text-lg font-bold flex-1">Xledger</h1>
          <ThemeToggle />
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <div className="p-4 md:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}