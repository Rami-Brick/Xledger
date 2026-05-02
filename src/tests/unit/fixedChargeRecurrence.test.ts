import { describe, expect, it } from 'vitest'
import type { FixedCharge } from '@/features/fixed-charges/api'
import { generateFixedChargeDueDates } from '@/features/fixed-charges/recurrence'

const baseCharge: FixedCharge = {
  id: 'charge-1',
  created_at: '',
  name: 'Internet',
  default_amount: 100,
  is_active: true,
  schedule_enabled: true,
  recurrence_frequency: 'monthly',
  recurrence_interval: 1,
  schedule_start_date: '2026-01-01',
  due_day_of_week: null,
  due_day_of_month: 5,
  due_month: null,
  due_day_mode: 'day_of_month',
  generate_days_ahead: 45,
}

describe('generateFixedChargeDueDates', () => {
  it('generates weekly dates for the configured weekday', () => {
    const dates = generateFixedChargeDueDates(
      {
        ...baseCharge,
        recurrence_frequency: 'weekly',
        schedule_start_date: '2026-05-01',
        due_day_of_week: 1,
        generate_days_ahead: 21,
      },
      '2026-05-01'
    )

    expect(dates).toEqual(['2026-05-04', '2026-05-11', '2026-05-18'])
  })

  it('generates monthly dates for the configured day', () => {
    const dates = generateFixedChargeDueDates(
      {
        ...baseCharge,
        schedule_start_date: '2026-01-01',
        due_day_of_month: 10,
        generate_days_ahead: 45,
      },
      '2026-01-01'
    )

    expect(dates).toEqual(['2026-01-10', '2026-02-10'])
  })

  it('generates last-day-of-month dates', () => {
    const dates = generateFixedChargeDueDates(
      {
        ...baseCharge,
        schedule_start_date: '2026-01-01',
        due_day_mode: 'last_day_of_month',
        generate_days_ahead: 90,
      },
      '2026-01-01'
    )

    expect(dates).toEqual(['2026-01-31', '2026-02-28', '2026-03-31'])
  })

  it('generates yearly dates for the configured month and day', () => {
    const dates = generateFixedChargeDueDates(
      {
        ...baseCharge,
        recurrence_frequency: 'yearly',
        schedule_start_date: '2026-01-01',
        due_month: 4,
        due_day_of_month: 15,
        generate_days_ahead: 500,
      },
      '2026-01-01'
    )

    expect(dates).toEqual(['2026-04-15', '2027-04-15'])
  })

  it('respects every-N interval behavior', () => {
    const dates = generateFixedChargeDueDates(
      {
        ...baseCharge,
        recurrence_interval: 2,
        schedule_start_date: '2026-01-01',
        due_day_of_month: 5,
        generate_days_ahead: 130,
      },
      '2026-01-01'
    )

    expect(dates).toEqual(['2026-01-05', '2026-03-05', '2026-05-05'])
  })

  it('clamps invalid month days to month end', () => {
    const dates = generateFixedChargeDueDates(
      {
        ...baseCharge,
        schedule_start_date: '2026-01-01',
        due_day_of_month: 31,
        generate_days_ahead: 90,
      },
      '2026-01-01'
    )

    expect(dates).toEqual(['2026-01-31', '2026-02-28', '2026-03-31'])
  })

  it('does not return duplicate dates', () => {
    const dates = generateFixedChargeDueDates(
      {
        ...baseCharge,
        schedule_start_date: '2026-01-01',
        due_day_of_month: 1,
        generate_days_ahead: 31,
      },
      '2026-01-01'
    )

    expect(new Set(dates).size).toBe(dates.length)
  })
})
