import {
	POSTING_REASON_REQUIRED,
	POSTING_TRANSITIONS,
	SALES_INVOICE_REASON_REQUIRED,
	SALES_INVOICE_TRANSITIONS,
} from '@server/db/constants'
import { createRPCRouter, publicProcedure } from '@server/rpc/init'
import z from 'zod'
import { assertPermission, assertRole } from '../authz'
import { createTenantScopedCrudRouter } from '../helpers'

const invoicesCrudRouter = createTenantScopedCrudRouter({
	moduleName: 'ledger',
	prefix: 'invoices',
	primaryTable: 'salesInvoiceHeaders',
	viewTables: { overview: 'salesInvoiceHeaders' },
	statusField: 'status',
	transitions: SALES_INVOICE_TRANSITIONS,
	reasonRequiredStatuses: SALES_INVOICE_REASON_REQUIRED,
	statusRoleRequirements: {
		REVERSED: 'MANAGER',
	},
})

const salesInvoiceLinesRouter = createTenantScopedCrudRouter({
	moduleName: 'ledger',
	prefix: 'invoice-lines',
	primaryTable: 'salesInvoiceLines',
	viewTables: { overview: 'salesInvoiceLines' },
	parentRelations: [
		{
			childField: 'invoiceNo',
			parentTable: 'salesInvoiceHeaders',
			parentField: 'invoiceNo',
		},
		{
			childField: 'itemId',
			parentTable: 'items',
		},
	],
})

const creditMemosCrudRouter = createTenantScopedCrudRouter({
	moduleName: 'ledger',
	prefix: 'credit-memos',
	primaryTable: 'salesCreditMemoHeaders',
	viewTables: { overview: 'salesCreditMemoHeaders' },
	statusField: 'status',
	transitions: POSTING_TRANSITIONS,
	reasonRequiredStatuses: POSTING_REASON_REQUIRED,
	statusRoleRequirements: {
		POSTED: 'MANAGER',
		CANCELED: 'MANAGER',
	},
})

const creditMemoLinesRouter = createTenantScopedCrudRouter({
	moduleName: 'ledger',
	prefix: 'credit-memo-lines',
	primaryTable: 'salesCreditMemoLines',
	viewTables: { overview: 'salesCreditMemoLines' },
	parentRelations: [
		{
			childField: 'creditMemoNo',
			parentTable: 'salesCreditMemoHeaders',
			parentField: 'creditMemoNo',
		},
		{
			childField: 'itemId',
			parentTable: 'items',
		},
	],
})

const eInvoiceSubmissionsRouter = createTenantScopedCrudRouter({
	moduleName: 'ledger',
	prefix: 'e-invoice-submissions',
	primaryTable: 'eInvoiceSubmissions',
	viewTables: { overview: 'eInvoiceSubmissions' },
	statusField: 'status',
})

const eInvoiceEventsRouter = createTenantScopedCrudRouter({
	moduleName: 'ledger',
	prefix: 'e-invoice-events',
	primaryTable: 'eInvoiceEvents',
	viewTables: { overview: 'eInvoiceEvents' },
})

const custLedgerEntriesRouter = createTenantScopedCrudRouter({
	moduleName: 'ledger',
	prefix: 'customer-ledger',
	primaryTable: 'custLedgerEntries',
	viewTables: { overview: 'custLedgerEntries' },
})

const glEntriesRouter = createTenantScopedCrudRouter({
	moduleName: 'ledger',
	prefix: 'gl-entries',
	primaryTable: 'glEntries',
	viewTables: { overview: 'glEntries' },
})

const postInvoiceInputSchema = z.object({
	id: z.string(),
})

const postCreditMemoInputSchema = z.object({
	id: z.string(),
})

const submitEInvoiceInputSchema = z.object({
	documentType: z.enum(['INVOICE', 'CREDIT_MEMO']),
	id: z.string(),
	force: z.boolean().default(false),
})

const resolveEInvoiceInputSchema = z.object({
	submissionId: z.string(),
	status: z.enum(['ACCEPTED', 'REJECTED', 'CANCELED']),
	message: z.string().optional(),
	providerRef: z.string().optional(),
})

const retryEInvoiceInputSchema = z.object({
	submissionId: z.string(),
})

const readTenantId = (row: unknown) =>
	(row as { tenantId?: string }).tenantId ?? 'demo-tenant'

const nextEntryNo = (rows: Array<{ entryNo?: number }>) =>
	rows.reduce((max, row) => Math.max(max, Number(row.entryNo ?? 0)), 0) + 1

const roundMoney = (value: number) => Math.round(value * 100) / 100

const lineBaseAmount = (line: {
	lineAmount?: number
	quantity?: number
	unitPrice?: number
}) =>
	roundMoney(
		Number(line.lineAmount ?? 0) ||
			Number(line.quantity ?? 0) * Number(line.unitPrice ?? 0),
	)

const lineTaxAmount = (line: { taxAmount?: number }) =>
	roundMoney(Number(line.taxAmount ?? 0))

const validateTaxLine = (
	line: { taxRatePercent?: number; taxAmount?: number; taxCode?: string },
	label: string,
) => {
	const taxRatePercent = Number(line.taxRatePercent ?? 0)
	const taxAmount = Number(line.taxAmount ?? 0)
	if (taxRatePercent < 0 || taxRatePercent > 100) {
		throw new Error(`Tax rate out of range for ${label}`)
	}
	if (taxAmount < 0) {
		throw new Error(`Tax amount must be non-negative for ${label}`)
	}
	if (taxRatePercent > 0 && !line.taxCode) {
		throw new Error(`Tax code is required when tax rate is set for ${label}`)
	}
}

const resolveDocumentHeader = (
	context: any,
	tenantId: string,
	documentType: 'INVOICE' | 'CREDIT_MEMO',
	id: string,
) => {
	if (documentType === 'INVOICE') {
		const header = context.db.schemas.salesInvoiceHeaders.get(id)
		if (!header || readTenantId(header) !== tenantId) {
			throw new Error('Invoice not found')
		}
		return {
			documentNo: String(header.invoiceNo ?? ''),
			status: String(header.status ?? ''),
			eInvoiceStatus: String(header.eInvoiceStatus ?? 'DRAFT'),
			update: (updates: Record<string, unknown>) =>
				context.db.schemas.salesInvoiceHeaders.update(id, updates),
		}
	}

	const header = context.db.schemas.salesCreditMemoHeaders.get(id)
	if (!header || readTenantId(header) !== tenantId) {
		throw new Error('Credit memo not found')
	}
	return {
		documentNo: String(header.creditMemoNo ?? ''),
		status: String(header.status ?? ''),
		eInvoiceStatus: String(header.eInvoiceStatus ?? 'DRAFT'),
		update: (updates: Record<string, unknown>) =>
			context.db.schemas.salesCreditMemoHeaders.update(id, updates),
	}
}

const invoicesRouter = createRPCRouter({
	...invoicesCrudRouter,
	postInvoice: publicProcedure
		.input(postInvoiceInputSchema)
		.route({
			method: 'POST',
			summary:
				'Post a sales invoice and create customer ledger and GL side effects',
		})
		.handler(({ input, context }) => {
			assertPermission(context, 'ledger.invoice.post', {
				fallbackRole: 'MANAGER',
				actionLabel: 'ledger invoice posting',
				moduleId: 'ledger',
				entityType: 'salesInvoice',
				entityId: input.id,
				logSuccess: true,
			})
			const tenantId = context.auth.tenantId

			const invoice = context.db.schemas.salesInvoiceHeaders.get(input.id)
			if (!invoice) {
				throw new Error('Invoice not found')
			}
			if (readTenantId(invoice) !== tenantId) {
				throw new Error('Cross-tenant access is not allowed')
			}

			if (!invoice.invoiceNo) {
				throw new Error('Invoice number is required before posting')
			}

			const lines = context.db.schemas.salesInvoiceLines.findMany({
				where: (row) =>
					readTenantId(row) === tenantId && row.invoiceNo === invoice.invoiceNo,
				orderBy: { field: 'lineNo', direction: 'asc' },
			})
			if (lines.length === 0) {
				throw new Error('Invoice has no lines to post')
			}

			for (const [index, line] of lines.entries()) {
				validateTaxLine(line, `invoice line ${index + 1}`)
			}

			const totalAmount = roundMoney(
				lines.reduce((sum, line) => sum + lineBaseAmount(line), 0),
			)
			const totalTaxAmount = roundMoney(
				lines.reduce((sum, line) => sum + lineTaxAmount(line), 0),
			)
			const grandTotal = roundMoney(totalAmount + totalTaxAmount)

			if (grandTotal <= 0) {
				throw new Error('Invoice total must be greater than zero to post')
			}

			const existingCustLedgerEntries =
				context.db.schemas.custLedgerEntries.findMany({
					where: (row) =>
						readTenantId(row) === tenantId &&
						row.documentNo === invoice.invoiceNo &&
						row.documentType === 'INVOICE',
				})
			const existingGlEntries = context.db.schemas.glEntries.findMany({
				where: (row) =>
					readTenantId(row) === tenantId &&
					row.documentNo === invoice.invoiceNo &&
					row.documentType === 'INVOICE',
			})

			if (invoice.status === 'POSTED') {
				if (
					existingCustLedgerEntries.length === 0 ||
					existingGlEntries.length < 2
				) {
					throw new Error(
						'Invoice is POSTED but accounting side effects are incomplete',
					)
				}
				return {
					invoiceId: invoice._id,
					invoiceNo: invoice.invoiceNo,
					status: invoice.status,
					postingDate: invoice.postingDate ?? new Date().toISOString(),
					lineCount: lines.length,
					totalAmount: grandTotal,
					taxAmount: totalTaxAmount,
					customerLedgerEntryId: existingCustLedgerEntries[0]?._id ?? null,
					glEntryIds: existingGlEntries.map((entry) => entry._id),
					idempotent: true,
				}
			}

			if (invoice.status !== 'DRAFT') {
				throw new Error('Only DRAFT invoices can be posted')
			}
			if (
				existingCustLedgerEntries.length > 0 ||
				existingGlEntries.length > 0
			) {
				throw new Error('Invoice already has accounting entries')
			}

			const postingDate = invoice.postingDate ?? new Date().toISOString()
			const description = `Sales Invoice ${invoice.invoiceNo}`
			const previousStatus = invoice.status
			const previousEInvoiceStatus = invoice.eInvoiceStatus
			const previousStatusReason = invoice.statusReason
			const previousStatusUpdatedAt = invoice.statusUpdatedAt
			const previousPostingDate = invoice.postingDate
			const previousTotalTaxAmount = invoice.totalTaxAmount
			const createdGlEntryIds: string[] = []
			let createdCustomerLedgerEntryId: string | null = null

			try {
				const postedInvoice = context.db.schemas.salesInvoiceHeaders.update(
					invoice._id,
					{
						status: 'POSTED',
						eInvoiceStatus: 'POSTED',
						postingDate,
						totalTaxAmount,
						statusReason: undefined,
						statusUpdatedAt: new Date(),
					},
				)
				if (!postedInvoice) {
					throw new Error('Unable to update invoice status')
				}

				const nextCustEntry = nextEntryNo(
					context.db.schemas.custLedgerEntries.findMany({
						where: (row) => readTenantId(row) === tenantId,
					}),
				)
				const customerLedgerEntry = context.db.schemas.custLedgerEntries.insert(
					{
						entryNo: nextCustEntry,
						customerId: invoice.customerId,
						postingDate,
						documentType: 'INVOICE',
						documentNo: invoice.invoiceNo,
						description,
						amount: grandTotal,
						remainingAmount: grandTotal,
						open: true,
						currency: invoice.currency ?? 'USD',
					},
				)
				createdCustomerLedgerEntryId = customerLedgerEntry._id

				const nextGlEntry = nextEntryNo(
					context.db.schemas.glEntries.findMany({
						where: (row) => readTenantId(row) === tenantId,
					}),
				)
				const receivableEntry = context.db.schemas.glEntries.insert({
					entryNo: nextGlEntry,
					postingDate,
					accountNo: '1100',
					accountName: 'Accounts Receivable',
					documentType: 'INVOICE',
					documentNo: invoice.invoiceNo,
					description,
					debitAmount: grandTotal,
					creditAmount: 0,
				})
				createdGlEntryIds.push(receivableEntry._id)

				const revenueEntry = context.db.schemas.glEntries.insert({
					entryNo: nextGlEntry + 1,
					postingDate,
					accountNo: '4000',
					accountName: 'Sales Revenue',
					documentType: 'INVOICE',
					documentNo: invoice.invoiceNo,
					description,
					debitAmount: 0,
					creditAmount: grandTotal,
				})
				createdGlEntryIds.push(revenueEntry._id)

				return {
					invoiceId: postedInvoice._id,
					invoiceNo: postedInvoice.invoiceNo,
					status: postedInvoice.status,
					postingDate,
					lineCount: lines.length,
					totalAmount: grandTotal,
					taxAmount: totalTaxAmount,
					customerLedgerEntryId: customerLedgerEntry._id,
					glEntryIds: createdGlEntryIds,
					idempotent: false,
				}
			} catch (error) {
				for (const glEntryId of createdGlEntryIds) {
					context.db.schemas.glEntries.delete(glEntryId)
				}
				if (createdCustomerLedgerEntryId) {
					context.db.schemas.custLedgerEntries.delete(
						createdCustomerLedgerEntryId,
					)
				}
				context.db.schemas.salesInvoiceHeaders.update(invoice._id, {
					status: previousStatus,
					eInvoiceStatus: previousEInvoiceStatus,
					statusReason: previousStatusReason,
					statusUpdatedAt: previousStatusUpdatedAt,
					postingDate: previousPostingDate,
					totalTaxAmount: previousTotalTaxAmount,
				})
				throw error
			}
		}),
})

const creditMemosRouter = createRPCRouter({
	...creditMemosCrudRouter,
	postCreditMemo: publicProcedure
		.input(postCreditMemoInputSchema)
		.route({
			method: 'POST',
			summary:
				'Post a sales credit memo and create balancing customer ledger and GL entries',
		})
		.handler(({ input, context }) => {
			assertRole(context, 'MANAGER', 'ledger credit memo posting')
			const tenantId = context.auth.tenantId
			const creditMemo = context.db.schemas.salesCreditMemoHeaders.get(input.id)
			if (!creditMemo) {
				throw new Error('Credit memo not found')
			}
			if (readTenantId(creditMemo) !== tenantId) {
				throw new Error('Cross-tenant access is not allowed')
			}
			if (!creditMemo.creditMemoNo) {
				throw new Error('Credit memo number is required before posting')
			}
			if (!creditMemo.appliesToInvoiceNo) {
				throw new Error('Credit memo must reference an original invoice')
			}

			const lines = context.db.schemas.salesCreditMemoLines.findMany({
				where: (row) =>
					readTenantId(row) === tenantId &&
					row.creditMemoNo === creditMemo.creditMemoNo,
				orderBy: { field: 'lineNo', direction: 'asc' },
			})
			if (lines.length === 0) {
				throw new Error('Credit memo has no lines to post')
			}
			for (const [index, line] of lines.entries()) {
				validateTaxLine(line, `credit memo line ${index + 1}`)
			}

			const totalAmount = roundMoney(
				lines.reduce((sum, line) => sum + lineBaseAmount(line), 0),
			)
			const totalTaxAmount = roundMoney(
				lines.reduce((sum, line) => sum + lineTaxAmount(line), 0),
			)
			const grandTotal = roundMoney(totalAmount + totalTaxAmount)
			if (grandTotal <= 0) {
				throw new Error('Credit memo total must be greater than zero to post')
			}

			const existingCustLedgerEntries =
				context.db.schemas.custLedgerEntries.findMany({
					where: (row) =>
						readTenantId(row) === tenantId &&
						row.documentNo === creditMemo.creditMemoNo &&
						row.documentType === 'CREDIT_MEMO',
				})
			const existingGlEntries = context.db.schemas.glEntries.findMany({
				where: (row) =>
					readTenantId(row) === tenantId &&
					row.documentNo === creditMemo.creditMemoNo &&
					row.documentType === 'CREDIT_MEMO',
			})

			if (creditMemo.status === 'POSTED') {
				return {
					creditMemoId: creditMemo._id,
					creditMemoNo: creditMemo.creditMemoNo,
					status: creditMemo.status,
					totalAmount: grandTotal,
					taxAmount: totalTaxAmount,
					customerLedgerEntryId: existingCustLedgerEntries[0]?._id ?? null,
					glEntryIds: existingGlEntries.map((row) => row._id),
					idempotent: true,
				}
			}

			if (creditMemo.status !== 'DRAFT') {
				throw new Error('Only DRAFT credit memos can be posted')
			}
			if (
				existingCustLedgerEntries.length > 0 ||
				existingGlEntries.length > 0
			) {
				throw new Error('Credit memo already has accounting entries')
			}

			const postingDate = creditMemo.postingDate ?? new Date().toISOString()
			const description = `Sales Credit Memo ${creditMemo.creditMemoNo}`
			const previousStatus = creditMemo.status
			const previousEInvoiceStatus = creditMemo.eInvoiceStatus
			const previousStatusReason = creditMemo.statusReason
			const previousStatusUpdatedAt = creditMemo.statusUpdatedAt
			const previousPostingDate = creditMemo.postingDate
			const previousTaxAmount = creditMemo.totalTaxAmount
			const createdGlEntryIds: string[] = []
			let createdCustomerLedgerEntryId: string | null = null

			try {
				const postedCreditMemo =
					context.db.schemas.salesCreditMemoHeaders.update(creditMemo._id, {
						status: 'POSTED',
						eInvoiceStatus: 'POSTED',
						postingDate,
						totalTaxAmount: totalTaxAmount,
						statusReason: undefined,
						statusUpdatedAt: new Date(),
					})
				if (!postedCreditMemo) {
					throw new Error('Unable to update credit memo status')
				}

				const nextCustEntry = nextEntryNo(
					context.db.schemas.custLedgerEntries.findMany({
						where: (row) => readTenantId(row) === tenantId,
					}),
				)
				const customerLedgerEntry = context.db.schemas.custLedgerEntries.insert(
					{
						entryNo: nextCustEntry,
						customerId: creditMemo.customerId,
						postingDate,
						documentType: 'CREDIT_MEMO',
						documentNo: creditMemo.creditMemoNo,
						description,
						amount: -grandTotal,
						remainingAmount: 0,
						open: false,
						currency: creditMemo.currency ?? 'USD',
					},
				)
				createdCustomerLedgerEntryId = customerLedgerEntry._id

				const nextGlEntry = nextEntryNo(
					context.db.schemas.glEntries.findMany({
						where: (row) => readTenantId(row) === tenantId,
					}),
				)
				const revenueReversal = context.db.schemas.glEntries.insert({
					entryNo: nextGlEntry,
					postingDate,
					accountNo: '4000',
					accountName: 'Sales Revenue',
					documentType: 'CREDIT_MEMO',
					documentNo: creditMemo.creditMemoNo,
					description,
					debitAmount: grandTotal,
					creditAmount: 0,
				})
				createdGlEntryIds.push(revenueReversal._id)

				const receivableReduction = context.db.schemas.glEntries.insert({
					entryNo: nextGlEntry + 1,
					postingDate,
					accountNo: '1100',
					accountName: 'Accounts Receivable',
					documentType: 'CREDIT_MEMO',
					documentNo: creditMemo.creditMemoNo,
					description,
					debitAmount: 0,
					creditAmount: grandTotal,
				})
				createdGlEntryIds.push(receivableReduction._id)

				return {
					creditMemoId: postedCreditMemo._id,
					creditMemoNo: postedCreditMemo.creditMemoNo,
					status: postedCreditMemo.status,
					totalAmount: grandTotal,
					taxAmount: totalTaxAmount,
					customerLedgerEntryId: customerLedgerEntry._id,
					glEntryIds: createdGlEntryIds,
					idempotent: false,
				}
			} catch (error) {
				for (const glEntryId of createdGlEntryIds) {
					context.db.schemas.glEntries.delete(glEntryId)
				}
				if (createdCustomerLedgerEntryId) {
					context.db.schemas.custLedgerEntries.delete(
						createdCustomerLedgerEntryId,
					)
				}
				context.db.schemas.salesCreditMemoHeaders.update(creditMemo._id, {
					status: previousStatus,
					eInvoiceStatus: previousEInvoiceStatus,
					statusReason: previousStatusReason,
					statusUpdatedAt: previousStatusUpdatedAt,
					postingDate: previousPostingDate,
					totalTaxAmount: previousTaxAmount,
				})
				throw error
			}
		}),
})

const eInvoicingRouter = createRPCRouter({
	submit: publicProcedure
		.input(submitEInvoiceInputSchema)
		.route({
			method: 'POST',
			summary: 'Submit posted invoice/credit memo to e-invoicing provider',
		})
		.handler(({ input, context }) => {
			assertRole(context, 'AGENT', 'ledger e-invoice submit')
			const tenantId = context.auth.tenantId
			const document = resolveDocumentHeader(
				context,
				tenantId,
				input.documentType,
				input.id,
			)

			if (document.status !== 'POSTED') {
				throw new Error('Only POSTED documents can be submitted')
			}

			const latestSubmission = context.db.schemas.eInvoiceSubmissions.findMany({
				where: (row) =>
					readTenantId(row) === tenantId &&
					row.documentType === input.documentType &&
					row.documentNo === document.documentNo,
				orderBy: { field: 'attemptNo', direction: 'desc' },
				limit: 1,
			})[0]

			if (!input.force && latestSubmission?.status === 'SUBMITTED') {
				return {
					submissionId: latestSubmission._id,
					submissionNo: latestSubmission.submissionNo,
					status: latestSubmission.status,
					attemptNo: latestSubmission.attemptNo,
					idempotent: true,
				}
			}

			if (
				!input.force &&
				(document.eInvoiceStatus === 'SUBMITTED' ||
					document.eInvoiceStatus === 'ACCEPTED')
			) {
				if (!latestSubmission) {
					throw new Error(
						'Document indicates submitted state without submission',
					)
				}
				return {
					submissionId: latestSubmission._id,
					submissionNo: latestSubmission.submissionNo,
					status: latestSubmission.status,
					attemptNo: latestSubmission.attemptNo,
					idempotent: true,
				}
			}

			const attemptNo = Number(latestSubmission?.attemptNo ?? 0) + 1
			const createdSubmission = context.db.schemas.eInvoiceSubmissions.insert({
				submissionNo: '',
				documentType: input.documentType,
				documentNo: document.documentNo,
				documentId: input.id,
				status: 'SUBMITTED',
				attemptNo,
				submittedAt: new Date().toISOString(),
				payloadHash: `${input.documentType}:${document.documentNo}:${attemptNo}`,
			})
			context.db.schemas.eInvoiceEvents.insert({
				submissionId: createdSubmission._id,
				eventType: latestSubmission ? 'RETRIED' : 'SUBMITTED',
				eventAt: new Date().toISOString(),
				message: latestSubmission ? 'Submission retried' : 'Submission created',
			})
			document.update({
				eInvoiceStatus: 'SUBMITTED',
			})

			return {
				submissionId: createdSubmission._id,
				submissionNo: createdSubmission.submissionNo,
				status: createdSubmission.status,
				attemptNo: createdSubmission.attemptNo,
				idempotent: false,
			}
		}),
	resolveSubmission: publicProcedure
		.input(resolveEInvoiceInputSchema)
		.route({
			method: 'POST',
			summary:
				'Resolve e-invoice submission status from provider callback/response',
		})
		.handler(({ input, context }) => {
			assertRole(context, 'AGENT', 'ledger e-invoice resolve')
			const tenantId = context.auth.tenantId
			const submission = context.db.schemas.eInvoiceSubmissions.get(
				input.submissionId,
			)
			if (!submission || readTenantId(submission) !== tenantId) {
				throw new Error('E-invoice submission not found')
			}

			const updatedSubmission = context.db.schemas.eInvoiceSubmissions.update(
				submission._id,
				{
					status: input.status,
					respondedAt: new Date().toISOString(),
					lastError: input.status === 'REJECTED' ? input.message : undefined,
					providerRef: input.providerRef,
				},
			)
			if (!updatedSubmission) {
				throw new Error('Unable to update e-invoice submission')
			}

			context.db.schemas.eInvoiceEvents.insert({
				submissionId: submission._id,
				eventType: input.status,
				eventAt: new Date().toISOString(),
				message: input.message,
			})

			const document = resolveDocumentHeader(
				context,
				tenantId,
				submission.documentType as 'INVOICE' | 'CREDIT_MEMO',
				submission.documentId,
			)
			document.update({
				eInvoiceStatus: input.status,
			})

			return {
				submissionId: updatedSubmission._id,
				status: updatedSubmission.status,
				documentType: updatedSubmission.documentType,
				documentNo: updatedSubmission.documentNo,
			}
		}),
	retryRejected: publicProcedure
		.input(retryEInvoiceInputSchema)
		.route({
			method: 'POST',
			summary: 'Retry a previously rejected e-invoice submission',
		})
		.handler(({ input, context }) => {
			assertRole(context, 'AGENT', 'ledger e-invoice retry')
			const tenantId = context.auth.tenantId
			const rejectedSubmission = context.db.schemas.eInvoiceSubmissions.get(
				input.submissionId,
			)
			if (
				!rejectedSubmission ||
				readTenantId(rejectedSubmission) !== tenantId
			) {
				throw new Error('E-invoice submission not found')
			}
			if (rejectedSubmission.status !== 'REJECTED') {
				throw new Error('Only rejected submissions can be retried')
			}

			const document = resolveDocumentHeader(
				context,
				tenantId,
				rejectedSubmission.documentType as 'INVOICE' | 'CREDIT_MEMO',
				rejectedSubmission.documentId,
			)
			if (document.status !== 'POSTED') {
				throw new Error('Only POSTED documents can be retried')
			}

			const retryAttemptNo = Number(rejectedSubmission.attemptNo ?? 0) + 1
			const retriedSubmission = context.db.schemas.eInvoiceSubmissions.insert({
				submissionNo: '',
				documentType: rejectedSubmission.documentType,
				documentNo: rejectedSubmission.documentNo,
				documentId: rejectedSubmission.documentId,
				status: 'SUBMITTED',
				attemptNo: retryAttemptNo,
				submittedAt: new Date().toISOString(),
				payloadHash: `${rejectedSubmission.documentType}:${rejectedSubmission.documentNo}:${retryAttemptNo}`,
			})
			context.db.schemas.eInvoiceEvents.insert({
				submissionId: rejectedSubmission._id,
				eventType: 'RETRIED',
				eventAt: new Date().toISOString(),
				message: `Retried as attempt ${retryAttemptNo}`,
			})
			context.db.schemas.eInvoiceEvents.insert({
				submissionId: retriedSubmission._id,
				eventType: 'SUBMITTED',
				eventAt: new Date().toISOString(),
				message: 'Retry submission sent',
			})
			document.update({
				eInvoiceStatus: 'SUBMITTED',
			})

			return {
				submissionId: retriedSubmission._id,
				submissionNo: retriedSubmission.submissionNo,
				status: retriedSubmission.status,
				attemptNo: retriedSubmission.attemptNo,
			}
		}),
})

export const ledgerRouter = createRPCRouter({
	invoices: invoicesRouter,
	invoiceLines: salesInvoiceLinesRouter,
	creditMemos: creditMemosRouter,
	creditMemoLines: creditMemoLinesRouter,
	eInvoiceSubmissions: eInvoiceSubmissionsRouter,
	eInvoiceEvents: eInvoiceEventsRouter,
	eInvoicing: eInvoicingRouter,
	customerLedger: custLedgerEntriesRouter,
	glEntries: glEntriesRouter,
})
