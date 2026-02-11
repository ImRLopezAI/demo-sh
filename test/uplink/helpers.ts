import { createRouterClient } from '@orpc/server'
import { rpcRouter } from '@server/rpc'
import { createRpcContext } from '@server/rpc/init'

export function createCaller() {
	return createRouterClient(rpcRouter, {
		context: createRpcContext({
			headers: new Headers({
				'x-tenant-id': 'demo-tenant',
				'x-user-id': 'test-user',
			}),
		}),
	})
}
