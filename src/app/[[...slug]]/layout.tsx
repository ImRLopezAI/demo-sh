'use client'

/**
 * Catch-all layout — provides json-render context.
 *
 * Following the @json-render/next pattern:
 *   NextAppProvider wraps the route segment, providing registry + handlers.
 */
import { NextAppProvider } from '@json-render/next'
import type { PropsWithChildren } from 'react'
import { handlers } from '@/lib/json-render/handlers'
import { registry } from '@/lib/json-render/registry'

export default function SlugLayout({ children }: PropsWithChildren) {
	return (
		<NextAppProvider registry={registry} handlers={handlers}>
			{children}
		</NextAppProvider>
	)
}
