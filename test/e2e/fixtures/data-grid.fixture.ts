import { expect, type Locator, type Page } from '@playwright/test'

/**
 * Page Object Model for the DataGrid component.
 * Provides helpers for filter, sort, search, export, pagination, and row selection.
 */
export class DataGridFixture {
	private grid: Locator

	constructor(
		private page: Page,
		gridSelector = '[data-slot="grid-wrapper"]',
	) {
		this.grid = page.locator(gridSelector).first()
	}

	/** Wait for the grid to be visible and have at least one row. */
	async waitForRows(options?: { timeout?: number }) {
		const timeout = options?.timeout ?? 10_000
		await expect(this.grid).toBeVisible({ timeout })
		await expect(this.grid.locator('[role="row"]').first()).toBeVisible({
			timeout,
		})
	}

	/** Get the count of visible data rows (excluding header). */
	async getRowCount(): Promise<number> {
		const body = this.grid.locator('[data-slot="grid-body"]')
		return body.locator('[role="row"]').count()
	}

	/** Type into the grid search input. */
	async search(query: string) {
		const searchInput = this.grid.locator(
			'input[placeholder*="Search"], input[data-slot="grid-search"]',
		)
		await searchInput.fill(query)
	}

	/** Clear the grid search input. */
	async clearSearch() {
		const searchInput = this.grid.locator(
			'input[placeholder*="Search"], input[data-slot="grid-search"]',
		)
		await searchInput.clear()
	}

	/** Click a column header to trigger sort. */
	async sortByColumn(columnTitle: string) {
		const header = this.grid.locator('[role="columnheader"]', {
			hasText: columnTitle,
		})
		await header.click()
	}

	/** Select a row by clicking its checkbox. */
	async selectRow(index: number) {
		const checkbox = this.grid
			.locator('[data-slot="grid-body"] [role="row"]')
			.nth(index)
			.getByRole('checkbox')
		await checkbox.click({ force: true })
	}

	/** Click on a row cell to trigger the edit/detail handler. */
	async clickCell(rowIndex: number, columnTitle: string) {
		const rows = this.grid.locator('[data-slot="grid-body"] [role="row"]')
		const headers = this.grid.locator('[role="columnheader"]')
		const headerCount = await headers.count()

		let colIndex = -1
		for (let i = 0; i < headerCount; i++) {
			const text = await headers.nth(i).textContent()
			if (text?.includes(columnTitle)) {
				colIndex = i
				break
			}
		}

		if (colIndex >= 0) {
			const cells = rows.nth(rowIndex).locator('[role="gridcell"]')
			await cells.nth(colIndex).click()
		}
	}

	/** Trigger CSV export from the toolbar. */
	async exportCSV() {
		const exportButton = this.grid.locator(
			'button:has-text("Export"), [data-slot="grid-export"]',
		)
		await exportButton.click()
		const csvOption = this.page.getByRole('menuitem', { name: /CSV/i })
		if (await csvOption.isVisible()) {
			await csvOption.click()
		}
	}

	/** Scroll to the bottom to trigger infinite scroll. */
	async scrollToBottom() {
		const body = this.grid.locator('[data-slot="grid-body"]')
		await body.evaluate((el) => {
			el.scrollTo(0, el.scrollHeight)
		})
	}

	/** Check if the "Add Row" button is visible. */
	async hasAddRowButton(): Promise<boolean> {
		return this.grid.locator('[data-slot="grid-add-row"]').isVisible()
	}
}
