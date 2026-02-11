import { createORPCClient, onError } from '@orpc/client'
import { RPCLink } from '@orpc/client/fetch'
import { BatchLinkPlugin } from '@orpc/client/plugins'
import { StandardRPCJsonSerializer } from '@orpc/client/standard'
import { createRouterClient, type RouterClient } from '@orpc/server'
import { createTanstackQueryUtils } from '@orpc/tanstack-query'
import { type RPCRouter, rpcRouter } from '@server/rpc'
import { createRpcContext } from '@server/rpc/init'
import {
	defaultShouldDehydrateQuery,
	QueryCache,
	QueryClient,
} from '@tanstack/react-query'
import { createIsomorphicFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'

const serializer = new StandardRPCJsonSerializer({
	customJsonSerializers: [],
})
const isAbortError = (error: unknown) => {
	if (!error) {
		return false
	}

	if (
		typeof DOMException !== 'undefined' &&
		error instanceof DOMException &&
		error.name === 'AbortError'
	) {
		return true
	}

	if (error instanceof Error && error.name === 'AbortError') {
		return true
	}

	if (typeof error === 'object') {
		const maybeError = error as { name?: string; cause?: unknown }
		if (maybeError.name === 'AbortError') {
			return true
		}

		const maybeCause = maybeError.cause as { name?: string } | undefined
		if (maybeCause?.name === 'AbortError') {
			return true
		}
	}

	return false
}
export const queryClient = new QueryClient({
	queryCache: new QueryCache({}),
	defaultOptions: {
		queries: {
			queryKeyHashFn(queryKey) {
				const [json, meta] = serializer.serialize(queryKey)
				return JSON.stringify({ json, meta })
			},
			staleTime: 60 * 1000, // > 0 to prevent immediate refetching on mount
			gcTime: 30 * 1000,
		},
		dehydrate: {
			serializeData: (data) => {
				const [json, meta] = serializer.serialize(data)
				return JSON.stringify({ json, meta })
			},
			shouldDehydrateQuery: defaultShouldDehydrateQuery,
		},
		hydrate: {
			deserializeData: (dataStr) =>
				serializer.deserialize(dataStr.json, dataStr.meta),
		},
	},
})

export const getRPCClient = createIsomorphicFn()
	.server(() =>
		createRouterClient(rpcRouter, {
			context: createRpcContext({
				headers: getRequestHeaders(),
			}),
		}),
	)
	.client((): RouterClient<RPCRouter> => {
		const link = new RPCLink({
			url: `${window.location.origin}/api/rpc`,
			plugins: [
				new BatchLinkPlugin({
					groups: [
						{
							condition: () => true,
							context: {},
						},
					],
				}),
			],
			method: ({ context }, path) => {
				// Use GET for cached responses
				if (context?.cache) {
					return 'GET'
				}

				// Use GET for rendering requests
				if (typeof window === 'undefined') {
					return 'GET'
				}

				// Use GET for read-like operations
				if (path.at(-1)?.match(/^(?:get|find|list|search)(?:[A-Z].*)?$/)) {
					return 'GET'
				}

				return 'POST'
			},
			fetch: (url, options: RequestInit) => {
				return fetch(url, {
					...options,
					credentials: 'include',
					signal: options?.signal,
				})
			},
			interceptors: [
				onError((error) => {
					if (isAbortError(error)) {
						return
					}
					console.error('RPC Error:', error)
				}),
			],
		})
		return createORPCClient(link)
	})

export const caller: RouterClient<RPCRouter> = getRPCClient()

export const $rpc = createTanstackQueryUtils(caller)
