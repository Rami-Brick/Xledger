import { type ReactNode } from 'react'
import { MoreHorizontal, Pencil, Plus, Power, Trash2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  CircularIconButton,
  GlassPanel,
} from '@/components/system-ui/primitives'
import { PrimaryCTA } from '@/components/system-ui/compounds'
import { cn } from '@/lib/utils'

export interface SettingsListItem {
  id: string
  is_active?: boolean | null
}

interface SettingsListPageProps<T extends SettingsListItem> {
  title: string
  subtitle?: string
  items: T[]
  loading: boolean
  emptyMessage?: string
  addLabel: string
  onAdd: () => void
  renderTitle: (item: T) => ReactNode
  renderMeta?: (item: T) => ReactNode
  onEdit: (item: T) => void
  onToggleActive?: (item: T) => void
  onDelete: (item: T) => void
}

export function SettingsListPage<T extends SettingsListItem>({
  title,
  subtitle,
  items,
  loading,
  emptyMessage = 'Aucune entrée pour le moment.',
  addLabel,
  onAdd,
  renderTitle,
  renderMeta,
  onEdit,
  onToggleActive,
  onDelete,
}: SettingsListPageProps<T>) {
  return (
    <div className="relative w-full min-w-0">
      <div
        aria-hidden
        className="pointer-events-none fixed -top-40 -left-40 h-[480px] w-[480px] rounded-full blur-3xl"
        style={{ background: 'rgba(92,214,180,0.10)' }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed -bottom-40 -right-40 h-[520px] w-[520px] rounded-full blur-3xl"
        style={{ background: 'rgba(154,255,90,0.10)' }}
      />

      <div className="relative z-10 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-0.5">
            <h1 className="text-xl font-semibold tracking-tight text-white md:text-2xl">
              {title}
            </h1>
            {subtitle && (
              <p className="text-xs text-white/60 md:text-sm">{subtitle}</p>
            )}
          </div>

          <CircularIconButton
            variant="light"
            size="md"
            icon={<Plus />}
            aria-label={addLabel}
            onClick={onAdd}
            className="md:hidden"
          />
          <PrimaryCTA
            label={addLabel}
            icon={<Plus />}
            aria-label={addLabel}
            onClick={onAdd}
            className="hidden md:inline-flex"
          />
        </div>

        {loading ? (
          <GlassPanel className="p-6">
            <p className="py-6 text-center text-sm text-white/46">Chargement…</p>
          </GlassPanel>
        ) : items.length === 0 ? (
          <GlassPanel className="p-6">
            <p className="py-12 text-center text-sm text-white/60">{emptyMessage}</p>
          </GlassPanel>
        ) : (
          <GlassPanel className="p-3 md:p-4">
            <div className="flex flex-col">
              {items.map((item) => {
                const inactive = item.is_active === false
                return (
                  <div
                    key={item.id}
                    className={cn(
                      'flex items-center justify-between gap-3 rounded-2xl px-2 py-3',
                      inactive && 'opacity-50',
                    )}
                  >
                    <div className="min-w-0 flex flex-col gap-0.5">
                      {renderTitle(item)}
                      {renderMeta && renderMeta(item)}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <CircularIconButton
                          variant="glass"
                          size="sm"
                          icon={<MoreHorizontal />}
                          aria-label="Actions"
                        />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        sideOffset={6}
                        className="min-w-44 rounded-xl border border-white/[0.08] bg-[#141414] p-1.5 text-white shadow-xl ring-0"
                      >
                        <DropdownMenuItem
                          className="gap-2 rounded-lg px-2 py-2 text-sm text-white/90 focus:bg-white/[0.06] focus:text-white"
                          onSelect={(e) => {
                            e.preventDefault()
                            onEdit(item)
                          }}
                        >
                          <Pencil className="size-4" />
                          Modifier
                        </DropdownMenuItem>
                        {onToggleActive && (
                          <DropdownMenuItem
                            className="gap-2 rounded-lg px-2 py-2 text-sm text-white/90 focus:bg-white/[0.06] focus:text-white"
                            onSelect={(e) => {
                              e.preventDefault()
                              onToggleActive(item)
                            }}
                          >
                            <Power className="size-4" />
                            {inactive ? 'Réactiver' : 'Désactiver'}
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator className="my-1 bg-white/[0.06]" />
                        <DropdownMenuItem
                          className="gap-2 rounded-lg px-2 py-2 text-sm text-[#FF9A18] focus:bg-[#FF9A18]/10 focus:text-[#FF9A18]"
                          onSelect={(e) => {
                            e.preventDefault()
                            onDelete(item)
                          }}
                        >
                          <Trash2 className="size-4" />
                          Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )
              })}
            </div>
          </GlassPanel>
        )}
      </div>
    </div>
  )
}

export function SettingsItemTitle({
  name,
  inactiveLabel,
  activeLabel,
  isActive,
}: {
  name: string
  activeLabel: string
  inactiveLabel: string
  isActive: boolean
}) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <p className="truncate text-sm font-medium text-white md:text-[15px]">{name}</p>
      <span
        className={cn(
          'shrink-0 rounded-full px-2 py-0 text-[10px] font-medium',
          isActive
            ? 'bg-[#B8EB3C]/15 text-[#B8EB3C]'
            : 'bg-white/[0.06] text-white/46',
        )}
      >
        {isActive ? activeLabel : inactiveLabel}
      </span>
    </div>
  )
}

export function SettingsItemMeta({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-0.5 text-[12px] text-white/60">
      {children}
    </div>
  )
}
