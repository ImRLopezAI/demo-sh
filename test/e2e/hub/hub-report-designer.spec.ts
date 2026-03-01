import { expect, test } from '@playwright/test'

test.describe('hub report designer @functional', () => {
	async function openDesigner(page: import('@playwright/test').Page) {
		await page.goto('/hub/reporting', { waitUntil: 'networkidle' })
		await expect(page.getByRole('tab', { name: /designer/i })).toBeVisible({
			timeout: 10_000,
		})
		await page.getByRole('tab', { name: /designer/i }).click()
		await expect(page.getByText('Page navigator')).toBeVisible({
			timeout: 10_000,
		})
	}

	test('designer tab renders the visual report editor shell', async ({
		page,
	}) => {
		await openDesigner(page)
		await expect(
			page.getByRole('button', { name: /save/i }).first(),
		).toBeVisible()
		await expect(
			page.getByRole('button', { name: /preview/i }).first(),
		).toBeVisible()
	})

	test('toolbox supports quick element insertion', async ({ page }) => {
		await openDesigner(page)
		const textboxLocator = page.getByRole('button', {
			name: /select textbox element/i,
		})
		const countBefore = await textboxLocator.count()
		await page
			.getByRole('button', { name: /insert text box/i })
			.first()
			.click()
		await expect
			.poll(async () => textboxLocator.count(), { timeout: 10_000 })
			.toBeGreaterThan(countBefore)
	})
})
