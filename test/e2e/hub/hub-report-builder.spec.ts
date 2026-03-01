import { expect, test } from '@playwright/test'

test.describe('hub report designer compatibility @functional', () => {
	async function waitForHydration(page: import('@playwright/test').Page) {
		await page.goto('/hub/reporting', { waitUntil: 'networkidle' })
		await expect(page.getByRole('tab', { name: /designer/i })).toBeVisible({
			timeout: 10_000,
		})
	}

	test('reporting page loads with template/designer/saved tabs', async ({
		page,
	}) => {
		await waitForHydration(page)
		await expect(page.getByRole('tab', { name: /templates/i })).toBeVisible()
		await expect(page.getByRole('tab', { name: /designer/i })).toBeVisible()
		await expect(
			page.getByRole('tab', { name: /saved layouts/i }),
		).toBeVisible()
	})

	test('designer tab can render canvas controls', async ({ page }) => {
		await waitForHydration(page)
		await page.getByRole('tab', { name: /designer/i }).click()
		await expect(
			page.getByRole('button', { name: /save/i }).first(),
		).toBeVisible()
		await expect(
			page.getByRole('button', { name: /preview/i }).first(),
		).toBeVisible()
		await expect(page.getByText('Page navigator')).toBeVisible({
			timeout: 10_000,
		})
	})
})
