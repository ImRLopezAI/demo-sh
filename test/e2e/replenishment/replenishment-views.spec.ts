import { expect, test } from '@playwright/test'
import { DataGridFixture } from '../fixtures/data-grid.fixture'

test.describe('replenishment module views @functional', () => {
	test('replenishment dashboard renders', async ({ page }) => {
		await page.goto('/replenishment/dashboard')
		await expect(page.locator('[data-slot="view-component"]')).toBeVisible({
			timeout: 15_000,
		})
	})

	test('vendors list renders with data', async ({ page }) => {
		await page.goto('/replenishment/vendors')
		await expect(page.getByRole('heading', { name: /vendor/i })).toBeVisible({
			timeout: 10_000,
		})
		const grid = new DataGridFixture(page)
		await grid.waitForRows()
	})

	test('transfers list renders', async ({ page }) => {
		await page.goto('/replenishment/transfers')
		await expect(page.getByRole('heading', { name: /transfer/i })).toBeVisible({
			timeout: 10_000,
		})
	})

	test('planning workbench renders', async ({ page }) => {
		await page.goto('/replenishment/planning-workbench')
		await expect(
			page.getByRole('heading', { name: /planning|workbench/i }),
		).toBeVisible({ timeout: 10_000 })
	})

	test('purchase orders list renders with data', async ({ page }) => {
		await page.goto('/replenishment/purchase-orders')
		await expect(
			page.getByRole('heading', { name: /purchase order/i }),
		).toBeVisible({ timeout: 10_000 })
		const grid = new DataGridFixture(page)
		await grid.waitForRows()
	})
})
