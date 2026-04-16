import { expect } from '@playwright/test'
import { test } from './fixtures'

test.describe('Dashboard', () => {
  test('stat cards are visible on load', async ({ adminPage: page }) => {
    await page.goto('/dashboard')

    await expect(page.getByText('Solde total')).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('Recettes ce mois')).toBeVisible()
    await expect(page.getByText('Dépenses ce mois')).toBeVisible()
    await expect(page.getByText('Net ce mois')).toBeVisible()
  })

  test('recent transactions section is visible', async ({ adminPage: page }) => {
    await page.goto('/dashboard')
    await expect(page.getByText(/transactions récentes/i)).toBeVisible({ timeout: 10000 })
  })

  test('viewer can see the dashboard', async ({ viewerPage: page }) => {
    await page.goto('/dashboard')
    await expect(page.getByText('Solde total')).toBeVisible({ timeout: 10000 })
  })
})
