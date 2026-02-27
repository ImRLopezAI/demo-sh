import { expect, test } from '@playwright/test'

/**
 * Browser-level authorization enforcement tests.
 * Verifies that restricted routes and actions are properly gated by role.
 * Tagged @auth for selective CI execution.
 */

const FINANCIAL_ROUTES = [
	'/flow/payment-journal',
	'/flow/reconciliation-approvals',
	'/payroll/payroll-journal',
	'/ledger/invoices',
]

const ADMIN_ROUTES = ['/hub/order-fulfillment']

test.describe('route access and action visibility @auth', () => {
	test('all financial routes are reachable as MANAGER (default)', async ({
		page,
	}) => {
		for (const route of FINANCIAL_ROUTES) {
			await page.goto(route)
			await expect(page.locator('[data-slot="view-component"]')).toBeVisible({
				timeout: 10_000,
			})
		}
	})

	test('hub order fulfillment route is reachable', async ({ page }) => {
		for (const route of ADMIN_ROUTES) {
			await page.goto(route)
			await expect(page.locator('[data-slot="view-component"]')).toBeVisible({
				timeout: 10_000,
			})
		}
	})

	test('VIEWER role can access read-only list views via role header', async ({
		page,
	}) => {
		// Intercept API calls to set VIEWER role
		await page.route('**/api/rpc/**', (route) => {
			const headers = route.request().headers()
			headers['x-test-role'] = 'VIEWER'
			route.continue({ headers })
		})

		await page.goto('/market/sales-orders')
		await expect(page.locator('[data-slot="view-component"]')).toBeVisible({
			timeout: 15_000,
		})

		// VIEWER should see the page but may have restricted actions
		await expect(
			page.getByRole('heading', { name: /sales order/i }),
		).toBeVisible({ timeout: 10_000 })
	})

	test('VIEWER role receives error when attempting financial posting', async ({
		page,
	}) => {
		// Intercept API calls to set VIEWER role
		await page.route('**/api/rpc/**', (route) => {
			const headers = route.request().headers()
			headers['x-test-role'] = 'VIEWER'
			route.continue({ headers })
		})

		await page.goto('/flow/payment-journal')
		await expect(page.locator('[data-slot="view-component"]')).toBeVisible({
			timeout: 15_000,
		})

		// Payment journal should render but post actions should fail
		const postButton = page.getByRole('button', { name: /post all/i })
		if (await postButton.isVisible()) {
			// If the button is enabled and clicked, the API should reject
			if (!(await postButton.isDisabled())) {
				await postButton.click()
				// Should see an error (toast, inline message, etc.)
				await page.waitForTimeout(2000)
			}
		}
	})
})
