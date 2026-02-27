import { OpenAPIReferencePlugin } from '@orpc/openapi/plugins'
import { onError } from '@orpc/server'
import { RPCHandler } from '@orpc/server/fetch'
import { BatchHandlerPlugin, ResponseHeadersPlugin } from '@orpc/server/plugins'
import { ZodToJsonSchemaConverter } from '@orpc/zod/zod4'
import {
	createRPCRouter,
	createRpcContext,
	type RpcContext,
	resolveServerBootstrapAuthIdentity,
} from './init'
import { healthRouter } from './router/health.router'
import { uplinkRouter } from './router/uplink'

const rpcRouter = createRPCRouter({
	health: healthRouter,
	...uplinkRouter,
})
export type RPCRouter = typeof rpcRouter

const handler = new RPCHandler(rpcRouter, {
	interceptors: [
		onError((error) => {
			console.error(error)
		}),
	],
	plugins: [
		new ResponseHeadersPlugin<RpcContext>(),
		new BatchHandlerPlugin(),
		new OpenAPIReferencePlugin({
			schemaConverters: [new ZodToJsonSchemaConverter()],
			specGenerateOptions: {
				info: {
					title: 'Productivity agent API',
					version: '1.0.0',
					description: 'API documentation for Productivity agent application',
				},
			},
			docsTitle: 'Productivity agent API Docs',
		}),
	],
})

export {
	createRpcContext,
	handler,
	resolveServerBootstrapAuthIdentity,
	rpcRouter,
}
