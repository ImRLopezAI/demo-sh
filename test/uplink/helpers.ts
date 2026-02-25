import { createRouterClient } from '@orpc/server'
import { rpcRouter } from '@server/rpc'
import { createRpcContext } from '@server/rpc/init'

export function createCaller(options?: {
	tenantId?: string
	userId?: string
	role?: string
}) {
	return createRouterClient(rpcRouter, {
		context: createRpcContext({
			headers: new Headers(),
			auth: {
				tenantId: options?.tenantId ?? 'demo-tenant',
				userId: options?.userId ?? 'test-user',
				role: options?.role ?? 'ADMIN',
			},
		}),
	})
}
