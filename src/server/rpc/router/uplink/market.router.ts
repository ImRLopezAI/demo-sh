import { createRPCRouter, publicProcedure } from '@server/rpc/init'
import z from 'zod'
import { assertPermission, assertRole } from '../authz'
import { createTenantScopedCrudRouter } from '../helpers'

const salesHeadersRouter = createTenantScopedCrudRouter({
	moduleName: 'market',
	prefix: 'sales-orders',
	primaryTable: 'salesHeaders',
	viewTables: { overview: 'salesHeaders' },
	statusField: 'status',
	transitions: {
		DRAFT: ['PENDING_APPROVAL'],
		PENDING_APPROVAL: ['APPROVED', 'REJECTED'],
		APPROVED: ['COMPLETED', 'CANCELED'],
		REJECTED: ['DRAFT'],
	},
	reasonRequiredStatuses: ['REJECTED', 'CANCELED'],
	statusRoleRequirements: {
		APPROVED: 'MANAGER',
		REJECTED: 'MANAGER',
		COMPLETED: 'MANAGER',
		CANCELED: 'MANAGER',
	},
})

const salesLineCreateInputSchema = z.object({
	lineNo: z.number().int().positive().optional(),
	itemId: z.string(),
	quantity: z.number().positive(),
	unitPrice: z.number().nonnegative().optional(),
	discountPercent: z.number().min(0).max(100).default(0),
	lineAmount: z.number().nonnegative().optional(),
	promotionCode: z.string().optional(),
	taxPolicyCode: z.string().optional(),
})

const salesLineChangeInputSchema = z.object({
	id: z.string().optional(),
	lineNo: z.number().int().positive().optional(),
	itemId: z.string(),
	quantity: z.number().positive(),
	unitPrice: z.number().nonnegative().optional(),
	discountPercent: z.number().min(0).max(100).default(0),
	lineAmount: z.number().nonnegative().optional(),
	promotionCode: z.string().optional(),
	taxPolicyCode: z.string().optional(),
	_delete: z.boolean().optional(),
})

const createSalesOrderWithLinesInputSchema = z.object({
	header: z.object({
		documentType: z.enum(['ORDER', 'RETURN_ORDER', 'QUOTE']).default('ORDER'),
		status: z
			.enum([
				'DRAFT',
				'PENDING_APPROVAL',
				'APPROVED',
				'REJECTED',
				'COMPLETED',
				'CANCELED',
			])
			.optional(),
		customerId: z.string(),
		orderDate: z.string().optional(),
		currency: z.string().default('USD'),
		externalRef: z.string().optional(),
		promotionCode: z.string().optional(),
		taxJurisdiction: z.string().optional(),
	}),
	lines: z.array(salesLineCreateInputSchema).min(1),
	idempotencyKey: z.string().trim().min(1).optional(),
	reserveOnCreate: z.boolean().default(false),
})

const updateSalesOrderWithLinesInputSchema = z.object({
	id: z.string(),
	header: z
		.object({
			documentType: z.enum(['ORDER', 'RETURN_ORDER', 'QUOTE']).optional(),
			customerId: z.string().optional(),
			orderDate: z.string().optional(),
			currency: z.string().optional(),
			externalRef: z.string().optional(),
			promotionCode: z.string().optional(),
			taxJurisdiction: z.string().optional(),
		})
		.optional(),
	lineChanges: z.array(salesLineChangeInputSchema).default([]),
})

const submitForApprovalInputSchema = z.object({
	id: z.string(),
})

const cancelWithReleaseInputSchema = z.object({
	id: z.string(),
	reason: z.string().optional(),
})

const evaluateLineInputSchema = z.object({
	itemId: z.string(),
	quantity: z.number().positive().default(1),
	unitPrice: z.number().nonnegative().optional(),
	discountPercent: z.number().min(0).max(100).default(0),
	customerId: z.string().optional(),
	promotionCode: z.string().optional(),
	taxPolicyCode: z.string().optional(),
	taxJurisdiction: z.string().optional(),
	channel: z.enum(['MARKET', 'POS']).default('MARKET'),
	currency: z.string().default('USD'),
})

const evaluateTotalsInputSchema = z.object({
	customerId: z.string().optional(),
	promotionCode: z.string().optional(),
	taxPolicyCode: z.string().optional(),
	taxJurisdiction: z.string().optional(),
	channel: z.enum(['MARKET', 'POS']).default('MARKET'),
	currency: z.string().default('USD'),
	lines: z
		.array(
			z.object({
				itemId: z.string(),
				quantity: z.number().positive(),
				unitPrice: z.number().nonnegative().optional(),
				discountPercent: z.number().min(0).max(100).default(0),
				promotionCode: z.string().optional(),
				taxPolicyCode: z.string().optional(),
			}),
		)
		.min(1),
})

const salesLinesRouter = createTenantScopedCrudRouter({
	moduleName: 'market',
	prefix: 'sales-lines',
	primaryTable: 'salesLines',
	viewTables: { overview: 'salesLines' },
	parentRelations: [
		{
			childField: 'documentNo',
			parentTable: 'salesHeaders',
			parentField: 'documentNo',
		},
		{
			childField: 'itemId',
			parentTable: 'items',
		},
	],
})

const itemsRouter = createTenantScopedCrudRouter({
	moduleName: 'market',
	prefix: 'items',
	primaryTable: 'items',
	viewTables: { overview: 'items' },
})

const customersRouter = createTenantScopedCrudRouter({
	moduleName: 'market',
	prefix: 'customers',
	primaryTable: 'customers',
	viewTables: { overview: 'customers' },
})

const priceRulesRouter = createTenantScopedCrudRouter({
	moduleName: 'market',
	prefix: 'price-rules',
	primaryTable: 'priceRules',
	viewTables: { overview: 'priceRules' },
})

const promotionsRouter = createTenantScopedCrudRouter({
	moduleName: 'market',
	prefix: 'promotions',
	primaryTable: 'promotions',
	viewTables: { overview: 'promotions' },
})

const taxPoliciesRouter = createTenantScopedCrudRouter({
	moduleName: 'market',
	prefix: 'tax-policies',
	primaryTable: 'taxPolicies',
	viewTables: { overview: 'taxPolicies' },
})

const inventoryReservationsRouter = createTenantScopedCrudRouter({
	moduleName: 'market',
	prefix: 'inventory-reservations',
	primaryTable: 'inventoryReservations',
	viewTables: { overview: 'inventoryReservations' },
	statusField: 'status',
	transitions: {
		ACTIVE: ['RELEASED', 'EXPIRED', 'CONSUMED'],
		RELEASED: [],
		EXPIRED: [],
		CONSUMED: [],
	},
	reasonRequiredStatuses: ['RELEASED', 'EXPIRED'],
})

const cartsCrudRouter = createTenantScopedCrudRouter({
	moduleName: 'market',
	prefix: 'carts',
	primaryTable: 'carts',
	viewTables: { overview: 'carts' },
	statusField: 'status',
	transitions: {
		OPEN: ['CHECKED_OUT', 'ABANDONED'],
	},
})

const checkoutInputSchema = z.object({
	cartId: z.string(),
})

const readTenantId = (row: unknown) =>
	(row as { tenantId?: string }).tenantId ?? 'demo-tenant'

const roundMoney = (value: number) => Math.round(value * 100) / 100

const isInWindow = (
	now: number,
	startsAt?: string | null,
	endsAt?: string | null,
) => {
	const startsAtMs = startsAt ? new Date(startsAt).getTime() : null
	const endsAtMs = endsAt ? new Date(endsAt).getTime() : null
	if (startsAtMs && !Number.isNaN(startsAtMs) && now < startsAtMs) return false
	if (endsAtMs && !Number.isNaN(endsAtMs) && now > endsAtMs) return false
	return true
}

const salesHeaderUpdatePayload = (header: {
	documentType?: 'ORDER' | 'RETURN_ORDER' | 'QUOTE'
	customerId?: string
	orderDate?: string
	currency?: string
	externalRef?: string
	promotionCode?: string
	taxJurisdiction?: string
}) => ({
	...(header.documentType ? { documentType: header.documentType } : {}),
	...(header.customerId ? { customerId: header.customerId } : {}),
	...(header.orderDate ? { orderDate: header.orderDate } : {}),
	...(header.currency ? { currency: header.currency } : {}),
	...(header.externalRef ? { externalRef: header.externalRef } : {}),
	...(header.promotionCode ? { promotionCode: header.promotionCode } : {}),
	...(header.taxJurisdiction ? { taxJurisdiction: header.taxJurisdiction } : {}),
})

const resolvePriceRule = (context: any, args: {
	tenantId: string
	itemId: string
	customerId?: string
	quantity: number
	currency?: string
}) => {
	const now = Date.now()
	const customerId = args.customerId
	const candidates = context.db.schemas.priceRules.findMany({
		where: (row: any) => {
			if (readTenantId(row) !== args.tenantId) return false
			if (!row.active) return false
			if (row.itemId !== args.itemId) return false
			if (customerId) {
				if (row.customerId && row.customerId !== customerId) return false
			} else if (row.customerId) {
				return false
			}
			if (Number(row.minQuantity ?? 1) > args.quantity) return false
			if (args.currency && row.currency && row.currency !== args.currency) return false
			return isInWindow(now, row.startsAt, row.endsAt)
		},
	})

	return candidates.sort((a: any, b: any) => {
		const customerScoreA = a.customerId ? 1 : 0
		const customerScoreB = b.customerId ? 1 : 0
		if (customerScoreA !== customerScoreB) return customerScoreB - customerScoreA
		const priorityA = Number(a.priority ?? 0)
		const priorityB = Number(b.priority ?? 0)
		if (priorityA !== priorityB) return priorityB - priorityA
		return Number(b.minQuantity ?? 1) - Number(a.minQuantity ?? 1)
	})[0]
}

const resolvePromotion = (
	context: any,
	tenantId: string,
	promotionCode?: string,
) => {
	if (!promotionCode) return null
	const now = Date.now()
	const promotion = context.db.schemas.promotions.findMany({
		where: (row: any) =>
			readTenantId(row) === tenantId &&
			row.code === promotionCode &&
			row.active &&
			isInWindow(now, row.startsAt, row.endsAt),
		limit: 1,
	})[0]
	if (!promotion) {
		throw new Error(`Promotion ${promotionCode} is not active`)
	}
	const usageLimit = Number(promotion.usageLimit ?? 0)
	if (usageLimit > 0 && Number(promotion.usageCount ?? 0) >= usageLimit) {
		throw new Error(`Promotion ${promotionCode} usage limit reached`)
	}
	return promotion
}

const resolveTaxPolicy = (context: any, args: {
	tenantId: string
	channel: 'MARKET' | 'POS'
	taxPolicyCode?: string
	jurisdiction?: string
}) => {
	const now = Date.now()
	if (args.taxPolicyCode) {
		const explicit = context.db.schemas.taxPolicies.findMany({
			where: (row: any) =>
				readTenantId(row) === args.tenantId &&
				row.code === args.taxPolicyCode &&
				row.active &&
				isInWindow(now, row.startsAt, row.endsAt) &&
				(row.channel === 'ALL' || row.channel === args.channel),
			limit: 1,
		})[0]
		if (!explicit) {
			throw new Error(`Tax policy ${args.taxPolicyCode} is not active`)
		}
		return explicit
	}

	const candidates = context.db.schemas.taxPolicies.findMany({
		where: (row: any) => {
			if (readTenantId(row) !== args.tenantId) return false
			if (!row.active) return false
			if (!(row.channel === 'ALL' || row.channel === args.channel)) return false
			if (args.jurisdiction && row.jurisdiction !== args.jurisdiction) return false
			return isInWindow(now, row.startsAt, row.endsAt)
		},
	})
	return candidates.sort(
		(a: any, b: any) => Number(b.priority ?? 0) - Number(a.priority ?? 0),
	)[0]
}

const evaluateCommercialLine = (
	context: any,
	args: {
		tenantId: string
		customerId?: string
		headerPromotionCode?: string
		taxJurisdiction?: string
		channel: 'MARKET' | 'POS'
		currency: string
		line: {
			itemId: string
			quantity: number
			unitPrice?: number
			discountPercent?: number
			lineAmount?: number
			promotionCode?: string
			taxPolicyCode?: string
		}
	},
) => {
	const item = context.db.schemas.items.get(args.line.itemId)
	if (!item || readTenantId(item) !== args.tenantId) {
		throw new Error(`Item ${args.line.itemId} not found`)
	}

	const priceRule = resolvePriceRule(context, {
		tenantId: args.tenantId,
		itemId: args.line.itemId,
		customerId: args.customerId,
		quantity: args.line.quantity,
		currency: args.currency,
	})
	const promotion = resolvePromotion(
		context,
		args.tenantId,
		args.line.promotionCode ?? args.headerPromotionCode,
	)
	const taxPolicy = resolveTaxPolicy(context, {
		tenantId: args.tenantId,
		channel: args.channel,
		taxPolicyCode: args.line.taxPolicyCode,
		jurisdiction: args.taxJurisdiction,
	})

	const baseUnitPrice = roundMoney(
		Number(
			priceRule?.unitPrice ?? args.line.unitPrice ?? item.unitPrice ?? 0,
		),
	)
	const directDiscount = Number(args.line.discountPercent ?? 0)
	const ruleDiscount = Number(priceRule?.discountPercent ?? 0)
	const promoDiscount = Number(promotion?.discountPercent ?? 0)
	const discountPercent = Math.min(
		100,
		promotion?.stackable
			? directDiscount + ruleDiscount + promoDiscount
			: Math.max(directDiscount, ruleDiscount, promoDiscount),
	)
	const lineAmount = roundMoney(
		Number(
			args.line.lineAmount ??
				args.line.quantity * baseUnitPrice * (1 - discountPercent / 100),
		),
	)
	const taxRatePercent = Number(taxPolicy?.ratePercent ?? 0)
	const taxAmount = roundMoney(lineAmount * (taxRatePercent / 100))

	return {
		item,
		priceRule,
		promotion,
		taxPolicy,
		unitPrice: baseUnitPrice,
		discountPercent,
		promotionDiscountPercent: promoDiscount,
		lineAmount,
		taxRatePercent,
		taxAmount,
		totalWithTax: roundMoney(lineAmount + taxAmount),
	}
}

const sumActiveReservations = (context: any, tenantId: string, itemId: string) =>
	context.db.schemas.inventoryReservations
		.findMany({
			where: (row: any) =>
				readTenantId(row) === tenantId &&
				row.itemId === itemId &&
				row.status === 'ACTIVE',
		})
		.reduce((sum: number, row: any) => sum + Number(row.quantity ?? 0), 0)

const ensureReservationCapacity = (context: any, args: {
	tenantId: string
	itemId: string
	quantity: number
}) => {
	const item = context.db.schemas.items.get(args.itemId)
	if (!item || readTenantId(item) !== args.tenantId) {
		throw new Error(`Item ${args.itemId} not found`)
	}
	const reservedQty = sumActiveReservations(context, args.tenantId, args.itemId)
	const availableQty = Number(item.inventory ?? 0) - reservedQty
	if (args.quantity > availableQty) {
		throw new Error(
			`Oversell prevented for item ${item.itemNo ?? item._id}: requested ${args.quantity}, available ${Math.max(0, availableQty)}`,
		)
	}
}

const reserveOrderLines = (context: any, args: {
	tenantId: string
	documentNo: string
	lines: Array<{ _id: string; itemId: string; quantity: number }>
}) => {
	const createdReservationIds: string[] = []
	for (const line of args.lines) {
		const existingReservation = context.db.schemas.inventoryReservations.findMany({
			where: (row: any) =>
				readTenantId(row) === args.tenantId &&
				row.salesLineId === line._id &&
				row.status === 'ACTIVE',
			limit: 1,
		})[0]
		if (existingReservation) continue

		ensureReservationCapacity(context, {
			tenantId: args.tenantId,
			itemId: line.itemId,
			quantity: Number(line.quantity ?? 0),
		})

		const reservation = context.db.schemas.inventoryReservations.insert({
			reservationNo: '',
			documentNo: args.documentNo,
			salesLineId: line._id,
			itemId: line.itemId,
			quantity: Number(line.quantity ?? 0),
			status: 'ACTIVE',
			reservedAt: new Date().toISOString(),
		})
		createdReservationIds.push(reservation._id)
		context.db.schemas.salesLines.update(line._id, {
			reservedQuantity: Number(line.quantity ?? 0),
		})
	}
	return createdReservationIds
}

const releaseOrderReservations = (context: any, args: {
	tenantId: string
	documentNo: string
	reason?: string
}) => {
	const activeReservations = context.db.schemas.inventoryReservations.findMany({
		where: (row: any) =>
			readTenantId(row) === args.tenantId &&
			row.documentNo === args.documentNo &&
			row.status === 'ACTIVE',
	})
	for (const reservation of activeReservations) {
		context.db.schemas.inventoryReservations.update(reservation._id, {
			status: 'RELEASED',
			releasedAt: new Date().toISOString(),
			reason: args.reason,
		})
		context.db.schemas.salesLines.update(reservation.salesLineId, {
			reservedQuantity: 0,
		})
	}
	return activeReservations.length
}

const incrementPromotionUsage = (
	context: any,
	tenantId: string,
	promotion: Record<string, unknown> | null,
) => {
	if (!promotion?._id) return
	const fresh = context.db.schemas.promotions.get(promotion._id as string)
	if (!fresh || readTenantId(fresh) !== tenantId) return
	context.db.schemas.promotions.update(fresh._id, {
		usageCount: Number(fresh.usageCount ?? 0) + 1,
	})
}

const salesOrdersRouter = createRPCRouter({
	...salesHeadersRouter,
	createWithLines: publicProcedure
		.input(createSalesOrderWithLinesInputSchema)
		.route({
			method: 'POST',
			summary:
				'Create sales order header and lines atomically with pricing/tax evaluation',
		})
		.handler(({ input, context }) => {
			assertRole(context, 'AGENT', 'market sales order create with lines')
			const tenantId = context.auth.tenantId

			const customer = context.db.schemas.customers.get(input.header.customerId)
			if (!customer || readTenantId(customer) !== tenantId) {
				throw new Error('Customer not found')
			}
			const idempotencyKey = input.idempotencyKey?.trim()
			if (idempotencyKey) {
				const existing = context.db.schemas.salesHeaders.findMany({
					where: (row: any) =>
						readTenantId(row) === tenantId &&
						row.idempotencyKey === idempotencyKey,
					limit: 1,
				})[0]
				if (existing) {
					const lines = context.db.schemas.salesLines.findMany({
						where: (row: any) =>
							readTenantId(row) === tenantId &&
							row.documentNo === existing.documentNo,
						orderBy: { field: 'lineNo', direction: 'asc' },
					})
					return {
						header: existing,
						lines,
						idempotent: true,
					}
				}
			}

			let createdOrderId: string | null = null
			const createdLineIds: string[] = []
			const createdReservationIds: string[] = []

			try {
				const createdOrder = context.db.schemas.salesHeaders.insert({
					documentNo: '',
					documentType: input.header.documentType,
					status: input.header.status ?? 'DRAFT',
					customerId: input.header.customerId,
					orderDate: input.header.orderDate ?? new Date().toISOString(),
					currency: input.header.currency,
					externalRef: input.header.externalRef,
					idempotencyKey,
					promotionCode: input.header.promotionCode,
					taxJurisdiction: input.header.taxJurisdiction,
					lineCount: 0,
					totalAmount: 0,
				})
				createdOrderId = createdOrder._id

				for (const [index, line] of input.lines.entries()) {
					const evaluated = evaluateCommercialLine(context, {
						tenantId,
						customerId: input.header.customerId,
						headerPromotionCode: input.header.promotionCode,
						taxJurisdiction: input.header.taxJurisdiction,
						channel: 'MARKET',
						currency: input.header.currency,
						line,
					})
					const createdLine = context.db.schemas.salesLines.insert({
						documentNo: createdOrder.documentNo,
						lineNo: line.lineNo ?? index + 1,
						itemId: line.itemId,
						quantity: line.quantity,
						unitPrice: evaluated.unitPrice,
						discountPercent: evaluated.discountPercent,
						lineAmount: evaluated.lineAmount,
						priceRuleCode: evaluated.priceRule?.code,
						promotionCode: evaluated.promotion?.code,
						promotionDiscountPercent: evaluated.promotionDiscountPercent,
						taxPolicyCode: evaluated.taxPolicy?.code,
						taxRatePercent: evaluated.taxRatePercent,
						taxAmount: evaluated.taxAmount,
						reservedQuantity: 0,
					})
					createdLineIds.push(createdLine._id)
					incrementPromotionUsage(context, tenantId, evaluated.promotion)
				}

				if (input.reserveOnCreate) {
					const createdLines = context.db.schemas.salesLines.findMany({
						where: (row: any) =>
							readTenantId(row) === tenantId &&
							row.documentNo === createdOrder.documentNo,
						orderBy: { field: 'lineNo', direction: 'asc' },
					})
					createdReservationIds.push(
						...reserveOrderLines(context, {
							tenantId,
							documentNo: createdOrder.documentNo,
							lines: createdLines,
						}),
					)
				}

				const lines = context.db.schemas.salesLines.findMany({
					where: (row: any) =>
						readTenantId(row) === tenantId &&
						row.documentNo === createdOrder.documentNo,
					orderBy: { field: 'lineNo', direction: 'asc' },
				})
				return {
					header: createdOrder,
					lines,
					idempotent: false,
				}
			} catch (error) {
				for (const reservationId of createdReservationIds) {
					context.db.schemas.inventoryReservations.delete(reservationId)
				}
				for (const lineId of createdLineIds) {
					context.db.schemas.salesLines.delete(lineId)
				}
				if (createdOrderId) {
					context.db.schemas.salesHeaders.delete(createdOrderId)
				}
				throw error
			}
		}),
	updateWithLines: publicProcedure
		.input(updateSalesOrderWithLinesInputSchema)
		.route({
			method: 'PATCH',
			summary:
				'Update sales order header and line deltas atomically with pricing/tax evaluation',
		})
		.handler(({ input, context }) => {
			assertRole(context, 'AGENT', 'market sales order update with lines')
			const tenantId = context.auth.tenantId

			const header = context.db.schemas.salesHeaders.get(input.id)
			if (!header || readTenantId(header) !== tenantId) {
				throw new Error('Sales order not found')
			}

			const originalHeader = {
				documentType: header.documentType,
				customerId: header.customerId,
				orderDate: header.orderDate,
				currency: header.currency,
				externalRef: header.externalRef,
				promotionCode: header.promotionCode,
				taxJurisdiction: header.taxJurisdiction,
			}
			const originalLines = context.db.schemas.salesLines
				.findMany({
					where: (row: any) =>
						readTenantId(row) === tenantId && row.documentNo === header.documentNo,
				})
				.map((line: any) => ({ ...line }))

			try {
				if (input.header) {
					if (input.header.customerId) {
						const customer = context.db.schemas.customers.get(
							input.header.customerId,
						)
						if (!customer || readTenantId(customer) !== tenantId) {
							throw new Error('Customer not found')
						}
					}
					const updated = context.db.schemas.salesHeaders.update(input.id, {
						...salesHeaderUpdatePayload(input.header),
					})
					if (!updated) throw new Error('Unable to update sales order header')
				}

				let nextLineNo = originalLines.reduce(
					(max: number, line: any) => Math.max(max, Number(line.lineNo ?? 0)),
					0,
				)
				const nextHeader = context.db.schemas.salesHeaders.get(input.id)
				const effectiveCustomerId = input.header?.customerId ?? nextHeader?.customerId
				const effectivePromotionCode =
					input.header?.promotionCode ?? nextHeader?.promotionCode
				const effectiveTaxJurisdiction =
					input.header?.taxJurisdiction ?? nextHeader?.taxJurisdiction
				const effectiveCurrency = input.header?.currency ?? nextHeader?.currency ?? 'USD'

				for (const lineChange of input.lineChanges) {
					if (lineChange._delete) {
						if (!lineChange.id) {
							throw new Error('Line delete requires an existing line id')
						}
						const line = context.db.schemas.salesLines.get(lineChange.id)
						if (
							!line ||
							readTenantId(line) !== tenantId ||
							line.documentNo !== header.documentNo
						) {
							throw new Error('Sales line not found for this sales order')
						}
						context.db.schemas.salesLines.delete(lineChange.id)
						continue
					}

					const evaluated = evaluateCommercialLine(context, {
						tenantId,
						customerId: effectiveCustomerId,
						headerPromotionCode: effectivePromotionCode,
						taxJurisdiction: effectiveTaxJurisdiction,
						channel: 'MARKET',
						currency: effectiveCurrency,
						line: lineChange,
					})

					if (lineChange.id) {
						const line = context.db.schemas.salesLines.get(lineChange.id)
						if (
							!line ||
							readTenantId(line) !== tenantId ||
							line.documentNo !== header.documentNo
						) {
							throw new Error('Sales line not found for this sales order')
						}

						const updated = context.db.schemas.salesLines.update(line._id, {
							lineNo: lineChange.lineNo ?? line.lineNo,
							itemId: lineChange.itemId,
							quantity: lineChange.quantity,
							unitPrice: evaluated.unitPrice,
							discountPercent: evaluated.discountPercent,
							lineAmount: evaluated.lineAmount,
							priceRuleCode: evaluated.priceRule?.code,
							promotionCode: evaluated.promotion?.code,
							promotionDiscountPercent: evaluated.promotionDiscountPercent,
							taxPolicyCode: evaluated.taxPolicy?.code,
							taxRatePercent: evaluated.taxRatePercent,
							taxAmount: evaluated.taxAmount,
						})
						if (!updated) throw new Error('Unable to update sales line')
						nextLineNo = Math.max(nextLineNo, Number(updated.lineNo ?? 0))
						continue
					}

					const created = context.db.schemas.salesLines.insert({
						documentNo: header.documentNo,
						lineNo: lineChange.lineNo ?? nextLineNo + 1,
						itemId: lineChange.itemId,
						quantity: lineChange.quantity,
						unitPrice: evaluated.unitPrice,
						discountPercent: evaluated.discountPercent,
						lineAmount: evaluated.lineAmount,
						priceRuleCode: evaluated.priceRule?.code,
						promotionCode: evaluated.promotion?.code,
						promotionDiscountPercent: evaluated.promotionDiscountPercent,
						taxPolicyCode: evaluated.taxPolicy?.code,
						taxRatePercent: evaluated.taxRatePercent,
						taxAmount: evaluated.taxAmount,
						reservedQuantity: 0,
					})
					nextLineNo = Math.max(nextLineNo, Number(created.lineNo ?? 0))
				}

				const refreshedHeader = context.db.schemas.salesHeaders.get(input.id)
				if (!refreshedHeader) throw new Error('Sales order not found after update')
				const lines = context.db.schemas.salesLines.findMany({
					where: (row: any) =>
						readTenantId(row) === tenantId &&
						row.documentNo === refreshedHeader.documentNo,
					orderBy: { field: 'lineNo', direction: 'asc' },
				})

				return {
					header: refreshedHeader,
					lines,
				}
			} catch (error) {
				context.db.schemas.salesHeaders.update(input.id, {
					...salesHeaderUpdatePayload(originalHeader),
				})
				const currentLines = context.db.schemas.salesLines.findMany({
					where: (row: any) =>
						readTenantId(row) === tenantId && row.documentNo === header.documentNo,
				})
				for (const line of currentLines) {
					context.db.schemas.salesLines.delete(line._id)
				}
				for (const line of originalLines) {
					context.db.schemas.salesLines.insert({
						documentNo: line.documentNo,
						lineNo: Number(line.lineNo ?? 0),
						itemId: line.itemId,
						quantity: Number(line.quantity ?? 0),
						unitPrice: Number(line.unitPrice ?? 0),
						discountPercent: Number(line.discountPercent ?? 0),
						lineAmount: Number(line.lineAmount ?? 0),
						priceRuleCode: line.priceRuleCode,
						promotionCode: line.promotionCode,
						promotionDiscountPercent: Number(
							line.promotionDiscountPercent ?? 0,
						),
						taxPolicyCode: line.taxPolicyCode,
						taxRatePercent: Number(line.taxRatePercent ?? 0),
						taxAmount: Number(line.taxAmount ?? 0),
						reservedQuantity: Number(line.reservedQuantity ?? 0),
					})
				}
				throw error
			}
		}),
	submitForApproval: publicProcedure
		.input(submitForApprovalInputSchema)
		.route({
			method: 'POST',
			summary:
				'Submit order for approval, enforcing oversell prevention and creating reservations',
		})
		.handler(({ input, context }) => {
			assertRole(context, 'AGENT', 'market sales order submit for approval')
			const tenantId = context.auth.tenantId
			const header = context.db.schemas.salesHeaders.get(input.id)
			if (!header || readTenantId(header) !== tenantId) {
				throw new Error('Sales order not found')
			}
			if (header.status === 'PENDING_APPROVAL') {
				const reservations = context.db.schemas.inventoryReservations.findMany({
					where: (row: any) =>
						readTenantId(row) === tenantId &&
						row.documentNo === header.documentNo &&
						row.status === 'ACTIVE',
				})
				return { header, reservations, idempotent: true }
			}
			if (!['DRAFT', 'REJECTED'].includes(String(header.status ?? ''))) {
				throw new Error('Only DRAFT or REJECTED orders can be submitted')
			}

			const lines = context.db.schemas.salesLines.findMany({
				where: (row: any) =>
					readTenantId(row) === tenantId && row.documentNo === header.documentNo,
			})
			if (lines.length === 0) {
				throw new Error('Order must include at least one line')
			}

			const createdReservationIds = reserveOrderLines(context, {
				tenantId,
				documentNo: header.documentNo,
				lines,
			})

			const updatedHeader = context.db.schemas.salesHeaders.update(header._id, {
				status: 'PENDING_APPROVAL',
				statusUpdatedAt: new Date(),
			})
			if (!updatedHeader) {
				for (const reservationId of createdReservationIds) {
					context.db.schemas.inventoryReservations.delete(reservationId)
				}
				throw new Error('Unable to submit order for approval')
			}

			const reservations = context.db.schemas.inventoryReservations.findMany({
				where: (row: any) =>
					readTenantId(row) === tenantId &&
					row.documentNo === header.documentNo &&
					row.status === 'ACTIVE',
			})
			return {
				header: updatedHeader,
				reservations,
				idempotent: false,
			}
		}),
	cancelWithRelease: publicProcedure
		.input(cancelWithReleaseInputSchema)
		.route({
			method: 'POST',
			summary: 'Cancel order and release active reservations',
		})
		.handler(({ input, context }) => {
			assertRole(context, 'MANAGER', 'market sales order cancel with release')
			const tenantId = context.auth.tenantId
			const header = context.db.schemas.salesHeaders.get(input.id)
			if (!header || readTenantId(header) !== tenantId) {
				throw new Error('Sales order not found')
			}
			if (header.status === 'CANCELED') {
				return {
					header,
					releasedCount: 0,
					idempotent: true,
				}
			}

			const releasedCount = releaseOrderReservations(context, {
				tenantId,
				documentNo: header.documentNo,
				reason: input.reason ?? 'Order canceled',
			})

			const updatedHeader = context.db.schemas.salesHeaders.update(header._id, {
				status: 'CANCELED',
				statusReason: input.reason ?? 'Order canceled',
				statusUpdatedAt: new Date(),
			})
			if (!updatedHeader) {
				throw new Error('Unable to cancel order')
			}
			return {
				header: updatedHeader,
				releasedCount,
				idempotent: false,
			}
		}),
})

const pricingRouter = createRPCRouter({
	evaluateLine: publicProcedure
		.input(evaluateLineInputSchema)
		.route({
			method: 'POST',
			summary: 'Evaluate pricing, promotion and tax for a single line',
		})
		.handler(({ input, context }) => {
			assertRole(context, 'AGENT', 'market pricing evaluate line')
			const result = evaluateCommercialLine(context, {
				tenantId: context.auth.tenantId,
				customerId: input.customerId,
				headerPromotionCode: input.promotionCode,
				taxJurisdiction: input.taxJurisdiction,
				channel: input.channel,
				currency: input.currency,
				line: input,
			})
			return {
				unitPrice: result.unitPrice,
				discountPercent: result.discountPercent,
				lineAmount: result.lineAmount,
				taxRatePercent: result.taxRatePercent,
				taxAmount: result.taxAmount,
				totalWithTax: result.totalWithTax,
				priceRuleCode: result.priceRule?.code,
				promotionCode: result.promotion?.code,
				taxPolicyCode: result.taxPolicy?.code,
			}
		}),
	evaluateTotals: publicProcedure
		.input(evaluateTotalsInputSchema)
		.route({
			method: 'POST',
			summary: 'Evaluate pricing and tax totals for multiple lines',
		})
		.handler(({ input, context }) => {
			assertRole(context, 'AGENT', 'market pricing evaluate totals')
			const lineEvaluations = input.lines.map((line) =>
				evaluateCommercialLine(context, {
					tenantId: context.auth.tenantId,
					customerId: input.customerId,
					headerPromotionCode: input.promotionCode,
					taxJurisdiction: input.taxJurisdiction,
					channel: input.channel,
					currency: input.currency,
					line,
				}),
			)
			const subtotal = roundMoney(
				lineEvaluations.reduce((sum, line) => sum + line.lineAmount, 0),
			)
			const taxAmount = roundMoney(
				lineEvaluations.reduce((sum, line) => sum + line.taxAmount, 0),
			)
			return {
				subtotal,
				taxAmount,
				total: roundMoney(subtotal + taxAmount),
				lines: lineEvaluations.map((line) => ({
					itemId: line.item._id,
					unitPrice: line.unitPrice,
					discountPercent: line.discountPercent,
					lineAmount: line.lineAmount,
					taxRatePercent: line.taxRatePercent,
					taxAmount: line.taxAmount,
					totalWithTax: line.totalWithTax,
					priceRuleCode: line.priceRule?.code,
					promotionCode: line.promotion?.code,
					taxPolicyCode: line.taxPolicy?.code,
				})),
			}
		}),
})

const cartsRouter = createRPCRouter({
	...cartsCrudRouter,
	checkout: publicProcedure
		.input(checkoutInputSchema)
		.route({
			method: 'POST',
			summary: 'Checkout a market cart into a sales order',
		})
		.handler(({ input, context }) => {
			assertPermission(context, 'market.cart.checkout', {
				fallbackRole: 'AGENT',
				actionLabel: 'market cart checkout',
				moduleId: 'market',
				entityType: 'cart',
				entityId: input.cartId,
				logSuccess: true,
			})
			const tenantId = context.auth.tenantId

			const cart = context.db.schemas.carts.get(input.cartId)
			if (!cart) {
				throw new Error('Cart not found')
			}
			if (readTenantId(cart) !== tenantId) {
				throw new Error('Cross-tenant access is not allowed')
			}

			const cartRef = `CART:${cart._id}`
			const existingOrder = context.db.schemas.salesHeaders.findMany({
				where: (row: any) =>
					readTenantId(row) === tenantId && row.externalRef === cartRef,
				limit: 1,
			})[0]

			if (existingOrder) {
				if (cart.status !== 'CHECKED_OUT') {
					context.db.schemas.carts.update(cart._id, {
						status: 'CHECKED_OUT',
					})
				}

				const orderLines = context.db.schemas.salesLines.findMany({
					where: (row: any) =>
						readTenantId(row) === tenantId &&
						row.documentNo === existingOrder.documentNo,
				})

				return {
					cartId: cart._id,
					cartStatus: 'CHECKED_OUT',
					orderId: existingOrder._id,
					orderNo: existingOrder.documentNo,
					lineCount: orderLines.length,
					idempotent: true,
				}
			}

			if (cart.status !== 'OPEN') {
				throw new Error('Only OPEN carts can be checked out')
			}

			const cartLines = context.db.schemas.cartLines.findMany({
				where: (row: any) =>
					readTenantId(row) === tenantId && row.cartId === cart._id,
				orderBy: { field: '_createdAt', direction: 'asc' },
			})

			if (cartLines.length === 0) {
				throw new Error('Cart has no lines to checkout')
			}

			let createdOrderId: string | null = null
			const createdLineIds: string[] = []

			try {
				const createdOrder = context.db.schemas.salesHeaders.insert({
					documentNo: '',
					documentType: 'ORDER',
					status: 'DRAFT',
					customerId: cart.customerId,
					orderDate: new Date().toISOString(),
					currency: cart.currency ?? 'USD',
					lineCount: 0,
					totalAmount: 0,
					externalRef: cartRef,
				})
				createdOrderId = createdOrder._id

				for (const [index, line] of cartLines.entries()) {
					const evaluated = evaluateCommercialLine(context, {
						tenantId,
						customerId: cart.customerId,
						channel: 'MARKET',
						currency: cart.currency ?? 'USD',
						line: {
							itemId: line.itemId,
							quantity: Number(line.quantity ?? 0),
							unitPrice: Number(line.unitPrice ?? 0),
							discountPercent: 0,
						},
					})
					const createdLine = context.db.schemas.salesLines.insert({
						documentNo: createdOrder.documentNo,
						lineNo: index + 1,
						itemId: line.itemId,
						quantity: line.quantity,
						unitPrice: evaluated.unitPrice,
						discountPercent: evaluated.discountPercent,
						lineAmount: evaluated.lineAmount,
						priceRuleCode: evaluated.priceRule?.code,
						promotionCode: evaluated.promotion?.code,
						promotionDiscountPercent: evaluated.promotionDiscountPercent,
						taxPolicyCode: evaluated.taxPolicy?.code,
						taxRatePercent: evaluated.taxRatePercent,
						taxAmount: evaluated.taxAmount,
						reservedQuantity: 0,
					})
					createdLineIds.push(createdLine._id)
				}

				const updatedCart = context.db.schemas.carts.update(cart._id, {
					status: 'CHECKED_OUT',
				})
				if (!updatedCart) {
					throw new Error('Unable to update cart status')
				}

				return {
					cartId: cart._id,
					cartStatus: updatedCart.status,
					orderId: createdOrder._id,
					orderNo: createdOrder.documentNo,
					lineCount: cartLines.length,
					idempotent: false,
				}
			} catch (error) {
				for (const lineId of createdLineIds) {
					context.db.schemas.salesLines.delete(lineId)
				}
				if (createdOrderId) {
					context.db.schemas.salesHeaders.delete(createdOrderId)
				}
				throw error
			}
		}),
})

const cartLinesRouter = createTenantScopedCrudRouter({
	moduleName: 'market',
	prefix: 'cart-lines',
	primaryTable: 'cartLines',
	viewTables: { overview: 'cartLines' },
	parentRelations: [
		{
			childField: 'cartId',
			parentTable: 'carts',
		},
		{
			childField: 'itemId',
			parentTable: 'items',
		},
	],
})

export const marketRouter = createRPCRouter({
	salesOrders: salesOrdersRouter,
	salesLines: salesLinesRouter,
	items: itemsRouter,
	customers: customersRouter,
	priceRules: priceRulesRouter,
	promotions: promotionsRouter,
	taxPolicies: taxPoliciesRouter,
	inventoryReservations: inventoryReservationsRouter,
	pricing: pricingRouter,
	carts: cartsRouter,
	cartLines: cartLinesRouter,
})
