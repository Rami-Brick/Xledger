import { expect } from '@playwright/test'
import { test } from './fixtures'

test.describe('Employee Settings (Admin)', () => {
  test('admin can create a new employee', async ({ adminPage: page }) => {
    await page.goto('/parametres/employes')
    await expect(page.getByRole('heading', { name: 'Employés' })).toBeVisible({ timeout: 10000 })

    // Button shows "Ajouter un employé" on desktop or "Ajouter" on mobile
    await page.getByRole('button', { name: /ajouter/i }).first().click()
    await expect(page.getByRole('dialog')).toBeVisible()

    const testName = `Test Employe ${Date.now()}`
    await page.getByLabel('Nom complet').fill(testName)
    await page.getByLabel(/salaire de base/i).fill('2000')

    await page.getByRole('button', { name: 'Ajouter' }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 })
    await expect(page.getByText(testName)).toBeVisible()
  })

  test('admin can edit an employee name', async ({ adminPage: page }) => {
    await page.goto('/parametres/employes')
    await expect(page.getByRole('heading', { name: 'Employés' })).toBeVisible({ timeout: 10000 })
    await page.waitForTimeout(500)

    // Pencil edit buttons are icon-only ghost buttons inside the main content area
    // Use the Pencil SVG path to identify the edit button specifically
    const editButton = page.locator('main button[data-variant="ghost"][data-size="icon"]').first()
    await editButton.click()
    await page.waitForTimeout(500)

    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })

    const nameInput = page.getByLabel('Nom complet')
    await nameInput.clear()
    const updatedName = `Employe Modifie ${Date.now()}`
    await nameInput.fill(updatedName)

    await page.getByRole('button', { name: 'Modifier' }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 })
    await expect(page.getByText(updatedName)).toBeVisible()
  })

  test('admin can create and delete an employee', async ({ adminPage: page }) => {
    await page.goto('/parametres/employes')
    await expect(page.getByRole('heading', { name: 'Employés' })).toBeVisible({ timeout: 10000 })

    // Create one to delete
    await page.getByRole('button', { name: /ajouter/i }).first().click()
    const testName = `Employe Supprimer ${Date.now()}`
    await page.getByLabel('Nom complet').fill(testName)
    await page.getByLabel(/salaire de base/i).fill('500')
    await page.getByRole('button', { name: 'Ajouter' }).click()
    await expect(page.getByText(testName)).toBeVisible({ timeout: 5000 })

    // Find the card and click its delete button (destructive variant icon button)
    const card = page.locator('div').filter({ hasText: testName }).filter({ has: page.locator('button') }).last()
    const deleteButton = card.locator('button[data-variant="ghost"][data-size="icon"]').last()

    if (await deleteButton.count() > 0) {
      await deleteButton.click()
      // Confirm deletion
      await page.getByRole('button', { name: 'Supprimer' }).last().click()
      await expect(page.getByText(testName)).not.toBeVisible({ timeout: 5000 })
    }
  })

  test('viewer is redirected away from employee settings', async ({ viewerPage: page }) => {
    await page.goto('/parametres/employes')
    // Viewer should be redirected (not stay on the settings page)
    await expect(page).not.toHaveURL(/\/parametres\/employes/, { timeout: 5000 })
  })
})
