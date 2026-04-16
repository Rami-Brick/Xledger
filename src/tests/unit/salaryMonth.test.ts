import { describe, expect, it } from 'vitest'
import {
  formatSalaryMonthLabel,
  getEffectiveSalaryMonth,
  isSalaryMonthDifferentFromEntryDate,
  normalizeSalaryMonth,
} from '@/features/transactions/salaryMonth'

describe('normalizeSalaryMonth', () => {
  it('returns null for null input', () => {
    expect(normalizeSalaryMonth(null)).toBeNull()
  })

  it('returns null for undefined input', () => {
    expect(normalizeSalaryMonth(undefined)).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(normalizeSalaryMonth('')).toBeNull()
  })

  it('converts YYYY-MM to YYYY-MM-01', () => {
    expect(normalizeSalaryMonth('2024-03')).toBe('2024-03-01')
  })

  it('truncates full date to first of month', () => {
    expect(normalizeSalaryMonth('2024-03-15')).toBe('2024-03-01')
  })

  it('returns same value when already normalized', () => {
    expect(normalizeSalaryMonth('2024-03-01')).toBe('2024-03-01')
  })

  it('returns null for too-short string', () => {
    expect(normalizeSalaryMonth('202')).toBeNull()
  })
})

describe('getEffectiveSalaryMonth', () => {
  it('falls back to date when salary_month is null', () => {
    expect(getEffectiveSalaryMonth({ date: '2024-04-10', salary_month: null })).toBe('2024-04-01')
  })

  it('falls back to date when salary_month is undefined', () => {
    expect(getEffectiveSalaryMonth({ date: '2024-04-10' })).toBe('2024-04-01')
  })

  it('uses salary_month when it differs from date', () => {
    expect(
      getEffectiveSalaryMonth({ date: '2024-04-10', salary_month: '2024-03-01' })
    ).toBe('2024-03-01')
  })

  it('uses salary_month even when it matches the date month', () => {
    expect(
      getEffectiveSalaryMonth({ date: '2024-04-10', salary_month: '2024-04-01' })
    ).toBe('2024-04-01')
  })
})

describe('isSalaryMonthDifferentFromEntryDate', () => {
  it('returns false when salary_month is null', () => {
    expect(isSalaryMonthDifferentFromEntryDate({ date: '2024-04-10', salary_month: null })).toBe(false)
  })

  it('returns false when salary_month is undefined', () => {
    expect(isSalaryMonthDifferentFromEntryDate({ date: '2024-04-10' })).toBe(false)
  })

  it('returns false when salary_month is same month as date', () => {
    expect(
      isSalaryMonthDifferentFromEntryDate({ date: '2024-04-10', salary_month: '2024-04-01' })
    ).toBe(false)
  })

  it('returns true when salary_month is a different month than date', () => {
    expect(
      isSalaryMonthDifferentFromEntryDate({ date: '2024-04-10', salary_month: '2024-03-01' })
    ).toBe(true)
  })
})

describe('formatSalaryMonthLabel', () => {
  it('returns empty string for null', () => {
    expect(formatSalaryMonthLabel(null)).toBe('')
  })

  it('returns empty string for undefined', () => {
    expect(formatSalaryMonthLabel(undefined)).toBe('')
  })

  it('returns empty string for empty string', () => {
    expect(formatSalaryMonthLabel('')).toBe('')
  })

  it('formats March 2024 in French', () => {
    expect(formatSalaryMonthLabel('2024-03-01')).toMatch(/mars/i)
    expect(formatSalaryMonthLabel('2024-03-01')).toContain('2024')
  })

  it('formats January 2024 in French', () => {
    expect(formatSalaryMonthLabel('2024-01-01')).toMatch(/janvier/i)
    expect(formatSalaryMonthLabel('2024-01-01')).toContain('2024')
  })

  it('formats December 2024 in French', () => {
    expect(formatSalaryMonthLabel('2024-12-01')).toMatch(/d[eé]cembre/i)
  })

  it('normalizes YYYY-MM input before formatting', () => {
    expect(formatSalaryMonthLabel('2024-03')).toMatch(/mars/i)
  })

  it('starts with an uppercase letter', () => {
    const result = formatSalaryMonthLabel('2024-03-01')
    expect(result.charAt(0)).toBe(result.charAt(0).toUpperCase())
  })
})
