import { useBranch } from './BranchProvider'

const PALETTES = {
  libya: {
    primary: 'var(--kit-color-glow-libya-primary)',
    secondary: 'var(--kit-color-glow-libya-secondary)',
  },
  tunisia: {
    primary: 'var(--kit-color-glow-tunisia-primary)',
    secondary: 'var(--kit-color-glow-tunisia-secondary)',
  },
} as const

export default function BranchGlow() {
  const { activeBranch } = useBranch()
  const palette =
    activeBranch?.slug === 'tunisia' ? PALETTES.tunisia : PALETTES.libya

  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none fixed -top-40 -left-40 h-[480px] w-[480px] rounded-full blur-3xl transition-colors duration-500"
        style={{ background: palette.primary }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed -bottom-40 -right-40 h-[520px] w-[520px] rounded-full blur-3xl transition-colors duration-500"
        style={{ background: palette.secondary }}
      />
    </>
  )
}
