import { Check, ChevronDown } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { useBranch } from './BranchProvider'

export default function BranchSwitcher() {
  const { branches, activeBranch, setActiveBranchId, loading } = useBranch()

  if (loading || !activeBranch) return null

  if (branches.length <= 1) {
    return (
      <div
        className="hidden sm:flex shrink-0 items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-xs text-white/72"
        title={`${activeBranch.name} (${activeBranch.currency_code})`}
      >
        <span className="font-medium text-white/90">{activeBranch.name}</span>
        <span className="text-white/46">{activeBranch.currency_code}</span>
      </div>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Branche active: ${activeBranch.name}`}
          className={cn(
            'shrink-0 inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-xs text-white/90',
            'transition-colors hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-black',
          )}
        >
          <span className="font-medium">{activeBranch.name}</span>
          <span className="text-white/46">{activeBranch.currency_code}</span>
          <ChevronDown className="size-3.5 text-white/46" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-56 rounded-2xl border border-white/[0.08] bg-[#141414] p-1.5 text-white shadow-xl ring-0"
      >
        <DropdownMenuLabel className="px-2 py-1.5 text-[11px] font-normal text-white/46">
          Branche
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="my-1 bg-white/[0.06]" />
        {branches.map((branch) => {
          const isActive = branch.id === activeBranch.id
          return (
            <DropdownMenuItem
              key={branch.id}
              className="gap-2 rounded-lg px-2 py-2 text-sm text-white/90 focus:bg-white/[0.06] focus:text-white"
              onSelect={(e) => {
                e.preventDefault()
                if (!isActive) setActiveBranchId(branch.id)
              }}
            >
              <Check className={cn('size-4', isActive ? 'opacity-100' : 'opacity-0')} />
              <span className="flex-1">{branch.name}</span>
              <span className="text-[11px] text-white/46">{branch.currency_code}</span>
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
