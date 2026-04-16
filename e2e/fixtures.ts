import { test as base, type Page } from '@playwright/test'

async function loginAs(page: Page, email: string, password: string) {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(email)
  await page.getByLabel(/mot de passe/i).fill(password)
  await page.getByRole('button', { name: 'Se connecter' }).click()
  // Wait until redirected away from login
  await page.waitForURL((url) => !url.pathname.includes('/login'))
}

type Fixtures = {
  adminPage: Page
  modPage: Page
  viewerPage: Page
}

export const test = base.extend<Fixtures>({
  adminPage: async ({ browser }, use) => {
    const context = await browser.newContext()
    const page = await context.newPage()
    await loginAs(
      page,
      process.env.TEST_ADMIN_EMAIL!,
      process.env.TEST_ADMIN_PASSWORD!
    )
    await use(page)
    await context.close()
  },

  modPage: async ({ browser }, use) => {
    const context = await browser.newContext()
    const page = await context.newPage()
    await loginAs(
      page,
      process.env.TEST_MOD_EMAIL!,
      process.env.TEST_MOD_PASSWORD!
    )
    await use(page)
    await context.close()
  },

  viewerPage: async ({ browser }, use) => {
    const context = await browser.newContext()
    const page = await context.newPage()
    await loginAs(
      page,
      process.env.TEST_VIEWER_EMAIL!,
      process.env.TEST_VIEWER_PASSWORD!
    )
    await use(page)
    await context.close()
  },
})

export { expect } from '@playwright/test'
