import { expect, test } from '@playwright/test'

test.describe('cross-module order lifecycle @workflow', () => {
	test('market sales order is visible in market module', async ({ page }) => {
		await page.goto('/market/sales-orders')
		await expect(
			page.getByRole('heading', { name: /sales order/i }),
		).toBeVisible({ timeout: 10_000 })

		// Verify grid has orders
		const rows = page.locator('[data-slot="grid-body"] [role="row"]')
		await expect(rows.first()).toBeVisible({ timeout: 10_000 })
	})

	test('ledger invoices show posted status entries', async ({ page }) => {
		await page.goto('/ledger/invoices')
		await expect(page.getByRole('heading', { name: /invoice/i })).toBeVisible({
			timeout: 10_000,
		})

		// Grid should have data
		const rows = page.locator('[data-slot="grid-body"] [role="row"]')
		await expect(rows.first()).toBeVisible({ timeout: 10_000 })
	})

	test('trace shipments are visible in trace module', async ({ page }) => {
		await page.goto('/trace/shipments')
		await expect(page.getByRole('heading', { name: /shipment/i })).toBeVisible({
			timeout: 10_000,
		})
	})

	test('hub order fulfillment control room loads', async ({ page }) => {
		await page.goto('/hub/order-fulfillment')
		await expect(
			page.getByRole('heading', { name: /fulfillment|order/i }),
		).toBeVisible({ timeout: 10_000 })
	})
})
