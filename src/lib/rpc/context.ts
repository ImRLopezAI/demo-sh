import { createTanstackQueryUtils } from '@orpc/tanstack-query'
import { cache } from 'react'
import { caller, queryClient } from './rpc'

export const getContext = cache(() => {
	return {
		$api: createTanstackQueryUtils(caller),
		queryClient,
		caller,
	} as const
})
