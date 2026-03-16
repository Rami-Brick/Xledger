import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthProvider'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  LayoutDashboard,
  PlusCircle,
  List,
  Users,
  BarChart3,
  Settings,
  LogOut,
  Wallet,
  ChevronDown,
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

export default function AppLayout() {
  const { user, signOut } = useAuth()
  const [settingsOpen, setSettingsOpen] = useState(false)

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-muted/30 flex flex-col">
        {/* Logo / Title */}
        <div className="p-6">
          <h1 className="text-lg font-bold">Xledger</h1>
          <p className="text-xs text-muted-foreground mt-1">{user?.email}</p>
        </div>

        <Separator />

        {/* Main Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
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

        {/* Sign Out */}
        <div className="p-4 border-t">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-3 text-muted-foreground"
            onClick={signOut}
          >
            <LogOut className="h-4 w-4" />
            Déconnexion
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}