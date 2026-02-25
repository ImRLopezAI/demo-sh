import { ErrorComponent } from '@components/layout/errors/error'
import { NotFoundComponent } from '@components/layout/errors/not-found'
import { parseRouterSearch, stringifyRouterSearch } from '@lib/router/search'
import { getContext } from '@lib/rpc/context'
import { QueryClientProvider } from '@tanstack/react-query'
import { createRouter } from '@tanstack/react-router'
import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query'

// Import the generated route tree
import { routeTree } from './routeTree.gen'

// Create a new router instance
export const getRouter = () => {
	const context = getContext()
	const router = createRouter({
		routeTree,
		context,
		parseSearch: parseRouterSearch,
		stringifySearch: stringifyRouterSearch,
		scrollRestoration: true,
		defaultPreloadStaleTime: 0,
		defaultPreload: false,
		defaultNotFoundComponent: () => <NotFoundComponent />,
		defaultErrorComponent: ({ error }) => <ErrorComponent error={error} />,
		Wrap(props) {
			return (
				<QueryClientProvider client={context.queryClient}>
					{props.children}
				</QueryClientProvider>
			)
		},
	})
	setupRouterSsrQueryIntegration({ router, queryClient: context.queryClient })
	return router
}
