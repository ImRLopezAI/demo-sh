import { describe, expect, test } from 'vitest'
import { navGroups } from '@/app/_shell/nav-config'

const collectHrefs = (): string[] => {
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

describe('pos nav routes (e2e)', () => {
	test('contains pos route entries', () => {
		const hrefs = collectHrefs()
		const moduleRoutes = hrefs.filter((href) => href.startsWith('/pos/'))
		expect(moduleRoutes.length).toBeGreaterThan(0)
		expect(moduleRoutes).toContain('/pos/dashboard')
		expect(moduleRoutes).toContain('/pos/terminal')
	})
})
