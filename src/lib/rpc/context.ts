import { api } from '@convex/api'
import { ConvexQueryClient } from '@convex-dev/react-query'
import { createTanstackQueryUtils } from '@orpc/tanstack-query'
import { QueryClient } from '@tanstack/react-query'
import { cache } from 'react'
import { caller, queryClient } from './rpc'

export const getContext = cache(() => {
	const CONVEX_URL = import.meta.env.VITE_CONVEX_URL
	if (!CONVEX_URL) {
		throw new Error('VITE_CONVEX_URL is not defined')
	}
	const convexQueryClient = new ConvexQueryClient(CONVEX_URL)

	const cvxQueryClient: QueryClient = new QueryClient({
		defaultOptions: {
			queries: {
				queryKeyHashFn: convexQueryClient.hashFn(),
				queryFn: convexQueryClient.queryFn(),
			},
		},
	})
	convexQueryClient.connect(cvxQueryClient)

	return {
		$cvx: api,
		$api: createTanstackQueryUtils(caller),
		queryClient,
		cvxQueryClient,
		cvx: convexQueryClient,
		caller,
	} as const
})
