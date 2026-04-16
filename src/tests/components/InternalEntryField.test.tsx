import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import InternalEntryField from '@/features/transactions/forms/InternalEntryField'

describe('InternalEntryField', () => {
  it('renders checkbox unchecked by default', () => {
    render(
      <InternalEntryField checked={false} onCheckedChange={vi.fn()} categoryLabel="Recettes" />
    )
    expect(screen.getByRole('checkbox')).not.toBeChecked()
  })

  it('renders checkbox checked when checked=true', () => {
    render(
      <InternalEntryField checked={true} onCheckedChange={vi.fn()} categoryLabel="Recettes" />
    )
    expect(screen.getByRole('checkbox')).toBeChecked()
  })

  it('calls onCheckedChange(true) when clicked while unchecked', async () => {
    const onCheckedChange = vi.fn()
    render(
      <InternalEntryField checked={false} onCheckedChange={onCheckedChange} categoryLabel="Recettes" />
    )
    await userEvent.click(screen.getByRole('checkbox'))
    expect(onCheckedChange).toHaveBeenCalledWith(true)
  })

  it('calls onCheckedChange(false) when clicked while checked', async () => {
    const onCheckedChange = vi.fn()
    render(
      <InternalEntryField checked={true} onCheckedChange={onCheckedChange} categoryLabel="Recettes" />
    )
    await userEvent.click(screen.getByRole('checkbox'))
    expect(onCheckedChange).toHaveBeenCalledWith(false)
  })

  it('shows the label text "Entree interne"', () => {
    render(
      <InternalEntryField checked={false} onCheckedChange={vi.fn()} categoryLabel="Salaires" />
    )
    expect(screen.getByText('Entree interne')).toBeInTheDocument()
  })

  it('includes the categoryLabel in the description text', () => {
    render(
      <InternalEntryField checked={false} onCheckedChange={vi.fn()} categoryLabel="Transport" />
    )
    expect(screen.getByText(/Transport/)).toBeInTheDocument()
  })

  it('has label linked to checkbox via htmlFor', () => {
    render(
      <InternalEntryField checked={false} onCheckedChange={vi.fn()} categoryLabel="Recettes" />
    )
    const label = screen.getByText('Entree interne')
    expect(label).toHaveAttribute('for', 'is-internal')
  })
})
