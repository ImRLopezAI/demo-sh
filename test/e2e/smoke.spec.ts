import { expect, test } from '@playwright/test'

/**
 * Smoke tests for all 47 routes. Each test navigates to a route and verifies
 * the page renders without crashing. Tagged @smoke for CI deployment gate.
 *
 * Run: npx playwright test --grep @smoke
 */

const ALL_ROUTES: Array<{ path: string; heading?: string | RegExp }> = [
	// Hub
	{ path: '/hub/dashboard', heading: /hub|dashboard/i },
	{ path: '/hub/tasks', heading: /task/i },
	{ path: '/hub/notifications', heading: /notification/i },
	{ path: '/hub/order-fulfillment', heading: /fulfillment|order/i },
	// Market
	{ path: '/market/dashboard', heading: /market|dashboard/i },
	{ path: '/market/sales-orders', heading: /sales order/i },
	{ path: '/market/items', heading: /item/i },
	{ path: '/market/customers', heading: /customer/i },
	{ path: '/market/carts', heading: /cart/i },
	{ path: '/market/pricing-returns', heading: /pricing|return/i },
	// POS
	{ path: '/pos/dashboard', heading: /pos|dashboard/i },
	{ path: '/pos/transactions', heading: /transaction/i },
	{ path: '/pos/terminals', heading: /terminal/i },
	{ path: '/pos/sessions', heading: /session/i },
	{ path: '/pos/terminal' },
	{ path: '/pos/shift-controls', heading: /shift/i },
	// Replenishment
	{ path: '/replenishment/dashboard', heading: /replenishment|dashboard/i },
	{
		path: '/replenishment/purchase-orders',
		heading: /purchase order/i,
	},
	{ path: '/replenishment/vendors', heading: /vendor/i },
	{ path: '/replenishment/transfers', heading: /transfer/i },
	{
		path: '/replenishment/planning-workbench',
		heading: /planning|workbench/i,
	},
	// Trace
	{ path: '/trace/dashboard', heading: /trace|dashboard/i },
	{ path: '/trace/shipments', heading: /shipment/i },
	{ path: '/trace/shipment-methods', heading: /shipment method/i },
	{ path: '/trace/carrier-ops', heading: /carrier/i },
	// Insight
	{ path: '/insight/dashboard', heading: /insight|dashboard/i },
	{ path: '/insight/item-ledger', heading: /item ledger/i },
	{ path: '/insight/locations', heading: /location/i },
	{ path: '/insight/value-entries', heading: /value entr/i },
	{
		path: '/insight/forecast-workbench',
		heading: /forecast|workbench/i,
	},
	// Ledger
	{ path: '/ledger/dashboard', heading: /ledger|dashboard/i },
	{ path: '/ledger/invoices', heading: /invoice/i },
	{ path: '/ledger/customer-ledger', heading: /customer ledger/i },
	{ path: '/ledger/gl-entries', heading: /g\/l|general ledger/i },
	{
		path: '/ledger/collections-compliance',
		heading: /collection|compliance/i,
	},
	// Flow
	{ path: '/flow/dashboard', heading: /flow|dashboard/i },
	{ path: '/flow/bank-accounts', heading: /bank account/i },
	{ path: '/flow/bank-ledger', heading: /bank ledger/i },
	{ path: '/flow/payment-journal', heading: /payment journal/i },
	{ path: '/flow/gl-entries', heading: /g\/l|general ledger/i },
	{
		path: '/flow/reconciliation-approvals',
		heading: /reconciliation|approval/i,
	},
	// Payroll
	{ path: '/payroll/dashboard', heading: /payroll|dashboard/i },
	{ path: '/payroll/employees', heading: /employee/i },
	{ path: '/payroll/employee-ledger', heading: /employee ledger/i },
	{ path: '/payroll/payroll-journal', heading: /payroll journal/i },
	{ path: '/payroll/gl-entries', heading: /g\/l|general ledger/i },
	{ path: '/payroll/bank-ledger', heading: /bank ledger/i },
	{
		path: '/payroll/adjustments-offcycle',
		heading: /adjustment|off.?cycle/i,
	},
]

for (const route of ALL_ROUTES) {
	test(`smoke: ${route.path} renders @smoke`, async ({ page }) => {
		const consoleErrors: string[] = []
		page.on('console', (msg) => {
			if (msg.type() === 'error') {
				consoleErrors.push(msg.text())
			}
		})

		await page.goto(route.path)

		// Wait for the view component to mount
		await expect(page.locator('[data-slot="view-component"]')).toBeVisible({
			timeout: 15_000,
		})

		// Verify primary content heading renders (skip for headless views like POS terminal)
		if (route.heading) {
			const heading = page.getByRole('heading', { name: route.heading })
			await expect(heading.first()).toBeVisible({ timeout: 10_000 })
		}

		// Filter out known noisy console errors (e.g., HMR, dev warnings, React internals)
		const realErrors = consoleErrors.filter(
			(msg) =>
				!msg.includes('HMR') &&
				!msg.includes('[vite]') &&
				!msg.includes('hydration') &&
				!msg.includes('getServerSnapshot') &&
				!msg.includes('unique "key" prop'),
		)
		expect(
			realErrors,
			`Console errors on ${route.path}: ${realErrors.join('\n')}`,
		).toHaveLength(0)
	})
}
