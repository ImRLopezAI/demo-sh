import { Providers } from '@components/layout/providers'
import type { getContext } from '@lib/rpc/context'
import {
	createRootRouteWithContext,
	HeadContent,
	Scripts,
} from '@tanstack/react-router'
import { lazy, Suspense } from 'react'
import appCss from './styles.css?url'

const TanStackDevtools = import.meta.env.DEV
	? lazy(() =>
			import('@tanstack/react-devtools').then((m) => ({
				default: m.TanStackDevtools,
			})),
		)
	: () => null

const TanStackRouterDevtoolsPanel = import.meta.env.DEV
	? lazy(() =>
			import('@tanstack/react-router-devtools').then((m) => ({
				default: m.TanStackRouterDevtoolsPanel,
			})),
		)
	: () => null

interface RouterContext extends ReturnType<typeof getContext> {}

export const Route = createRootRouteWithContext<RouterContext>()({
	head: () => ({
		meta: [
			{
				charSet: 'utf-8',
			},
			{
				name: 'viewport',
				content: 'width=device-width, initial-scale=1',
			},
			{
				title: 'Productivity AI-gent',
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
	const ctx = Route.useRouteContext()
	return (
		<html lang='en' suppressHydrationWarning>
			<head>
				<HeadContent />
			</head>
			<body>
				<Providers
					cvx={ctx.cvx}
					queryClient={ctx.queryClient}
					cvxQueryClient={ctx.cvxQueryClient}
				>
					{children}
				</Providers>
				{import.meta.env.DEV && (
					<Suspense>
						<TanStackDevtools
							config={{
								position: 'middle-right',
							}}
							plugins={[
								{
									name: 'Tanstack Router',
									render: (
										<Suspense>
											<TanStackRouterDevtoolsPanel />
										</Suspense>
									),
								},
							]}
						/>
					</Suspense>
				)}
				<Scripts />
			</body>
		</html>
	)
}
