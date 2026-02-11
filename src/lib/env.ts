import { z } from 'zod'

export const env = z
	.object({
		NODE_ENV: z
			.enum(['development', 'production', 'test'])
			.default('development'),
		REDIS_URL: z.string(),
		REDIS_TOKEN: z.string(),
	})
	.parse(process.env)
