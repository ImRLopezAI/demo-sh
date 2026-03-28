/**
 * Landing page route spec.
 * Renders the full Uplink marketing landing page.
 */
import type { NextAppSpec } from '@json-render/next'

type Routes = NonNullable<NextAppSpec['routes']>

export const landingRoutes: Routes = {
	'/': {
		layout: 'landing',
		metadata: {
			title: 'Uplink — Unify Your Business Operations',
			description:
				'Nine integrated modules for e-commerce, inventory, payroll, logistics, and more. Deploy independently. Scale together.',
		},
		page: {
			root: 'landing',
			elements: {
				landing: {
					type: 'LandingPage',
					props: {},
					children: [],
				},
			},
		},
	},
}
