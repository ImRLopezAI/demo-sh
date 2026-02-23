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
			headers: new Headers({
				'x-tenant-id': options?.tenantId ?? 'demo-tenant',
				'x-user-id': options?.userId ?? 'test-user',
				'x-user-role': options?.role ?? 'ADMIN',
			}),
		}),
	})
}
