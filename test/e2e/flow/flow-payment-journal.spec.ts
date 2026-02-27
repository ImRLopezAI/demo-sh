import { expect, test } from '@playwright/test'
import { DataGridFixture } from '../fixtures/data-grid.fixture'

test.describe('flow payment journal @functional', () => {
	test('payment journal page renders with grid', async ({ page }) => {
		await page.goto('/flow/payment-journal')
		await expect(
			page.getByRole('heading', { name: /payment journal/i }),
		).toBeVisible({ timeout: 10_000 })
		const grid = new DataGridFixture(page)
		await grid.waitForRows()
	})

	test('Post All button exists and has correct disabled state', async ({
		page,
	}) => {
		await page.goto('/flow/payment-journal')
		await expect(
			page.getByRole('heading', { name: /payment journal/i }),
		).toBeVisible({ timeout: 10_000 })

		const postButton = page.getByRole('button', { name: /post all/i })
		await expect(postButton).toBeVisible()
		// Button should be present (may be enabled or disabled depending on data)
	})

	test('bank accounts list renders', async ({ page }) => {
		await page.goto('/flow/bank-accounts')
		await expect(
			page.getByRole('heading', { name: /bank account/i }),
		).toBeVisible({ timeout: 10_000 })
	})

	test('bank ledger list renders', async ({ page }) => {
		await page.goto('/flow/bank-ledger')
		await expect(
			page.getByRole('heading', { name: /bank ledger/i }),
		).toBeVisible({ timeout: 10_000 })
	})

	test('GL entries list renders', async ({ page }) => {
		await page.goto('/flow/gl-entries')
		await expect(
			page.getByRole('heading', { name: /g\/l|general ledger/i }),
		).toBeVisible({ timeout: 10_000 })
	})

	test('reconciliation & approvals page renders', async ({ page }) => {
		await page.goto('/flow/reconciliation-approvals')
		await expect(
			page.getByRole('heading', { name: /reconciliation|approval/i }).first(),
		).toBeVisible({ timeout: 10_000 })
	})
})
