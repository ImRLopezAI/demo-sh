/**
 * Layout definitions for the Uplink app.
 *
 * `landing` — full-bleed landing page (no shell chrome)
 * `app`     — standard app shell with header, sidebar, and content slot
 */
import type { NextAppSpec } from '@json-render/next'

type Layouts = NonNullable<NextAppSpec['layouts']>

export const layouts: Layouts = {
	landing: {
		root: 'page',
		elements: {
			page: {
				type: 'Stack',
				props: { direction: 'vertical', gap: '0' },
				children: ['slot'],
			},
			slot: { type: 'Slot', props: {}, children: [] },
		},
	},
	app: {
		root: 'shell',
		elements: {
			shell: {
				type: 'ShellLayout',
				props: {},
				children: ['slot'],
			},
			slot: { type: 'Slot', props: {}, children: [] },
		},
	},
}
