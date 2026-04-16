import { describe, expect, it } from 'vitest'
import { cn } from '@/lib/utils'

describe('cn', () => {
  it('merges two simple class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('deduplicates conflicting Tailwind classes (last wins)', () => {
    expect(cn('p-4', 'p-8')).toBe('p-8')
  })

  it('ignores falsy values', () => {
    expect(cn('px-2', undefined, null, false, 'py-3')).toBe('px-2 py-3')
  })

  it('handles conditional object syntax', () => {
    expect(cn({ 'text-red-500': true, 'text-blue-500': false })).toBe('text-red-500')
  })

  it('merges conflicting background classes', () => {
    expect(cn('bg-blue-50', 'bg-blue-100')).toBe('bg-blue-100')
  })

  it('returns empty string when all inputs are falsy', () => {
    expect(cn(undefined, null, false)).toBe('')
  })
})
