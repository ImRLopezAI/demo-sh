import { createFileRoute } from '@tanstack/react-router'
import { handler } from '@/server'

export const Route = createFileRoute('/api/$')({
	server: {
		handlers: {
			ANY: ({ request }) => handler(request),
		},
	},
})
