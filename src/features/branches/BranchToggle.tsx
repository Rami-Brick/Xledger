import { useBranch } from './BranchProvider'
import { cn } from '@/lib/utils'

const TUNISIA_SLUG = 'tunisia'
const LIBYA_SLUG = 'libya'

/**
 * Two-position branch toggle styled after the InternalEntryField switch.
 * Thumb on the left = Tunisia (red track). Thumb on the right = Libya
 * (green track). Click anywhere on the row flips the active branch.
 */
export default function BranchToggle() {
  const { branches, activeBranch, setActiveBranchId, loading } = useBranch()

  if (loading || !activeBranch) return null

  const tunisia = branches.find((b) => b.slug === TUNISIA_SLUG)
  const libya = branches.find((b) => b.slug === LIBYA_SLUG)
  if (!tunisia || !libya) return null

  const isLibya = activeBranch.slug === LIBYA_SLUG

  const handleToggle = () => {
    setActiveBranchId(isLibya ? tunisia.id : libya.id)
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isLibya}
      aria-label={`Branche active: ${activeBranch.name}. Cliquer pour basculer.`}
      onClick={handleToggle}
      className="flex w-full items-center justify-between gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
    >
      <span className="text-sm font-medium text-white/90">Branche</span>

      <span className="inline-flex items-center gap-2">
        <span
          className={cn(
            'text-[11px] font-medium tabular-nums transition-colors',
            !isLibya ? 'text-white/90' : 'text-white/46',
          )}
        >
          Tunisia
        </span>

        <span
          aria-hidden
          className={cn(
            'relative inline-flex h-6 w-10 shrink-0 items-center rounded-full transition-colors duration-200',
            isLibya ? 'bg-[#3CCB6A]' : 'bg-[#E0444F]',
          )}
        >
          <span
            className={cn(
              'inline-block size-5 rounded-full bg-white shadow transition-all duration-200',
              isLibya ? 'translate-x-[18px]' : 'translate-x-0.5',
            )}
          />
        </span>

        <span
          className={cn(
            'text-[11px] font-medium tabular-nums transition-colors',
            isLibya ? 'text-white/90' : 'text-white/46',
          )}
        >
          Libya
        </span>
      </span>
    </button>
  )
}
