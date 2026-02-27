import { expect, test } from '@playwright/test'

test.describe('ledger module views @functional', () => {
	test('ledger dashboard renders', async ({ page }) => {
		await page.goto('/ledger/dashboard')
		await expect(page.locator('[data-slot="view-component"]')).toBeVisible({
			timeout: 15_000,
		})
	})

	test('customer ledger list renders', async ({ page }) => {
		await page.goto('/ledger/customer-ledger')
		await expect(
			page.getByRole('heading', { name: /customer ledger/i }),
		).toBeVisible({ timeout: 10_000 })
	})

	test('GL entries list renders', async ({ page }) => {
		await page.goto('/ledger/gl-entries')
		await expect(
			page.getByRole('heading', { name: /g\/l|general ledger/i }),
		).toBeVisible({ timeout: 10_000 })
	})

	test('collections & compliance page renders', async ({ page }) => {
		await page.goto('/ledger/collections-compliance')
		await expect(
			page.getByRole('heading', { name: /collection|compliance/i }).first(),
		).toBeVisible({ timeout: 10_000 })
	})
})
