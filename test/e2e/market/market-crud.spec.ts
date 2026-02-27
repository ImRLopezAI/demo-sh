import { expect, test } from '@playwright/test'
import { DataGridFixture } from '../fixtures/data-grid.fixture'

test.describe('market module CRUD @functional', () => {
	test('customers list renders with data', async ({ page }) => {
		await page.goto('/market/customers')
		await expect(page.getByRole('heading', { name: /customer/i })).toBeVisible({
			timeout: 10_000,
		})
		const grid = new DataGridFixture(page)
		await grid.waitForRows()
		const count = await grid.getRowCount()
		expect(count).toBeGreaterThan(0)
	})

	test('items list renders with data', async ({ page }) => {
		await page.goto('/market/items')
		await expect(page.getByRole('heading', { name: /item/i })).toBeVisible({
			timeout: 10_000,
		})
		const grid = new DataGridFixture(page)
		await grid.waitForRows()
		const count = await grid.getRowCount()
		expect(count).toBeGreaterThan(0)
	})

	test('carts list renders', async ({ page }) => {
		await page.goto('/market/carts')
		await expect(page.getByRole('heading', { name: /cart/i })).toBeVisible({
			timeout: 10_000,
		})
	})

	test('pricing & returns page renders', async ({ page }) => {
		await page.goto('/market/pricing-returns')
		await expect(
			page.getByRole('heading', { name: /pricing|return/i }),
		).toBeVisible({ timeout: 10_000 })
	})

	test('market dashboard renders with KPIs', async ({ page }) => {
		await page.goto('/market/dashboard')
		await expect(page.locator('[data-slot="view-component"]')).toBeVisible({
			timeout: 15_000,
		})
	})
})
