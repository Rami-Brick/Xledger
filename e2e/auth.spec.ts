import { expect, test } from '@playwright/test'

test.describe('Authentication', () => {
  test('unauthenticated user navigating to /dashboard is redirected to /login', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/)
  })

  test('admin logs in and sees the Add Transaction page', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Email').fill(process.env.TEST_ADMIN_EMAIL!)
    await page.getByLabel('Mot de passe').fill(process.env.TEST_ADMIN_PASSWORD!)
    await page.getByRole('button', { name: 'Se connecter' }).click()

    // After login, HomeRedirect renders AddTransactionPage for admins (canCreateTransactions)
    await expect(page).not.toHaveURL(/\/login/, { timeout: 10000 })
    await expect(page.getByText('Ajouter une transaction')).toBeVisible({ timeout: 10000 })
  })

  test('viewer logs in and sees the Dashboard page', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Email').fill(process.env.TEST_VIEWER_EMAIL!)
    await page.getByLabel('Mot de passe').fill(process.env.TEST_VIEWER_PASSWORD!)
    await page.getByRole('button', { name: 'Se connecter' }).click()

    // After login, HomeRedirect renders DashboardPage for viewers
    await expect(page).not.toHaveURL(/\/login/, { timeout: 10000 })
    await expect(page.getByRole('heading', { name: 'Tableau de bord' })).toBeVisible({ timeout: 10000 })
  })

  test('wrong credentials shows error toast', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Email').fill('wrong@email.com')
    await page.getByLabel('Mot de passe').fill('wrongpassword')
    await page.getByRole('button', { name: 'Se connecter' }).click()

    await expect(page.getByText('Échec de connexion')).toBeVisible({ timeout: 5000 })
  })

  test('logout returns user to /login', async ({ page }) => {
    // Login first
    await page.goto('/login')
    await page.getByLabel('Email').fill(process.env.TEST_ADMIN_EMAIL!)
    await page.getByLabel('Mot de passe').fill(process.env.TEST_ADMIN_PASSWORD!)
    await page.getByRole('button', { name: 'Se connecter' }).click()
    await expect(page).not.toHaveURL(/\/login/, { timeout: 10000 })

    // Logout — button text is "Deconnexion" in the sidebar
    await page.getByRole('button', { name: 'Deconnexion' }).click()
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 })
  })
})
