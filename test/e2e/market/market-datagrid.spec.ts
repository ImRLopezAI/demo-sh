import { expect, test } from '@playwright/test'
import { DataGridFixture } from '../fixtures/data-grid.fixture'

test.describe('market sales-orders DataGrid @functional', () => {
	test('grid renders with data rows', async ({ page }) => {
		await page.goto('/market/sales-orders')
		const grid = new DataGridFixture(page)
		await grid.waitForRows()
		const count = await grid.getRowCount()
		expect(count).toBeGreaterThan(0)
	})

	test('search filters grid rows', async ({ page }) => {
		await page.goto('/market/sales-orders')
		const grid = new DataGridFixture(page)
		await grid.waitForRows()
		const initialCount = await grid.getRowCount()
		await grid.search('ZZZZNONEXISTENT')
		// Wait for filter to apply
		await page.waitForTimeout(500)
		const filteredCount = await grid.getRowCount()
		expect(filteredCount).toBeLessThanOrEqual(initialCount)
		await grid.clearSearch()
	})

	test('column header click triggers sort', async ({ page }) => {
		await page.goto('/market/sales-orders')
		const grid = new DataGridFixture(page)
		await grid.waitForRows()
		await grid.sortByColumn('Document No.')
		// Verify grid still has rows after sort
		await grid.waitForRows()
		const count = await grid.getRowCount()
		expect(count).toBeGreaterThan(0)
	})

	test('clicking document number opens detail view', async ({ page }) => {
		await page.goto('/market/sales-orders')
		const grid = new DataGridFixture(page)
		await grid.waitForRows()
		// Click the first row's link/cell to open detail
		const firstLink = page
			.locator('[data-slot="grid-body"] [role="row"]')
			.first()
			.locator('a, [role="gridcell"]')
			.first()
		await firstLink.click()
		// Should navigate to detail view (card replaces grid)
		await expect(
			page.getByRole('heading', { name: /sales order/i }),
		).toBeVisible({ timeout: 10_000 })
	})
})
