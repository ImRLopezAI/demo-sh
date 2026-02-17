import { ErrorComponent } from '@components/layout/errors/error'
import { NotFoundComponent } from '@components/layout/errors/not-found'
import { getContext } from '@lib/rpc/context'
import { createRouter } from '@tanstack/react-router'
import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query'

// Import the generated route tree
import { routeTree } from './routeTree.gen'

// Create a new router instance
export const getRouter = () => {
	const context = getContext()
	const router = createRouter({
		routeTree,
		scrollRestoration: true,
		context,
		defaultPreloadStaleTime: 0,
		defaultNotFoundComponent: () => <NotFoundComponent />,
		defaultErrorComponent: ({ error }) => <ErrorComponent error={error} />,
	})
	setupRouterSsrQueryIntegration({ router, queryClient: context.queryClient })
	return router
}
