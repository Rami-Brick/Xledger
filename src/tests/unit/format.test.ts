import { describe, expect, it } from 'vitest'
import { formatCurrency, formatDate, formatWholeDinars } from '@/lib/format'

describe('formatWholeDinars', () => {
  it('formats zero', () => {
    expect(formatWholeDinars(0)).toBe('0')
  })

  it('adds thousands separators', () => {
    expect(formatWholeDinars(12500)).toBe('12,500')
  })

  it('rounds decimal values to whole dinars', () => {
    expect(formatWholeDinars(250.75)).toBe('251')
  })
})

describe('formatCurrency', () => {
  it('formats zero with TND', () => {
    expect(formatCurrency(0, 'TND')).toBe('0 TND')
  })

  it('formats zero with LYD', () => {
    expect(formatCurrency(0, 'LYD')).toBe('0 LYD')
  })

  it('formats a whole number with TND', () => {
    expect(formatCurrency(1500, 'TND')).toBe('1,500 TND')
  })

  it('formats a whole number with LYD', () => {
    expect(formatCurrency(1500, 'LYD')).toBe('1,500 LYD')
  })

  it('rounds sub-unit values away from decimals', () => {
    expect(formatCurrency(0.001, 'TND')).toBe('0 TND')
  })

  it('formats negative amount (expense)', () => {
    expect(formatCurrency(-250.75, 'TND')).toBe('-251 TND')
  })

  it('formats large amount', () => {
    expect(formatCurrency(1234567.123, 'LYD')).toBe('1,234,567 LYD')
  })

  it('rounds to the nearest whole unit', () => {
    expect(formatCurrency(1.6, 'TND')).toBe('2 TND')
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
