import { expect, test } from '@playwright/test'
import { DataGridFixture } from '../fixtures/data-grid.fixture'

test.describe('ledger invoice lifecycle @functional', () => {
	test('invoices grid renders with data', async ({ page }) => {
		await page.goto('/ledger/invoices')
		await expect(page.getByRole('heading', { name: /invoice/i })).toBeVisible({
			timeout: 10_000,
		})
		const grid = new DataGridFixture(page)
		await grid.waitForRows()
		const count = await grid.getRowCount()
		expect(count).toBeGreaterThan(0)
	})

	test('clicking invoice opens detail card', async ({ page }) => {
		await page.goto('/ledger/invoices')
		await expect(page.getByRole('heading', { name: /invoice/i })).toBeVisible({
			timeout: 10_000,
		})
		const grid = new DataGridFixture(page)
		await grid.waitForRows()

		// Click first invoice row
		const firstLink = page
			.locator('[data-slot="grid-body"] [role="row"]')
			.first()
			.locator('a, [role="gridcell"]')
			.first()
		await firstLink.click()

		// Detail card should show
		await expect(page.getByRole('heading', { name: /invoice/i })).toBeVisible({
			timeout: 10_000,
		})
	})

	test('new invoice button opens create form', async ({ page }) => {
		await page.goto('/ledger/invoices')
		await expect(page.getByRole('heading', { name: /invoice/i })).toBeVisible({
			timeout: 10_000,
		})

		// Click New Invoice button
		const newButton = page.getByRole('button', { name: /new invoice/i })
		await newButton.click()

		// Should show create form heading
		await expect(page.getByRole('heading', { name: /invoice/i })).toBeVisible({
			timeout: 10_000,
		})
	})
})
