import { createRPCRouter, publicProcedure } from '@server/rpc/init'

export const healthRouter = createRPCRouter(
	{
		ping: publicProcedure
			.route({
				method: 'GET',
				path: '/health/ping',
				summary: 'Ping endpoint',
				description: 'Health check for the Health API router',
			})
			.handler(() => {
				return 'pong'
			}),
		reset: publicProcedure
			.route({
				method: 'POST',
				path: '/health/reset',
				summary: 'Reset the database',
				description: 'Resets the database to its initial state',
			})
			.handler(async ({ context }) => {
				await context.db._internals.reset()
				return { message: 'Database reset successfully' }
			}),
	},
	{
		tags: ['Health'],
	},
)
