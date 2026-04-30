import { describe, expect, it } from 'vitest'
import { formatDate, formatTND, formatWholeDinars } from '@/lib/format'

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

describe('formatTND', () => {
  it('formats zero', () => {
    expect(formatTND(0)).toBe('0 TND')
  })

  it('formats a whole number', () => {
    expect(formatTND(1500)).toBe('1,500 TND')
  })

  it('rounds sub-dinar values away from decimals', () => {
    expect(formatTND(0.001)).toBe('0 TND')
  })

  it('formats negative amount (expense)', () => {
    expect(formatTND(-250.75)).toBe('-251 TND')
  })

  it('formats large amount', () => {
    expect(formatTND(1234567.123)).toBe('1,234,567 TND')
  })

  it('rounds to the nearest whole dinar', () => {
    expect(formatTND(1.6)).toBe('2 TND')
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
