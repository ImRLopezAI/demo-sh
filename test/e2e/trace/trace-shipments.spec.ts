import { expect, test } from '@playwright/test'
import { DataGridFixture } from '../fixtures/data-grid.fixture'

test.describe('trace shipments @functional', () => {
	test('shipments list renders with data', async ({ page }) => {
		await page.goto('/trace/shipments')
		await expect(page.getByRole('heading', { name: /shipment/i })).toBeVisible({
			timeout: 10_000,
		})
		const grid = new DataGridFixture(page)
		await grid.waitForRows()
	})

	test('shipment methods list renders', async ({ page }) => {
		await page.goto('/trace/shipment-methods')
		await expect(
			page.getByRole('heading', { name: /shipment method/i }),
		).toBeVisible({ timeout: 10_000 })
	})

	test('carrier ops page renders', async ({ page }) => {
		await page.goto('/trace/carrier-ops')
		await expect(
			page.getByRole('heading', { name: /carrier/i }).first(),
		).toBeVisible({
			timeout: 10_000,
		})
	})

	test('trace dashboard renders', async ({ page }) => {
		await page.goto('/trace/dashboard')
		await expect(page.locator('[data-slot="view-component"]')).toBeVisible({
			timeout: 15_000,
		})
	})
})
