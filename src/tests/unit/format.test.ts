import { describe, expect, it } from 'vitest'
import { formatDate, formatTND } from '@/lib/format'

describe('formatTND', () => {
  it('formats zero', () => {
    expect(formatTND(0)).toBe('0.000 TND')
  })

  it('formats a whole number', () => {
    expect(formatTND(1500)).toBe('1500.000 TND')
  })

  it('formats minimum TND unit', () => {
    expect(formatTND(0.001)).toBe('0.001 TND')
  })

  it('formats negative amount (expense)', () => {
    expect(formatTND(-250.75)).toBe('-250.750 TND')
  })

  it('formats large amount', () => {
    expect(formatTND(1234567.123)).toBe('1234567.123 TND')
  })

  it('rounds to 3 decimal places', () => {
    expect(formatTND(1.0006)).toBe('1.001 TND')
  })
})

describe('formatDate', () => {
  it('formats a standard date in DD/MM/YYYY pattern', () => {
    const result = formatDate('2024-01-15')
    expect(result).toMatch(/\d{2}\/\d{2}\/\d{4}/)
  })

  it('formats last day of year without throwing', () => {
    expect(() => formatDate('2024-12-31')).not.toThrow()
  })

  it('formats leap year date without throwing', () => {
    expect(() => formatDate('2024-02-29')).not.toThrow()
  })

  it('contains the correct year', () => {
    expect(formatDate('2024-06-15')).toContain('2024')
  })
})
