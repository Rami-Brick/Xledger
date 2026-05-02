import { expect } from '@playwright/test'
import { test } from './fixtures'

test.describe('Fixed charge requests', () => {
  test('admin can open the fixed-charge approval bell', async ({ adminPage: page }) => {
    await page.goto('/dashboard')

    await page.getByLabel(/charges a valider/i).click()

    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByText(/charges a valider/i).first()).toBeVisible()
  })

  test('admin can open upcoming fixed charges from the category detail', async ({ adminPage: page }) => {
    await page.goto('/categories')
    await page.getByText('Charges fixes').click()
    await page.getByRole('button', { name: /charges a venir/i }).click()

    await expect(page).toHaveURL(/\/charges-fixes-a-venir/)
    await expect(page.getByRole('heading', { name: /charges a valider/i })).toBeVisible()
  })

  test('viewer cannot access upcoming fixed charges', async ({ viewerPage: page }) => {
    await page.goto('/charges-fixes-a-venir')

    await expect(page).not.toHaveURL(/\/charges-fixes-a-venir/, { timeout: 5000 })
  })
})
