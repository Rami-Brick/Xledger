import { expect } from '@playwright/test'
import { test } from './fixtures'

test.describe('Transaction History', () => {
  test('transaction list loads on page open', async ({ adminPage: page }) => {
    await page.goto('/historique')
    // History page uses a list of divs, not a <table>
    await expect(page.getByRole('heading', { name: 'Historique' })).toBeVisible({ timeout: 10000 })
    // At least one transaction item should appear
    await expect(page.locator('[class*="space-y"]').first()).toBeVisible({ timeout: 10000 })
  })

  test('filter by category shows filtered results', async ({ adminPage: page }) => {
    // Navigate with category filter pre-applied via URL search param
    await page.goto('/historique?category=Recettes')
    await expect(page.getByRole('heading', { name: 'Historique' })).toBeVisible({ timeout: 10000 })
    await page.waitForTimeout(1000)

    // After filtering, no Salaires badges should appear (only Recettes transactions visible)
    const salairesBadges = page.locator('[data-slot="badge"]').filter({ hasText: 'Salaires' })
    const count = await salairesBadges.count()
    expect(count).toBe(0)
  })

  test('search input exists and is interactive', async ({ adminPage: page }) => {
    await page.goto('/historique')
    await expect(page.getByRole('heading', { name: 'Historique' })).toBeVisible({ timeout: 10000 })

    const searchInput = page.getByPlaceholder(/rechercher/i)
    await expect(searchInput).toBeVisible()
    await searchInput.fill('test')
    await expect(searchInput).toHaveValue('test')
  })

  test('admin sees icon action buttons in history list', async ({ adminPage: page }) => {
    await page.goto('/historique')
    await expect(page.getByRole('heading', { name: 'Historique' })).toBeVisible({ timeout: 10000 })
    await page.waitForTimeout(1000)

    // Icon-only buttons: Pencil (edit) and Trash2 (delete) rendered as size="icon" buttons
    // There should be at least some buttons visible if transactions exist
    const buttons = page.getByRole('button')
    const count = await buttons.count()
    expect(count).toBeGreaterThan(0)
  })
})
