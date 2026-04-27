import { useState, type FormEvent, type ReactNode } from 'react'
import { useAuth } from './AuthProvider'
import { PillButton } from '@/components/system-ui/primitives'
import { toast } from 'sonner'

export default function LoginPage() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await signIn(email, password)

    if (error) {
      const msg = error.message?.toLowerCase() ?? ''
      if (msg.includes('rate') || msg.includes('429') || msg.includes('too many')) {
        toast.error('Trop de tentatives', {
          description: 'Veuillez attendre quelques minutes avant de réessayer.',
        })
      } else if (msg.includes('network') || msg.includes('fetch')) {
        toast.error('Erreur réseau', {
          description: 'Vérifiez votre connexion internet et réessayez.',
        })
      } else {
        toast.error('Échec de connexion', {
          description: 'Email ou mot de passe incorrect.',
        })
      }
    }

    setLoading(false)
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0A0B0A] px-4">
      {/* Ambient atmosphere — layered gradients for depth */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            'radial-gradient(circle at 15% 20%, rgba(45,124,246,0.18), transparent 55%), radial-gradient(circle at 85% 85%, rgba(154,255,90,0.14), transparent 55%), radial-gradient(circle at 75% 15%, rgba(217,75,244,0.10), transparent 50%)',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed -top-40 -left-40 h-[520px] w-[520px] rounded-full blur-3xl"
        style={{ background: 'rgba(92,214,180,0.14)' }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed -bottom-48 -right-40 h-[560px] w-[560px] rounded-full blur-3xl"
        style={{ background: 'rgba(223,255,47,0.10)' }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed top-1/2 left-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
        style={{ background: 'rgba(45,124,246,0.08)' }}
      />

      <div className="relative z-10 w-full max-w-sm">
        <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6 shadow-[0_8px_32px_rgba(0,0,0,0.35)] backdrop-blur-2xl md:p-8">
          {/* In-card glow */}
          <div
            aria-hidden
            className="pointer-events-none absolute -top-24 -right-24 h-56 w-56 rounded-full blur-3xl"
            style={{ background: 'rgba(223,255,47,0.10)' }}
          />

          <div className="relative z-10 flex flex-col gap-8">
            <div className="flex flex-col items-center gap-4">
              <img
                src="/icon-512.png"
                alt="Xledger"
                className="size-11 drop-shadow-[0_8px_24px_rgba(0,0,0,0.45)]"
              />
              <h1 className="text-[22px] font-semibold leading-none tracking-[-0.01em] text-white">
                Xledger
              </h1>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <FloatingField label="Email" htmlFor="email">
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  autoComplete="email"
                  className="w-full border-0 bg-transparent text-sm text-white outline-none"
                />
              </FloatingField>

              <FloatingField label="Mot de passe" htmlFor="password">
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="w-full border-0 bg-transparent text-sm text-white outline-none"
                />
              </FloatingField>

              <PillButton
                type="submit"
                variant="light"
                size="lg"
                disabled={loading}
                className="mt-2 w-full"
              >
                {loading ? 'Connexion...' : 'Se connecter'}
              </PillButton>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

function FloatingField({
  label,
  htmlFor,
  children,
}: {
  label: string
  htmlFor?: string
  children: ReactNode
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="flex flex-col gap-1 rounded-2xl bg-white/[0.04] px-4 pt-2.5 pb-3 backdrop-blur-sm transition-colors focus-within:bg-white/[0.06] focus-within:ring-1 focus-within:ring-white/20"
    >
      <span className="text-[11px] font-medium leading-none text-white/46">{label}</span>
      {children}
    </label>
  )
}
