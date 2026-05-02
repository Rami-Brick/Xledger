import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import FixedChargeFormDialog from '@/features/fixed-charges/FixedChargeFormDialog'
import type { FixedCharge } from '@/features/fixed-charges/api'

const scheduledCharge: FixedCharge = {
  id: 'charge-1',
  created_at: '',
  name: 'Internet',
  default_amount: 100,
  is_active: true,
  schedule_enabled: true,
  recurrence_frequency: 'yearly',
  recurrence_interval: 2,
  schedule_start_date: '2026-05-02',
  due_day_of_week: 6,
  due_day_of_month: 15,
  due_month: 5,
  due_day_mode: 'day_of_month',
  generate_days_ahead: 90,
}

describe('FixedChargeFormDialog', () => {
  it('hides schedule controls by default', () => {
    render(
      <FixedChargeFormDialog
        open
        onOpenChange={vi.fn()}
        onSubmit={vi.fn().mockResolvedValue(undefined)}
      />
    )

    expect(screen.getByText('Planification')).toBeVisible()
    expect(screen.queryByText('Periodicite')).not.toBeInTheDocument()
  })

  it('shows schedule controls when planification is enabled', async () => {
    render(
      <FixedChargeFormDialog
        open
        onOpenChange={vi.fn()}
        onSubmit={vi.fn().mockResolvedValue(undefined)}
      />
    )

    await userEvent.click(screen.getByRole('checkbox'))

    expect(screen.getByText('Periodicite')).toBeVisible()
    expect(screen.getByLabelText('Debut')).toBeVisible()
    expect(screen.getByLabelText("Generer a l'avance")).toBeVisible()
  })

  it('hydrates schedule fields when editing an existing scheduled charge', async () => {
    render(
      <FixedChargeFormDialog
        open
        charge={scheduledCharge}
        onOpenChange={vi.fn()}
        onSubmit={vi.fn().mockResolvedValue(undefined)}
      />
    )

    await waitFor(() => {
      expect(screen.getByRole('checkbox')).toBeChecked()
    })

    expect((screen.getByLabelText('Debut') as HTMLInputElement).value).toBe('2026-05-02')
    expect((screen.getByLabelText('Tous les') as HTMLInputElement).value).toBe('2')
    expect((screen.getByLabelText("Generer a l'avance") as HTMLInputElement).value).toBe('90')
  })
})
