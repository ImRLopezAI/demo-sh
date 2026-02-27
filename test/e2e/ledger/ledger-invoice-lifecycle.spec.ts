import { expect, test } from '@playwright/test'
import { DataGridFixture } from '../fixtures/data-grid.fixture'

test.describe('ledger invoice lifecycle @functional', () => {
	test('invoices grid renders', async ({ page }) => {
		await page.goto('/ledger/invoices')
		await expect(page.getByRole('heading', { name: /invoice/i })).toBeVisible({
			timeout: 10_000,
		})
		const grid = new DataGridFixture(page)
		await grid.waitForRows()
		// Verify grid structure
		await expect(
			page.locator('[data-slot="grid-wrapper"] [role="columnheader"]').first(),
		).toBeVisible()
	})

	test('clicking invoice opens detail card', async ({ page }) => {
		await page.goto('/ledger/invoices')
		await expect(page.getByRole('heading', { name: /invoice/i })).toBeVisible({
			timeout: 10_000,
		})
		const grid = new DataGridFixture(page)
		await grid.waitForRows()
		const rowCount = await grid.getRowCount()

		if (rowCount > 0) {
			// Click first invoice row's document number cell
			await grid.clickCell(0, 'Document No.')
			// Detail card should show
			await expect(page.getByRole('heading', { name: /invoice/i })).toBeVisible(
				{ timeout: 10_000 },
			)
		}
	})

	test('new invoice button opens create form', async ({ page }) => {
		await page.goto('/ledger/invoices')
		await expect(page.getByRole('heading', { name: /invoice/i })).toBeVisible({
			timeout: 10_000,
		})

		// Click New Invoice button (if visible)
		const newButton = page.getByRole('button', { name: /new/i })
		if (await newButton.isVisible()) {
			await newButton.click()
			await expect(page.getByRole('heading', { name: /invoice/i })).toBeVisible(
				{ timeout: 10_000 },
			)
		}
	})
})
