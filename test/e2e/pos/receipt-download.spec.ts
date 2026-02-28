import { expect, test } from '@playwright/test'
import { DataGridFixture } from '../fixtures/data-grid.fixture'

test.describe('POS receipt download @functional', () => {
	test('reprint action calls receipt endpoint and shows user feedback', async ({
		page,
	}) => {
		await page.goto('/pos/transactions')
		await expect(
			page.getByRole('heading', { name: /transaction/i }),
		).toBeVisible({ timeout: 10_000 })

		const grid = new DataGridFixture(page)
		await grid.waitForRows({ timeout: 15_000 })
		const completedRow = page
			.locator('[data-slot="grid-body"] [role="row"]')
			.filter({ hasText: 'COMPLETED' })
			.first()
		await expect(completedRow).toBeVisible({ timeout: 15_000 })
		await completedRow.getByRole('checkbox').click({ force: true })

		const reprintButton = page.getByRole('button', { name: /^Reprint$/i })
		await expect(reprintButton).toBeVisible()
		await expect(reprintButton).toBeEnabled()

		const receiptResponsePromise = page.waitForResponse(
			(response) =>
				response.url().includes('/api/rpc/pos/transactions/generateReceipt') &&
				response.request().method() === 'POST',
			{ timeout: 20_000 },
		)
		await reprintButton.click()
		const receiptResponse = await receiptResponsePromise
		if (receiptResponse.ok()) {
			await expect(page.getByText(/receipt.*downloaded/i)).toBeVisible({
				timeout: 10_000,
			})
			return
		}

		await expect(page.getByText(/receipt download failed/i)).toBeVisible({
			timeout: 10_000,
		})
	})
})
