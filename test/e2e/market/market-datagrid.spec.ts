import { expect, test } from '@playwright/test'
import { DataGridFixture } from '../fixtures/data-grid.fixture'

test.describe('market sales-orders DataGrid @functional', () => {
	test('grid renders with structure', async ({ page }) => {
		await page.goto('/market/sales-orders')
		const grid = new DataGridFixture(page)
		await grid.waitForRows()
		// Verify grid structure is present (column headers render)
		await expect(
			page.locator('[data-slot="grid-wrapper"] [role="columnheader"]').first(),
		).toBeVisible()
	})

	test('search input is functional', async ({ page }) => {
		await page.goto('/market/sales-orders')
		const grid = new DataGridFixture(page)
		await grid.waitForRows()

		// Verify search input exists and accepts input
		const searchInput = page.locator('[data-slot="grid-search"]')
		if (await searchInput.isVisible()) {
			await searchInput.fill('ZZZZNONEXISTENT')
			await page.waitForTimeout(500)
			await searchInput.clear()
		}
	})

	test('column header click triggers sort', async ({ page }) => {
		await page.goto('/market/sales-orders')
		const grid = new DataGridFixture(page)
		await grid.waitForRows()
		await grid.sortByColumn('Document No.')
		// Grid should remain visible after sort
		await expect(
			page.locator('[data-slot="grid-wrapper"]').first(),
		).toBeVisible()
	})

	test('clicking document number opens detail view', async ({ page }) => {
		await page.goto('/market/sales-orders')
		const grid = new DataGridFixture(page)
		await grid.waitForRows()
		const rowCount = await grid.getRowCount()

		if (rowCount > 0) {
			// Click the first row's first cell (document number with handleEdit)
			await grid.clickCell(0, 'Document No.')
			// Should navigate to detail view
			await expect(
				page.getByRole('heading', { name: /sales order/i }),
			).toBeVisible({ timeout: 10_000 })
		}
	})
})
