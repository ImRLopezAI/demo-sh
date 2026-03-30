/**
 * Uplink NextAppSpec
 *
 * Composes all module route specs and layouts into a single
 * json-render NextAppSpec that drives the entire application.
 */
import type { NextAppSpec } from '@json-render/next'
import { flowRoutes } from './flow'
import { hubRoutes } from './hub'
import { insightRoutes } from './insight'
import { landingRoutes } from './landing'
import { layouts } from './layouts'
import { ledgerRoutes } from './ledger'
import { marketRoutes } from './market'
import { payrollRoutes } from './payroll'
import { posRoutes } from './pos'
import { replenishmentRoutes } from './replenishment'
import { traceRoutes } from './trace'

export const spec: NextAppSpec = {
	metadata: {
		title: {
			default: 'Uplink',
			template: '%s — Uplink',
		},
		description:
			'Uplink operations suite — nine integrated modules for unified business management.',
	},

	layouts,

	routes: {
		...landingRoutes,
		...hubRoutes,
		...marketRoutes,
		...posRoutes,
		...replenishmentRoutes,
		...insightRoutes,
		...ledgerRoutes,
		...flowRoutes,
		...payrollRoutes,
		...traceRoutes,
	},

	state: {
		/** Active module for sidebar highlighting */
		activeModule: null as string | null,
		/** Global UI concerns */
		ui: {
			sidebarCollapsed: false,
			commandPaletteOpen: false,
			toasts: [] as Array<{
				id: string
				title: string
				variant: 'default' | 'success' | 'warning' | 'error'
			}>,
		},
		/** Per-module filter state (reserved for future use) */
		filters: {} as Record<string, Record<string, string>>,
		/** Cross-module search */
		search: {
			query: '',
			scope: 'all' as string,
		},
	},
}
