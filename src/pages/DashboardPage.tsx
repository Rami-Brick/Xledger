import { useAuth } from '@/features/auth/AuthProvider'
import { Button } from '@/components/ui/button'

export default function DashboardPage() {
  const { user, signOut } = useAuth()

  return (
    <div className="min-h-screen p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Finance Tracker</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">{user?.email}</span>
          <Button variant="outline" size="sm" onClick={signOut}>
            Déconnexion
          </Button>
        </div>
      </div>
      <p className="text-muted-foreground">Tableau de bord — à venir</p>
    </div>
  )
}