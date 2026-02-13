import type {
	GenericDataModel,
	GenericMutationCtx,
	GenericQueryCtx,
} from 'convex/server'
import type { NoSeriesApi, NoSeriesConfig } from './types'

type RunCtx = Pick<
	GenericMutationCtx<GenericDataModel>,
	'runMutation' | 'runQuery'
>

type ReadCtx = Pick<GenericQueryCtx<GenericDataModel>, 'runQuery'>

/**
 * Initialize a single NoSeries via the component API.
 */
export async function initNoSeries(
	ctx: RunCtx,
	api: NoSeriesApi,
	config: NoSeriesConfig,
): Promise<void> {
	await ctx.runMutation(api.initSeries, {
		code: config.code,
		pattern: config.pattern,
		incrementBy: config.incrementBy ?? 1,
	})
}

/**
 * Initialize all registered NoSeries (call once in a setup mutation).
 */
export async function initAllSeries(
	ctx: RunCtx,
	api: NoSeriesApi,
	registrations: Record<string, { noSeries?: NoSeriesConfig }>,
): Promise<void> {
	const promises: Promise<void>[] = []
	for (const reg of Object.values(registrations)) {
		if (reg.noSeries) {
			promises.push(initNoSeries(ctx, api, reg.noSeries))
		}
	}
	await Promise.all(promises)
}

/**
 * Get the next formatted code, atomically incrementing the counter.
 * If the series doesn't exist and config is provided, it will be auto-created.
 */
export async function getNextCode(
	ctx: RunCtx,
	api: NoSeriesApi,
	code: string,
	config?: NoSeriesConfig,
): Promise<string> {
	return await ctx.runMutation(api.getNextCode, {
		code,
		pattern: config?.pattern,
		incrementBy: config?.incrementBy,
	})
}

/**
 * Peek at the next code without incrementing.
 */
export async function peekNextCode(
	ctx: ReadCtx,
	api: NoSeriesApi,
	code: string,
): Promise<string> {
	return await ctx.runQuery(api.peekNextCode, { code })
}
