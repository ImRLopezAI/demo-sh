import { expect, test } from '@playwright/test'

test.describe('insight module views @functional', () => {
	test('insight dashboard renders', async ({ page }) => {
		await page.goto('/insight/dashboard')
		await expect(page.locator('[data-slot="view-component"]')).toBeVisible({
			timeout: 15_000,
		})
	})

	test('item ledger list renders', async ({ page }) => {
		await page.goto('/insight/item-ledger')
		await expect(
			page.getByRole('heading', { name: /item ledger/i }),
		).toBeVisible({ timeout: 10_000 })
	})

	test('locations list renders', async ({ page }) => {
		await page.goto('/insight/locations')
		await expect(page.getByRole('heading', { name: /location/i })).toBeVisible({
			timeout: 10_000,
		})
	})

	test('value entries list renders', async ({ page }) => {
		await page.goto('/insight/value-entries')
		await expect(
			page.getByRole('heading', { name: /value entr/i }),
		).toBeVisible({ timeout: 10_000 })
	})

	test('forecast workbench renders', async ({ page }) => {
		await page.goto('/insight/forecast-workbench')
		await expect(
			page.getByRole('heading', { name: /forecast|workbench/i }).first(),
		).toBeVisible({ timeout: 10_000 })
	})
})
