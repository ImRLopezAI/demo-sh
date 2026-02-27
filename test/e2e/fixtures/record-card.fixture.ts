import { type Locator, type Page, expect } from '@playwright/test'

/**
 * Page Object Model for record detail/create card components.
 * Works with the useRecordSearchState pattern used across all modules.
 */
export class RecordCardFixture {
	constructor(private page: Page) {}

	/** Click the "New" button (by test ID or text) to open create mode. */
	async clickNew(testId: string) {
		const button = this.page.getByTestId(testId)
		await button.click()
	}

	/** Open a record by navigating directly via URL search params. */
	async openRecord(basePath: string, recordId: string) {
		await this.page.goto(
			`${basePath}?mode=detail&recordId=${recordId}&_recordScope=${basePath}`,
		)
		await this.page.waitForSelector('[data-slot="view-component"]', {
			timeout: 10_000,
		})
	}

	/** Open create mode via URL search params. */
	async openCreate(basePath: string) {
		await this.page.goto(
			`${basePath}?mode=new&_recordScope=${basePath}`,
		)
		await this.page.waitForSelector('[data-slot="view-component"]', {
			timeout: 10_000,
		})
	}

	/** Select an option from a combobox/select trigger. */
	async selectFirstOption(triggerTestId: string) {
		const trigger = this.page.getByTestId(triggerTestId)
		await trigger.click()
		const firstOption = this.page.getByRole('option').first()
		await expect(firstOption).toBeVisible()
		await firstOption.click()
	}

	/** Click the save button by test ID. */
	async save(testId: string) {
		await this.page.getByTestId(testId).click()
	}

	/** Click cancel/close to return to the list. */
	async close() {
		const cancelButton = this.page.getByRole('button', { name: 'Cancel' })
		if (await cancelButton.isVisible()) {
			await cancelButton.click()
			return
		}
		const closeButton = this.page.getByRole('button', { name: 'Close' })
		if (await closeButton.isVisible()) {
			await closeButton.click()
		}
	}

	/** Verify a heading is visible on the card. */
	async expectHeading(name: string | RegExp) {
		await expect(
			this.page.getByRole('heading', { name }),
		).toBeVisible({ timeout: 10_000 })
	}

	/** Change the status via a select/dropdown on the card. */
	async changeStatus(newStatus: string) {
		const statusSelect = this.page.locator(
			'[data-testid*="status-select"], select[name="status"]',
		)
		if (await statusSelect.isVisible()) {
			await statusSelect.selectOption(newStatus)
		}
	}

	/** Get the transition-reason dialog locator. */
	getTransitionDialog(): Locator {
		return this.page.locator('[role="dialog"]').filter({
			hasText: 'Transition to',
		})
	}

	/** Fill reason in the transition dialog and confirm. */
	async confirmTransitionWithReason(reason: string) {
		const dialog = this.getTransitionDialog()
		await expect(dialog).toBeVisible()
		await dialog.locator('textarea').fill(reason)
		await dialog.getByRole('button', { name: 'Apply Transition' }).click()
	}

	/** Attempt to confirm a transition without reason (for validation testing). */
	async confirmTransitionEmpty() {
		const dialog = this.getTransitionDialog()
		await expect(dialog).toBeVisible()
		await dialog.getByRole('button', { name: 'Apply Transition' }).click()
	}
}
