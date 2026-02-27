import {
	createRpcContext,
	resolveServerBootstrapAuthIdentity,
	handler as rpcHandler,
} from '@server/rpc'
import { Hono } from 'hono'
import { compress } from 'hono/compress'
import { logger } from 'hono/logger'
import { requestId } from 'hono/request-id'
import { handle } from 'hono/vercel'

const app = new Hono()

app.use(requestId())
app.use(compress())
app.use(logger())

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

	return matched ? c.newResponse(response.body, response) : next()
})

export function toNextHandler() {
	return {
		GET: handle(app),
		POST: handle(app),
		PUT: handle(app),
		DELETE: handle(app),
		PATCH: handle(app),
		OPTIONS: handle(app),
		HEAD: handle(app),
	}
}
