import {
	createRpcContext,
	handler as rpcHandler,
	resolveServerBootstrapAuthIdentity,
} from '@server/rpc'
import { Hono } from 'hono'
import { logger } from 'hono/logger'

const app = new Hono()

app.use('*', logger())

app.use('/api/rpc/*', async (c, next) => {
	const request = c.req.raw
	const context = await createRpcContext({
		headers: request.headers,
		auth: resolveServerBootstrapAuthIdentity() ?? undefined,
	})
	const { matched, response } = await rpcHandler.handle(request, {
		prefix: '/api/rpc',
		context, // Provide initial context if needed
	})

	if (matched) {
		return c.newResponse(response.body, response)
	}

	await next()
})

export const handler = app.fetch
