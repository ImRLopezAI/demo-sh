import { expect, test } from '@playwright/test'

test.describe('record detail & search performance @performance', () => {
	test('record search state updates URL params without full reload', async ({
		page,
	}) => {
		await page.goto('/market/sales-orders')
		await expect(page.locator('[data-slot="view-component"]')).toBeVisible({
			timeout: 15_000,
		})

		// Wait for grid to have rows
		const gridBody = page.locator('[data-slot="grid-body"]')
		await expect(gridBody.locator('tr, [role="row"]').first()).toBeVisible({
			timeout: 10_000,
		})

		// Click first row to open record detail
		const firstRow = gridBody.locator('tr, [role="row"]').first()
		await firstRow.click()

		// URL should update with record ID without a full page navigation
		await page.waitForURL(/record=/, { timeout: 5_000 })
		expect(page.url()).toContain('record=')

		// The view component should still be visible (no full remount)
		await expect(page.locator('[data-slot="view-component"]')).toBeVisible()
	})

	test('global search (Cmd+K) opens and filters quickly', async ({ page }) => {
		await page.goto('/market/dashboard')
		await expect(page.locator('[data-slot="view-component"]')).toBeVisible({
			timeout: 15_000,
		})

		// Open global search with Cmd+K
		await page.keyboard.press('Meta+k')

		// Search dialog/popover should appear
		const searchInput = page.getByPlaceholder(/search/i)
		await expect(searchInput).toBeVisible({ timeout: 3_000 })

		// Type a search query and verify results appear
		await searchInput.fill('sales')
		await page.waitForTimeout(500) // debounce

		// Should show search results or navigation suggestions
		const resultsList = page.locator(
			'[data-slot="search-results"], [role="listbox"], [role="option"]',
		)
		await expect(resultsList.first()).toBeVisible({ timeout: 5_000 })
	})

	test('record card renders without blocking the main grid', async ({
		page,
	}) => {
		await page.goto('/market/customers')
		await expect(page.locator('[data-slot="view-component"]')).toBeVisible({
			timeout: 15_000,
		})

		const gridBody = page.locator('[data-slot="grid-body"]')
		await expect(gridBody.locator('tr, [role="row"]').first()).toBeVisible({
			timeout: 10_000,
		})

		// Click first row
		const firstRow = gridBody.locator('tr, [role="row"]').first()
		await firstRow.click()

		// Record card/detail should appear alongside the grid
		const recordCard = page.locator(
			'[data-slot="record-card"], [role="dialog"], aside',
		)
		await expect(recordCard.first()).toBeVisible({ timeout: 5_000 })

		// Grid should still be visible (not replaced)
		await expect(gridBody).toBeVisible()
	})

	test('inline grid search filters rows without page reload', async ({
		page,
	}) => {
		await page.goto('/market/items')
		await expect(page.locator('[data-slot="view-component"]')).toBeVisible({
			timeout: 15_000,
		})

		const gridBody = page.locator('[data-slot="grid-body"]')
		await expect(gridBody.locator('tr, [role="row"]').first()).toBeVisible({
			timeout: 10_000,
		})

		// Find and use the grid search input
		const searchInput = page
			.locator('[data-slot="data-grid"]')
			.getByPlaceholder(/search|filter/i)
		if (await searchInput.isVisible()) {
			const initialCount = await gridBody.locator('tr, [role="row"]').count()

			await searchInput.fill('test')
			await page.waitForTimeout(1_000) // debounce + filter

			// View component should remain visible (no full reload)
			await expect(page.locator('[data-slot="view-component"]')).toBeVisible()

			// Row count may change after filtering
			const filteredCount = await gridBody.locator('tr, [role="row"]').count()
			expect(filteredCount).toBeLessThanOrEqual(initialCount)
		}
	})
})
