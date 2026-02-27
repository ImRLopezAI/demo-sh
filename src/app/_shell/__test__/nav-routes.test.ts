import { describe, expect, test } from 'vitest'
import { navGroups } from '@/app/_shell/nav-config'

function collectHrefs(): string[] {
	const result: string[] = []
	for (const group of navGroups) {
		if (!('items' in group) || !Array.isArray(group.items)) continue
		for (const rawItem of group.items) {
			const item = rawItem as {
				href?: string
				items?: Array<{ href?: string }>
			}
			if (typeof item.href === 'string') {
				result.push(item.href)
			}
			if (Array.isArray(item.items)) {
				for (const sub of item.items) {
					if (typeof sub.href === 'string') {
						result.push(sub.href)
					}
				}
			}
		}
	}
	return result
}

const MODULE_EXPECTED_ROUTES: Record<string, string[]> = {
	hub: ['/hub/dashboard', '/hub/notifications', '/hub/order-fulfillment'],
	market: [
		'/market/dashboard',
		'/market/sales-orders',
		'/market/pricing-returns',
	],
	pos: ['/pos/dashboard', '/pos/terminal', '/pos/shift-controls'],
	replenishment: [
		'/replenishment/dashboard',
		'/replenishment/purchase-orders',
		'/replenishment/planning-workbench',
	],
	trace: ['/trace/dashboard', '/trace/shipments', '/trace/carrier-ops'],
	insight: [
		'/insight/dashboard',
		'/insight/item-ledger',
		'/insight/forecast-workbench',
	],
	ledger: [
		'/ledger/dashboard',
		'/ledger/invoices',
		'/ledger/collections-compliance',
	],
	flow: [
		'/flow/dashboard',
		'/flow/payment-journal',
		'/flow/reconciliation-approvals',
	],
	payroll: [
		'/payroll/dashboard',
		'/payroll/payroll-journal',
		'/payroll/adjustments-offcycle',
	],
}

describe('nav-config route coverage', () => {
	const hrefs = collectHrefs()

	for (const [moduleId, expectedRoutes] of Object.entries(
		MODULE_EXPECTED_ROUTES,
	)) {
		describe(moduleId, () => {
			test(`contains ${moduleId} route entries`, () => {
				const moduleRoutes = hrefs.filter((href) =>
					href.startsWith(`/${moduleId}/`),
				)
				expect(moduleRoutes.length).toBeGreaterThan(0)
			})

			for (const route of expectedRoutes) {
				test(`includes ${route}`, () => {
					expect(hrefs).toContain(route)
				})
			}
		})
	}
})
