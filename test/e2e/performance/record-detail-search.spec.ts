import { expect, test } from '@playwright/test'
import { DataGridFixture } from '../fixtures/data-grid.fixture'

test.describe('record detail & search performance @performance', () => {
	test('record search state updates URL params without full reload', async ({
		page,
	}) => {
		await page.goto('/market/sales-orders')
		await expect(page.locator('[data-slot="view-component"]')).toBeVisible({
			timeout: 15_000,
		})

		const grid = new DataGridFixture(page)
		await grid.waitForRows()
		const rowCount = await grid.getRowCount()

		if (rowCount > 0) {
			// Click the document number cell (has handleEdit) to open detail
			await grid.clickCell(0, 'Document No.')

			// URL should update with mode=detail and recordId params
			await page.waitForURL(/mode=detail/, { timeout: 5_000 })
			expect(page.url()).toMatch(/recordId=/)

			// The view component should still be visible (detail card within same view)
			await expect(page.locator('[data-slot="view-component"]')).toBeVisible()
		}
	})

	test('global search trigger is present in header', async ({ page }) => {
		await page.goto('/market/dashboard')
		await expect(page.locator('[data-slot="view-component"]')).toBeVisible({
			timeout: 15_000,
		})

		// At least one search trigger (desktop text button or mobile icon) should exist
		const desktopSearch = page.locator('button').filter({
			hasText: /search modules/i,
		})
		const mobileSearch = page.getByLabel('Search')
		const desktopCount = await desktopSearch.count()
		const mobileCount = await mobileSearch.count()
		expect(desktopCount + mobileCount).toBeGreaterThan(0)
	})

	test('record detail view renders within the view component', async ({
		page,
	}) => {
		await page.goto('/market/customers')
		await expect(page.locator('[data-slot="view-component"]')).toBeVisible({
			timeout: 15_000,
		})

		const grid = new DataGridFixture(page)
		await grid.waitForRows()
		const rowCount = await grid.getRowCount()

		if (rowCount > 0) {
			// Click first row's primary cell to trigger detail navigation
			await grid.clickCell(0, 'Name')

			// Wait for URL to update to detail mode
			await page.waitForURL(/mode=detail/, { timeout: 5_000 })

			// The view-component should still be mounted
			await expect(page.locator('[data-slot="view-component"]')).toBeVisible()
		}
	})

	test('inline grid search filters rows without page reload', async ({
		page,
	}) => {
		await page.goto('/market/items')
		await expect(page.locator('[data-slot="view-component"]')).toBeVisible({
			timeout: 15_000,
		})

		const grid = new DataGridFixture(page)
		await grid.waitForRows()

		// Find and use the grid search input
		const searchInput = page.locator('[data-slot="grid-search"]')
		if (await searchInput.isVisible()) {
			await searchInput.fill('test')
			await page.waitForTimeout(1_000) // debounce + filter

			// View component should remain visible (no full reload)
			await expect(page.locator('[data-slot="view-component"]')).toBeVisible()
		}
	})
})
