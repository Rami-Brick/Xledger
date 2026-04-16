import { expect } from '@playwright/test'
import { test } from './fixtures'

test.describe('Add Transaction', () => {
  test('admin can add a Recettes transaction', async ({ adminPage: page }) => {
    await page.goto('/ajouter')
    await page.getByText('Recettes').click()

    await page.getByLabel(/Description/).fill('Vente produits mai')
    await page.getByLabel('Montant (TND)').fill('1500')
    await page.getByRole('button', { name: 'Enregistrer' }).click()

    await expect(page.getByText(/transaction.*enregistr|enregistr.*transaction/i)).toBeVisible({ timeout: 5000 })
  })

  test('admin can add a Salaires transaction', async ({ adminPage: page }) => {
    await page.goto('/ajouter')
    await page.getByText('Salaires').click()

    // Select first employee from dropdown
    await page.getByRole('combobox').first().click()
    await page.getByRole('option').first().click()

    // The salary status panel should appear
    await page.waitForTimeout(500)

    const amountInput = page.getByLabel('Montant (TND)')
    const currentVal = await amountInput.inputValue()
    if (!currentVal || currentVal === '0') {
      await amountInput.fill('1000')
    }

    await page.getByRole('button', { name: /enregistrer/i }).click()
    await expect(page.locator('[data-sonner-toast]').first()).toBeVisible({ timeout: 5000 })
  })

  test('admin can add a Charges fixes transaction with auto-populated amount', async ({ adminPage: page }) => {
    await page.goto('/ajouter')
    await page.getByText('Charges fixes').click()

    await page.getByRole('combobox').click()
    await page.getByRole('option').first().waitFor()
    await page.getByRole('option').first().click()

    // Amount should be auto-populated (greater than 0)
    await page.waitForTimeout(300)
    const amount = await page.getByLabel('Montant (TND)').inputValue()
    expect(Number(amount)).toBeGreaterThan(0)

    await page.getByRole('button', { name: 'Enregistrer la charge' }).click()
    await expect(page.locator('[data-sonner-toast]').first()).toBeVisible({ timeout: 5000 })
  })

  test('admin can add a Prêts transaction in Recu mode', async ({ adminPage: page }) => {
    await page.goto('/ajouter')
    await page.getByText('Prêts').click()

    // Recu is default
    await page.getByRole('combobox').click()
    await page.getByRole('option').first().waitFor()
    await page.getByRole('option').first().click()

    await page.getByLabel('Montant (TND)').fill('500')
    await page.getByRole('button', { name: 'Enregistrer le recu' }).click()
    await expect(page.locator('[data-sonner-toast]').first()).toBeVisible({ timeout: 5000 })
  })

  test('admin can add a Prêts transaction in Rendu mode', async ({ adminPage: page }) => {
    await page.goto('/ajouter')
    await page.getByText('Prêts').click()

    await page.getByRole('button', { name: 'Rendu' }).click()
    await expect(page.getByText(/argent qui sort/i)).toBeVisible()

    await page.getByRole('combobox').click()
    await page.getByRole('option').first().waitFor()
    await page.getByRole('option').first().click()

    await page.getByLabel('Montant (TND)').fill('200')
    await page.getByRole('button', { name: 'Enregistrer le rendu' }).click()
    await expect(page.locator('[data-sonner-toast]').first()).toBeVisible({ timeout: 5000 })
  })

  test('viewer is redirected away from /ajouter', async ({ viewerPage: page }) => {
    await page.goto('/ajouter')
    // HomeRedirect renders dashboard content for viewers (at / or /dashboard)
    await expect(page.getByText('Solde total')).toBeVisible({ timeout: 5000 })
  })
})
