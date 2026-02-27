import { expect, test } from '@playwright/test'

const MODULE_DASHBOARDS = [
	'/hub/dashboard',
	'/market/dashboard',
	'/pos/dashboard',
	'/replenishment/dashboard',
	'/trace/dashboard',
	'/insight/dashboard',
	'/ledger/dashboard',
	'/flow/dashboard',
	'/payroll/dashboard',
]

test.describe('navigation performance @performance', () => {
	test('all 9 dashboards load within 10 seconds each', async ({ page }) => {
		for (const dashboard of MODULE_DASHBOARDS) {
			const start = Date.now()
			await page.goto(dashboard)
			await expect(page.locator('[data-slot="view-component"]')).toBeVisible({
				timeout: 10_000,
			})
			const duration = Date.now() - start
			expect(duration, `${dashboard} took ${duration}ms to load`).toBeLessThan(
				10_000,
			)
		}
	})

	test('sequential module navigation has no console errors', async ({
		page,
	}) => {
		const errors: string[] = []
		page.on('console', (msg) => {
			if (msg.type() === 'error') {
				errors.push(`${msg.text()} (on ${page.url()})`)
			}
		})

		for (const dashboard of MODULE_DASHBOARDS) {
			await page.goto(dashboard)
			await expect(page.locator('[data-slot="view-component"]')).toBeVisible({
				timeout: 10_000,
			})
		}

		const realErrors = errors.filter(
			(msg) =>
				!msg.includes('HMR') &&
				!msg.includes('[vite]') &&
				!msg.includes('hydration'),
		)
		expect(
			realErrors,
			`Console errors during navigation: ${realErrors.join('\n')}`,
		).toHaveLength(0)
	})
})
