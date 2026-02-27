/** biome-ignore-all lint/suspicious/noExplicitAny: Orpc plugin to handle Routes */

import { type AnyRouter, ORPCError, os, type Route } from '@orpc/server'
import { db } from '@server/db'

const RPC_AUTH_ROLES = ['VIEWER', 'AGENT', 'MANAGER', 'ADMIN'] as const
type RpcAuthRole = (typeof RPC_AUTH_ROLES)[number]

export interface RpcAuthIdentity {
	tenantId: string
	userId: string
	role: RpcAuthRole
}

interface RpcContext {
	headers: Headers
	auth?: {
		tenantId?: string
		userId?: string
		role?: string | null
	}
}

function normalizeRole(role: string | null | undefined): RpcAuthRole {
	const normalizedRole = role?.trim().toUpperCase()
	if (!normalizedRole) return 'VIEWER'
	if ((RPC_AUTH_ROLES as readonly string[]).includes(normalizedRole)) {
		return normalizedRole as RpcAuthRole
	}
	return 'VIEWER'
}

function normalizeIdentity(
	auth: RpcContext['auth'] | undefined,
): RpcAuthIdentity | null {
	if (!auth) return null
	const tenantId = auth.tenantId?.trim()
	const userId = auth.userId?.trim()
	if (!tenantId || !userId) return null
	return {
		tenantId,
		userId,
		role: normalizeRole(auth.role),
	}
}

export function resolveServerBootstrapAuthIdentity(): RpcAuthIdentity | null {
	const isProduction = process.env.NODE_ENV === 'production'

	const tenantId =
		process.env.RPC_SERVER_TENANT_ID ??
		(isProduction ? undefined : 'demo-tenant')
	const userId =
		process.env.RPC_SERVER_USER_ID ?? (isProduction ? undefined : 'demo-user')
	const role = normalizeRole(process.env.RPC_SERVER_ROLE ?? 'MANAGER')

	if (!tenantId || !userId) {
		return null
	}

	return {
		tenantId,
		userId,
		role,
	}
}

export async function createRpcContext(ctx: RpcContext) {
	const identity = normalizeIdentity(ctx.auth)
	if (!identity) {
		throw new ORPCError('UNAUTHORIZED', {
			message: 'Verified identity is required for RPC requests',
		})
	}

	// In non-production, allow E2E tests to override the role via header
	const isProduction = process.env.NODE_ENV === 'production'
	const testRoleHeader = !isProduction ? ctx.headers.get('x-test-role') : null
	const effectiveRole = testRoleHeader
		? normalizeRole(testRoleHeader)
		: identity.role

	return {
		db,
		services: {},
		headers: ctx.headers,
		auth: {
			tenantId: identity.tenantId,
			userId: identity.userId,
			role: effectiveRole,
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
