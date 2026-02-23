import { Providers } from '@components/layout/providers'
import type { getContext } from '@lib/rpc/context'
import {
	createRootRouteWithContext,
	HeadContent,
	Scripts,
} from '@tanstack/react-router'
import * as React from 'react'
import appCss from './styles.css?url'

const ENABLE_DEVTOOLS =
	import.meta.env.DEV &&
	typeof window !== 'undefined' &&
	(window.location.search.includes('devtools') ||
		localStorage.getItem('devtools') === 'true')

const DevTools = ENABLE_DEVTOOLS
	? React.lazy(() =>
			import('@tanstack/react-devtools').then((mod) => ({
				default: mod.TanStackDevtools,
			})),
		)
	: () => null

const DevToolsRouterPanel = ENABLE_DEVTOOLS
	? React.lazy(() =>
			import('@tanstack/react-router-devtools').then((mod) => ({
				default: mod.TanStackRouterDevtoolsPanel,
			})),
		)
	: () => null

type RouterContext = ReturnType<typeof getContext>

export const Route = createRootRouteWithContext<RouterContext>()({
	head: () => ({
		meta: [
			{
				charSet: 'utf-8',
			},
			{
				name: 'viewport',
				content: 'width=device-width, initial-scale=1, viewport-fit=cover',
			},
			{
				name: 'color-scheme',
				content: 'light dark',
			},
			{
				name: 'theme-color',
				content: '#f8f8fa',
				media: '(prefers-color-scheme: light)',
			},
			{
				name: 'theme-color',
				content: '#1a1a22',
				media: '(prefers-color-scheme: dark)',
			},
			{
				title: 'Agentic - AI-Powered',
			},
		],
		links: [
			{
				rel: 'stylesheet',
				href: appCss,
			},
		],
	}),

	shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
	return (
		<html lang='en' suppressHydrationWarning>
			<head>
				<HeadContent />
			</head>
			<body>
				<a
					href='#main-content'
					className='sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:font-medium focus:text-sm focus:shadow-lg focus:ring-2 focus:ring-ring'
				>
					Skip to main content
				</a>
				<Providers>{children}</Providers>
				<React.Suspense>
					<DevTools
						config={{
							position: 'middle-right',
						}}
						plugins={[
							{
								name: 'Tanstack Router',
								render: <DevToolsRouterPanel />,
							},
						]}
					/>
				</React.Suspense>
				<Scripts />
			</body>
		</html>
	)
}
