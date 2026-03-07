import { describe, expect, test } from 'vitest'
import { GET } from '@/app/api/rpc/[[...path]]/route'

describe('rpc route health', () => {
	test('responds to health ping requests', async () => {
		const response = await GET(
			new Request('http://localhost:3000/api/rpc/health/ping', {
				method: 'GET',
			}),
		)

		expect(response.status).toBe(200)
		expect(response.headers.get('x-health-check')).toBe('pong')
		expect(await response.text()).toContain('"pong"')
	})
})
