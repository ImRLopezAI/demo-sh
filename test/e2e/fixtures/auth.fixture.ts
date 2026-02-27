import { test as base, type Page } from '@playwright/test'

export type AuthRole = 'VIEWER' | 'AGENT' | 'MANAGER' | 'ADMIN'

/**
 * Extends Playwright's base test with role-based authentication.
 *
 * The dev server reads the role from the `X-Test-Role` header via
 * `resolveServerBootstrapAuthIdentity`. In dev mode, the server defaults
 * to MANAGER. To test other roles, use `test.use({ role: 'VIEWER' })`.
 */
export const test = base.extend<{ role: AuthRole; authedPage: Page }>({
	role: ['MANAGER', { option: true }],
	authedPage: async ({ page, role }, use) => {
		if (role !== 'MANAGER') {
			await page.route('**/api/rpc/**', (route) => {
				const headers = route.request().headers()
				headers['x-test-role'] = role
				route.continue({ headers })
			})
		}
		await use(page)
	},
})

export { expect } from '@playwright/test'
