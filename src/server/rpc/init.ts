/** biome-ignore-all lint/suspicious/noExplicitAny: Orpc plugin to handle Routes */

import { type AnyRouter, os, type Route } from '@orpc/server'
import { db } from '@server/db'

interface RpcContext {
	headers: Headers
}

export async function createRpcContext(ctx: RpcContext) {
	const tenantId = ctx.headers.get('x-tenant-id') ?? 'demo-tenant'
	const userId = ctx.headers.get('x-user-id') ?? 'demo-user'
	const role = ctx.headers.get('x-user-role') ?? 'ADMIN'

	return {
		db,
		services: {},
		headers: ctx.headers,
		auth: {
			tenantId,
			userId,
			role,
		},
	}
}

export type RpcContextType = Awaited<ReturnType<typeof createRpcContext>>

const rpc = os.$context<RpcContextType>().errors({
	UNAUTHORIZED: {
		message: 'You must be logged in to access this resource.',
	},
	NOT_FOUND: {
		message: 'The requested resource was not found.',
	},
	FORBIDDEN: {
		message: 'You do not have permission to access this resource.',
	},
})

export const publicProcedure = rpc

export function createRPCRouter<T extends AnyRouter>(
	routes: T,
	defaultOpenApi?: Omit<Partial<Route>, 'method' | 'path'>,
): T {
	const routesWithOpenApi: Record<string, any> = {}

	for (const [key, procedure] of Object.entries(routes)) {
		if (
			defaultOpenApi &&
			typeof procedure === 'object' &&
			'route' in procedure
		) {
			routesWithOpenApi[key] = procedure.route(defaultOpenApi)
		} else {
			routesWithOpenApi[key] = procedure
		}
	}

	return rpc.router(routesWithOpenApi) as T
}
