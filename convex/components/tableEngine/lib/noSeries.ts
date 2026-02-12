import type {
	GenericMutationCtx,
	GenericQueryCtx,
	GenericDataModel,
} from "convex/server"
import type { NoSeriesConfig } from "./types"

type RunCtx = Pick<
	GenericMutationCtx<GenericDataModel>,
	"runMutation" | "runQuery"
>

type ReadCtx = Pick<GenericQueryCtx<GenericDataModel>, "runQuery">

/**
 * Initialize a single NoSeries via the component API.
 */
export async function initNoSeries(
	ctx: RunCtx,
	componentApi: { noSeries: { initSeries: unknown } },
	config: NoSeriesConfig,
): Promise<void> {
	await ctx.runMutation(componentApi.noSeries.initSeries as never, {
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
	componentApi: { noSeries: { initSeries: unknown } },
	registrations: Record<string, { noSeries?: NoSeriesConfig }>,
): Promise<void> {
	const promises: Promise<void>[] = []
	for (const reg of Object.values(registrations)) {
		if (reg.noSeries) {
			promises.push(initNoSeries(ctx, componentApi, reg.noSeries))
		}
	}
	await Promise.all(promises)
}

/**
 * Get the next formatted code, atomically incrementing the counter.
 */
export async function getNextCode(
	ctx: RunCtx,
	componentApi: { noSeries: { getNextCode: unknown } },
	code: string,
): Promise<string> {
	return (await ctx.runMutation(
		componentApi.noSeries.getNextCode as never,
		{ code },
	)) as string
}

/**
 * Peek at the next code without incrementing.
 */
export async function peekNextCode(
	ctx: ReadCtx,
	componentApi: { noSeries: { peekNextCode: unknown } },
	code: string,
): Promise<string> {
	return (await ctx.runQuery(
		componentApi.noSeries.peekNextCode as never,
		{ code },
	)) as string
}
