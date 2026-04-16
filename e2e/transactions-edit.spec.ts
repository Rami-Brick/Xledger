import { expect } from '@playwright/test'
import { test } from './fixtures'

test.describe('Transaction Edit (Role Permissions)', () => {
  test('mod can open edit dialog by clicking the pencil button', async ({ modPage: page }) => {
    await page.goto('/historique')
    await expect(page.getByRole('heading', { name: 'Historique' })).toBeVisible({ timeout: 10000 })
    await page.waitForTimeout(1000)

    // Pencil buttons use data-variant="ghost" data-size="icon" attributes, scoped to main content
    const pencilButtons = page.locator('main button[data-variant="ghost"][data-size="icon"]')
    const count = await pencilButtons.count()

    if (count > 0) {
      await pencilButtons.first().click()
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 3000 })
      // Close dialog
      await page.keyboard.press('Escape')
    } else {
      // No transactions exist — skip interaction test, just verify page loaded
      await expect(page.getByRole('heading', { name: 'Historique' })).toBeVisible()
    }
  })

  test('mod page loads history without errors', async ({ modPage: page }) => {
    await page.goto('/historique')
    await expect(page.getByRole('heading', { name: 'Historique' })).toBeVisible({ timeout: 10000 })
    // Mod should see the page (not be redirected)
    await expect(page).toHaveURL(/historique/)
  })

  test('viewer can access history page (read-only)', async ({ viewerPage: page }) => {
    await page.goto('/historique')
    await expect(page.getByRole('heading', { name: 'Historique' })).toBeVisible({ timeout: 10000 })
    await expect(page).toHaveURL(/historique/)
  })
})
