import { flowRouter } from './flow.router'
import { hubRouter } from './hub.router'
import { insightRouter } from './insight.router'
import { ledgerRouter } from './ledger.router'
import { marketRouter } from './market.router'
import { payrollRouter } from './payroll.router'
import { posRouter } from './pos.router'
import { replenishmentRouter } from './replenishment.router'
import { traceRouter } from './trace.router'

export const uplinkRouter = {
	hub: hubRouter,
	market: marketRouter,
	insight: insightRouter,
	replenishment: replenishmentRouter,
	ledger: ledgerRouter,
	flow: flowRouter,
	payroll: payrollRouter,
	pos: posRouter,
	trace: traceRouter,
}
