import z from 'zod'
import {
	AUDIT_LOG_STATUSES,
	BANK_ACCOUNT_STATUSES,
	CARRIER_LABEL_STATUSES,
	CART_STATUSES,
	DOCUMENT_APPROVAL_STATUSES,
	E_INVOICE_STATUSES,
	EMPLOYEE_STATUSES,
	INVENTORY_RESERVATION_STATUSES,
	JOURNAL_LINE_STATUSES,
	NOTIFICATION_STATUSES,
	OPERATION_TASK_STATUSES,
	ORDER_WORKFLOW_STATUSES,
	PAYROLL_RUN_STATUSES,
	POS_SESSION_STATUSES,
	POS_TRANSACTION_STATUSES,
	POSTING_STATUSES,
	RECONCILIATION_STATUSES,
	SALES_INVOICE_STATUSES,
	SCHEDULED_JOB_STATUSES,
	SHIPMENT_PRIORITY_STATUSES,
	SHIPMENT_STATUSES,
	SLA_STATUSES,
	STATUTORY_REPORT_STATUSES,
	TERMINAL_STATUSES,
	TRACKING_EVENT_SOURCES,
	TRANSFER_STATUSES,
} from './constants'
import { defineSchema, flowField } from './definitions'

const DOCUMENT_SEED = process.env.NODE_ENV === 'test' ? 20 : 1000
const ENTITY_SEED = DOCUMENT_SEED
const SUPPORTING_SEED = Math.max(25, Math.floor(DOCUMENT_SEED / 8))

export const db = defineSchema(
	({ createTable }) => ({
		// =====================================================================
		// Hub
		// =====================================================================
		operationTasks: createTable('operationTasks', {
			schema: {
				taskNo: z.string(),
				moduleId: z.string(),
				title: z.string().meta({ type: 'sentence' }),
				description: z.string().optional(),
				status: z.enum(OPERATION_TASK_STATUSES).default('OPEN'),
				priority: z
					.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
					.default('MEDIUM'),
				assigneeUserId: z.string().optional(),
				dueDate: z.string().optional().meta({ type: 'datetime' }),
				slaTargetAt: z.string().optional().meta({ type: 'datetime' }),
				slaStatus: z.enum(SLA_STATUSES).optional(),
				slaBreachedAt: z.string().optional().meta({ type: 'datetime' }),
				slaLastEvaluatedAt: z.string().optional().meta({ type: 'datetime' }),
				escalationLevel: z.enum(['NONE', 'L1', 'L2']).optional(),
				statusReason: z.string().optional(),
				statusUpdatedAt: z.date().optional(),
			},
			seed: ENTITY_SEED,
			noSeries: { pattern: 'TASK0000001', field: 'taskNo' },
		})
			.table()
			.index('operationTasks_moduleId_idx', ['moduleId'])
			.index('operationTasks_status_idx', ['status']),

		moduleNotifications: createTable('moduleNotifications', {
			schema: {
				moduleId: z.string(),
				title: z.string().meta({ type: 'sentence' }),
				body: z.string().optional(),
				status: z.enum(NOTIFICATION_STATUSES).default('UNREAD'),
				severity: z.enum(['INFO', 'WARNING', 'ERROR']).default('INFO'),
				targetUserId: z.string().optional(),
			},
			seed: ENTITY_SEED,
		})
			.table()
			.index('moduleNotifications_moduleId_idx', ['moduleId'])
			.index('moduleNotifications_status_idx', ['status']),

		hubUsers: createTable('hubUsers', {
			schema: {
				userId: z.string(),
				displayName: z.string().optional().meta({ type: 'fullname' }),
				email: z.string().optional().meta({ type: 'email' }),
				active: z.boolean().default(true),
			},
			seed: false,
		})
			.table()
			.unique('hubUsers_userId_uq', ['userId'])
			.index('hubUsers_active_idx', ['active']),

		hubRoles: createTable('hubRoles', {
			schema: {
				roleCode: z.string(),
				name: z.string().meta({ field: 'commerce.department' }),
				description: z.string().optional(),
				minBaseRole: z
					.enum(['VIEWER', 'AGENT', 'MANAGER', 'ADMIN'])
					.default('VIEWER'),
				builtIn: z.boolean().default(false),
			},
			seed: false,
		})
			.table()
			.unique('hubRoles_roleCode_uq', ['roleCode']),

		hubPermissions: createTable('hubPermissions', {
			schema: {
				permissionCode: z.string(),
				moduleId: z.string(),
				action: z.string(),
				description: z.string().optional(),
				builtIn: z.boolean().default(false),
			},
			seed: false,
		})
			.table()
			.unique('hubPermissions_permissionCode_uq', ['permissionCode'])
			.index('hubPermissions_moduleId_idx', ['moduleId']),

		hubUserRoles: createTable('hubUserRoles', {
			schema: (one) => ({
				hubUserId: one('hubUsers'),
				roleId: one('hubRoles'),
				active: z.boolean().default(true),
				assignedAt: z.string().optional().meta({ type: 'datetime' }),
				assignedByUserId: z.string().optional(),
			}),
			seed: false,
		})
			.table()
			.unique('hubUserRoles_user_role_uq', ['hubUserId', 'roleId'])
			.index('hubUserRoles_hubUserId_idx', ['hubUserId'])
			.index('hubUserRoles_roleId_idx', ['roleId']),

		hubRolePermissions: createTable('hubRolePermissions', {
			schema: (one) => ({
				roleId: one('hubRoles'),
				permissionId: one('hubPermissions'),
				grantedAt: z.string().optional().meta({ type: 'datetime' }),
				grantedByUserId: z.string().optional(),
			}),
			seed: false,
		})
			.table()
			.unique('hubRolePermissions_role_permission_uq', [
				'roleId',
				'permissionId',
			])
			.index('hubRolePermissions_roleId_idx', ['roleId'])
			.index('hubRolePermissions_permissionId_idx', ['permissionId']),

		hubModuleSettings: createTable('hubModuleSettings', {
			schema: {
				moduleId: z.string(),
				settingKey: z.string(),
				valueJson: z.string().default('{}'),
				schemaVersion: z.string().optional(),
				revisionNo: z.number().default(0),
				updatedByUserId: z.string().optional(),
				updatedAt: z.string().optional().meta({ type: 'datetime' }),
			},
			seed: false,
		})
			.table()
			.unique('hubModuleSettings_module_key_uq', ['moduleId', 'settingKey'])
			.index('hubModuleSettings_moduleId_idx', ['moduleId']),

		hubModuleSettingsRevisions: createTable('hubModuleSettingsRevisions', {
			schema: (one) => ({
				settingId: one('hubModuleSettings'),
				moduleId: z.string(),
				settingKey: z.string(),
				revisionNo: z.number().default(0),
				valueJson: z.string().default('{}'),
				schemaVersion: z.string().optional(),
				changeReason: z.string().optional(),
				changedByUserId: z.string().optional(),
				changedAt: z.string().optional().meta({ type: 'datetime' }),
				rollbackOfRevisionNo: z.number().optional(),
			}),
			seed: false,
		})
			.table()
			.unique('hubModuleSettingsRevisions_setting_revision_uq', [
				'settingId',
				'revisionNo',
			])
			.index('hubModuleSettingsRevisions_settingId_idx', ['settingId'])
			.index('hubModuleSettingsRevisions_module_key_idx', [
				'moduleId',
				'settingKey',
			]),

		reportLayouts: createTable('reportLayouts', {
			schema: {
				moduleId: z.string(),
				entityId: z.string(),
				name: z.string().meta({ type: 'sentence' }),
				baseTemplate: z.string().default('A4_SUMMARY'),
				schemaJson: z.string().default('{}'),
				reportDefinitionJson: z.string().optional(),
				definitionVersion: z.number().int().min(1).default(1),
				datasetDefinition: z.record(z.string(), z.unknown()).optional(),
				datasetSchemaJson: z.record(z.string(), z.unknown()).optional(),
				datasetSchemaVersion: z.string().optional(),
				isSystem: z.boolean().default(false),
				active: z.boolean().default(true),
				versionNo: z.number().int().min(1).default(1),
				createdByUserId: z.string().optional(),
				updatedByUserId: z.string().optional(),
				updatedAt: z.string().optional().meta({ type: 'datetime' }),
			},
			seed: false,
		})
			.table()
			.index('reportLayouts_module_entity_idx', ['moduleId', 'entityId'])
			.index('reportLayouts_active_idx', ['active']),

		reportLayoutVersions: createTable('reportLayoutVersions', {
			schema: {
				layoutId: z.string(),
				versionNo: z.number().int().min(1).default(1),
				schemaJson: z.string().default('{}'),
				reportDefinitionJson: z.string().optional(),
				definitionVersion: z.number().int().min(1).default(1),
				datasetDefinition: z.record(z.string(), z.unknown()).optional(),
				datasetSchemaJson: z.record(z.string(), z.unknown()).optional(),
				datasetSchemaVersion: z.string().optional(),
				changedByUserId: z.string().optional(),
				changedAt: z.string().optional().meta({ type: 'datetime' }),
			},
			seed: false,
		})
			.table()
			.unique('reportLayoutVersions_layout_version_uq', [
				'layoutId',
				'versionNo',
			])
			.index('reportLayoutVersions_layout_idx', ['layoutId']),

		reportDefaults: createTable('reportDefaults', {
			schema: {
				moduleId: z.string(),
				entityId: z.string(),
				defaultLayoutRef: z.string(),
				updatedByUserId: z.string().optional(),
				updatedAt: z.string().optional().meta({ type: 'datetime' }),
			},
			seed: false,
		})
			.table()
			.unique('reportDefaults_module_entity_uq', ['moduleId', 'entityId']),

		reportRuns: createTable('reportRuns', {
			schema: {
				moduleId: z.string(),
				entityId: z.string(),
				layoutRef: z.string(),
				requestedByUserId: z.string().optional(),
				filtersJson: z.string().default('{}'),
				status: z.enum(['PENDING', 'GENERATED', 'FAILED']).default('GENERATED'),
				outputFileName: z.string().optional(),
				generatedAt: z.string().optional().meta({ type: 'datetime' }),
				errorSummary: z.string().optional(),
			},
			seed: false,
		})
			.table()
			.index('reportRuns_module_entity_idx', ['moduleId', 'entityId'])
			.index('reportRuns_status_idx', ['status']),

		hubAuditLogs: createTable('hubAuditLogs', {
			schema: {
				auditNo: z.string(),
				actorUserId: z.string().optional(),
				actorRole: z.string().optional(),
				moduleId: z.string(),
				action: z.string(),
				entityType: z.string(),
				entityId: z.string().optional(),
				status: z.enum(AUDIT_LOG_STATUSES).default('SUCCESS'),
				message: z.string().optional(),
				beforeJson: z.string().optional(),
				afterJson: z.string().optional(),
				correlationId: z.string().optional(),
				occurredAt: z.string().optional().meta({ type: 'datetime' }),
				source: z.string().default('RPC'),
			},
			seed: false,
			noSeries: { pattern: 'AUD0000001', field: 'auditNo' },
		})
			.table()
			.index('hubAuditLogs_moduleId_idx', ['moduleId'])
			.index('hubAuditLogs_action_idx', ['action'])
			.index('hubAuditLogs_status_idx', ['status'])
			.index('hubAuditLogs_actorUserId_idx', ['actorUserId']),

		scheduledJobs: createTable('scheduledJobs', {
			schema: {
				jobCode: z.string(),
				name: z.string().meta({ type: 'sentence' }),
				moduleId: z.string(),
				cadenceType: z.enum(['HOURLY', 'DAILY']).default('DAILY'),
				cadenceInterval: z.number().int().min(1).max(24).default(1),
				runHourUtc: z.number().int().min(0).max(23).default(0),
				runMinuteUtc: z.number().int().min(0).max(59).default(0),
				enabled: z.boolean().default(true),
				retryLimit: z.number().int().min(0).max(5).default(1),
				nextRunAt: z.string().optional().meta({ type: 'datetime' }),
				lastRunAt: z.string().optional().meta({ type: 'datetime' }),
				lastRunStatus: z.enum(SCHEDULED_JOB_STATUSES).default('IDLE'),
				lastRunError: z.string().optional(),
				configJson: z.string().default('{}'),
			},
			seed: false,
		})
			.table()
			.unique('scheduledJobs_jobCode_uq', ['jobCode'])
			.index('scheduledJobs_moduleId_idx', ['moduleId'])
			.index('scheduledJobs_enabled_idx', ['enabled'])
			.index('scheduledJobs_nextRunAt_idx', ['nextRunAt']),

		scheduledJobRuns: createTable('scheduledJobRuns', {
			schema: (one) => ({
				runNo: z.string(),
				jobId: one('scheduledJobs'),
				jobCode: z.string(),
				moduleId: z.string(),
				cadenceWindowKey: z.string(),
				status: z
					.enum(['RUNNING', 'SUCCESS', 'FAILED', 'SKIPPED'])
					.default('RUNNING'),
				startedAt: z.string().optional().meta({ type: 'datetime' }),
				finishedAt: z.string().optional().meta({ type: 'datetime' }),
				errorSummary: z.string().optional(),
				attemptNo: z.number().int().min(1).default(1),
				trigger: z.enum(['SCHEDULED', 'MANUAL', 'RETRY']).default('SCHEDULED'),
				resultJson: z.string().optional(),
			}),
			seed: false,
			noSeries: { pattern: 'SJOBRUN0000001', field: 'runNo' },
		})
			.table()
			.unique('scheduledJobRuns_job_window_uq', ['jobId', 'cadenceWindowKey'])
			.index('scheduledJobRuns_jobId_idx', ['jobId'])
			.index('scheduledJobRuns_status_idx', ['status'])
			.index('scheduledJobRuns_window_idx', ['cadenceWindowKey']),

		orderWorkflows: createTable('orderWorkflows', {
			schema: {
				workflowNo: z.string(),
				salesOrderId: z.string(),
				salesOrderNo: z.string().optional(),
				status: z.enum(ORDER_WORKFLOW_STATUSES).default('RUNNING'),
				currentStage: z
					.enum([
						'VALIDATE_ORDER',
						'CREATE_AND_POST_INVOICE',
						'CREATE_SHIPMENT',
						'DONE',
					])
					.default('VALIDATE_ORDER'),
				startedAt: z.string().optional().meta({ type: 'datetime' }),
				completedAt: z.string().optional().meta({ type: 'datetime' }),
				failedAt: z.string().optional().meta({ type: 'datetime' }),
				failureCode: z.string().optional(),
				failureMessage: z.string().optional(),
				retryCount: z.number().default(0),
				invoiceId: z.string().optional(),
				invoiceNo: z.string().optional(),
				shipmentId: z.string().optional(),
				shipmentNo: z.string().optional(),
				failureTaskId: z.string().optional(),
				failureNotificationId: z.string().optional(),
				lastStepAt: z.string().optional().meta({ type: 'datetime' }),
			},
			seed: false,
			noSeries: { pattern: 'WF0000001', field: 'workflowNo' },
		})
			.table()
			.index('orderWorkflows_salesOrderId_idx', ['salesOrderId'])
			.index('orderWorkflows_salesOrderNo_idx', ['salesOrderNo'])
			.index('orderWorkflows_status_idx', ['status']),

		orderWorkflowSteps: createTable('orderWorkflowSteps', {
			schema: (one) => ({
				workflowId: one('orderWorkflows'),
				stage: z.enum([
					'VALIDATE_ORDER',
					'CREATE_AND_POST_INVOICE',
					'CREATE_SHIPMENT',
				]),
				status: z
					.enum(['PENDING', 'RUNNING', 'COMPLETED', 'FAILED'])
					.default('PENDING'),
				attemptNo: z.number().default(0),
				startedAt: z.string().optional().meta({ type: 'datetime' }),
				finishedAt: z.string().optional().meta({ type: 'datetime' }),
				errorMessage: z.string().optional(),
				detail: z.string().optional(),
			}),
			seed: false,
		})
			.table()
			.index('orderWorkflowSteps_workflowId_idx', ['workflowId'])
			.index('orderWorkflowSteps_stage_idx', ['stage'])
			.index('orderWorkflowSteps_status_idx', ['status'])
			.unique('orderWorkflowSteps_workflowId_stage_uq', [
				'workflowId',
				'stage',
			]),

		// =====================================================================
		// Market
		// =====================================================================
		items: createTable('items', {
			schema: {
				itemNo: z.string(),
				description: z.string().meta({ field: 'commerce.productName' }),
				type: z.enum(['ITEM', 'SERVICE', 'BUNDLE']).default('ITEM'),
				unitPrice: z.number().default(0).meta({ min: 5, max: 500 }),
				unitCost: z.number().default(0).meta({ min: 2, max: 300 }),
				inventory: z.number().default(0).meta({ min: 0, max: 1000 }),
				uom: z.string().default('EA'),
				barcode: z.string().optional(),
				blocked: z.boolean().default(false),

				totalSalesQty: z
					.number()
					.default(0)
					.meta({
						flowField: flowField({
							type: 'sum',
							source: 'salesLines',
							key: 'itemId',
							field: 'quantity',
						}),
					}),
				totalSalesAmount: z
					.number()
					.default(0)
					.meta({
						flowField: flowField({
							type: 'sum',
							source: 'salesLines',
							key: 'itemId',
							field: 'lineAmount',
						}),
					}),
			},
			seed: ENTITY_SEED,
			noSeries: { pattern: 'ITEM0000001', field: 'itemNo' },
		})
			.table()
			.index('items_itemNo_idx', ['itemNo'])
			.unique('items_barcode_uq', ['barcode']),

		customers: createTable('customers', {
			schema: {
				customerNo: z.string(),
				name: z.string().meta({ type: 'company' }),
				email: z.string().optional().meta({ type: 'email' }),
				phone: z.string().optional().meta({ type: 'phone' }),
				address: z.string().optional().meta({ type: 'address' }),
				city: z.string().optional().meta({ type: 'city' }),
				country: z.string().optional().meta({ type: 'country' }),
				blocked: z.boolean().default(false),

				orderCount: z
					.number()
					.default(0)
					.meta({
						flowField: flowField({
							type: 'count',
							source: 'salesHeaders',
							key: 'customerId',
						}),
					}),
				totalBalance: z
					.number()
					.default(0)
					.meta({
						flowField: flowField({
							type: 'sum',
							source: 'custLedgerEntries',
							key: 'customerId',
							field: 'remainingAmount',
						}),
					}),
			},
			seed: ENTITY_SEED,
			noSeries: { pattern: 'CUST0000001', field: 'customerNo' },
		})
			.table()
			.index('customers_customerNo_idx', ['customerNo']),

		salesHeaders: createTable('salesHeaders', {
			schema: (one) => ({
				documentNo: z.string(),
				documentType: z
					.enum(['ORDER', 'RETURN_ORDER', 'QUOTE'])
					.default('ORDER'),
				status: z.enum(DOCUMENT_APPROVAL_STATUSES).default('DRAFT'),
				customerId: one('customers'),
				customerName: z
					.string()
					.optional()
					.meta({
						flowField: flowField({
							type: 'lookup',
							source: 'customers',
							key: '_id',
							from: 'customerId',
							field: 'name',
						}),
					}),
				orderDate: z.string().optional().meta({ type: 'datetime' }),
				currency: z
					.string()
					.default('USD')
					.meta({ field: 'finance.currencyCode' }),
				statusReason: z.string().optional(),
				statusUpdatedAt: z.date().optional(),
				externalRef: z.string().optional(),
				idempotencyKey: z.string().optional(),
				promotionCode: z.string().optional(),
				taxJurisdiction: z.string().optional(),

				lineCount: z
					.number()
					.default(0)
					.meta({
						flowField: flowField({
							type: 'count',
							source: 'salesLines',
							key: 'documentNo',
							from: 'documentNo',
						}),
					}),
				totalAmount: z
					.number()
					.default(0)
					.meta({
						flowField: flowField({
							type: 'sum',
							source: 'salesLines',
							key: 'documentNo',
							from: 'documentNo',
							field: 'lineAmount',
						}),
					}),
			}),
			seed: DOCUMENT_SEED,
			noSeries: { pattern: 'SO0000001', field: 'documentNo' },
		})
			.table()
			.index('salesHeaders_customerId_idx', ['customerId'])
			.index('salesHeaders_status_idx', ['status'])
			.index('salesHeaders_idempotencyKey_idx', ['idempotencyKey']),

		salesLines: createTable('salesLines', {
			schema: (one) => ({
				documentNo: one('salesHeaders'),
				lineNo: z.number().default(0),
				itemId: one('items'),
				itemDescription: z
					.string()
					.optional()
					.meta({
						flowField: flowField({
							type: 'lookup',
							source: 'items',
							key: '_id',
							from: 'itemId',
							field: 'description',
						}),
					}),
				quantity: z.number().default(0).meta({ min: 1, max: 50 }),
				unitPrice: z.number().default(0).meta({ min: 10, max: 500 }),
				discountPercent: z.number().default(0).meta({ min: 0, max: 25 }),
				lineAmount: z.number().default(0).meta({ min: 10, max: 5000 }),
				priceRuleCode: z.string().optional(),
				promotionCode: z.string().optional(),
				promotionDiscountPercent: z.number().default(0),
				taxPolicyCode: z.string().optional(),
				taxRatePercent: z.number().default(0),
				taxAmount: z.number().default(0),
				reservedQuantity: z.number().default(0),
			}),
			seed: { min: 2, max: 5, perParent: true, parentTable: 'salesHeaders' },
		})
			.table()
			.index('salesLines_documentNo_idx', ['documentNo'])
			.index('salesLines_itemId_idx', ['itemId'])
			.computed((row) => ({
				calculatedAmount:
					row.quantity * row.unitPrice * (1 - row.discountPercent / 100),
				calculatedTax:
					row.quantity *
					row.unitPrice *
					(1 - row.discountPercent / 100) *
					(row.taxRatePercent / 100),
			})),

		priceRules: createTable('priceRules', {
			schema: (one) => ({
				code: z.string(),
				name: z.string().meta({ type: 'sentence' }),
				active: z.boolean().default(true),
				itemId: one('items'),
				customerId: one('customers').optional(),
				minQuantity: z.number().default(1),
				unitPrice: z.number().optional(),
				discountPercent: z.number().default(0),
				currency: z.string().default('USD'),
				startsAt: z.string().optional().meta({ type: 'datetime' }),
				endsAt: z.string().optional().meta({ type: 'datetime' }),
				priority: z.number().default(0),
			}),
			seed: false,
			noSeries: { pattern: 'PRULE000001', field: 'code' },
		})
			.table()
			.index('priceRules_itemId_idx', ['itemId'])
			.index('priceRules_customerId_idx', ['customerId'])
			.index('priceRules_active_idx', ['active']),

		promotions: createTable('promotions', {
			schema: {
				code: z.string(),
				name: z.string().meta({ type: 'sentence' }),
				active: z.boolean().default(true),
				discountPercent: z.number().default(0),
				stackable: z.boolean().default(false),
				usageLimit: z.number().optional(),
				usageCount: z.number().default(0),
				startsAt: z.string().optional().meta({ type: 'datetime' }),
				endsAt: z.string().optional().meta({ type: 'datetime' }),
			},
			seed: false,
		})
			.table()
			.unique('promotions_code_uq', ['code'])
			.index('promotions_active_idx', ['active']),

		taxPolicies: createTable('taxPolicies', {
			schema: {
				code: z.string(),
				name: z.string().meta({ type: 'sentence' }),
				jurisdiction: z.string().default('US-DEFAULT'),
				channel: z.enum(['MARKET', 'POS', 'ALL']).default('ALL'),
				ratePercent: z.number().default(0),
				active: z.boolean().default(true),
				startsAt: z.string().optional().meta({ type: 'datetime' }),
				endsAt: z.string().optional().meta({ type: 'datetime' }),
				priority: z.number().default(0),
			},
			seed: false,
		})
			.table()
			.unique('taxPolicies_code_uq', ['code'])
			.index('taxPolicies_jurisdiction_idx', ['jurisdiction'])
			.index('taxPolicies_active_idx', ['active']),

		inventoryReservations: createTable('inventoryReservations', {
			schema: (one) => ({
				reservationNo: z.string(),
				documentNo: one('salesHeaders'),
				salesLineId: one('salesLines'),
				itemId: one('items'),
				quantity: z.number().default(0),
				status: z.enum(INVENTORY_RESERVATION_STATUSES).default('ACTIVE'),
				reason: z.string().optional(),
				reservedAt: z.string().optional().meta({ type: 'datetime' }),
				releasedAt: z.string().optional().meta({ type: 'datetime' }),
			}),
			seed: false,
			noSeries: { pattern: 'RES0000001', field: 'reservationNo' },
		})
			.table()
			.index('inventoryReservations_documentNo_idx', ['documentNo'])
			.index('inventoryReservations_itemId_idx', ['itemId'])
			.index('inventoryReservations_status_idx', ['status']),

		carts: createTable('carts', {
			schema: (one) => ({
				customerId: one('customers'),
				customerName: z
					.string()
					.optional()
					.meta({
						flowField: flowField({
							type: 'lookup',
							source: 'customers',
							key: '_id',
							from: 'customerId',
							field: 'name',
						}),
					}),
				status: z.enum(CART_STATUSES).default('OPEN'),
				currency: z
					.string()
					.default('USD')
					.meta({ field: 'finance.currencyCode' }),

				itemCount: z
					.number()
					.default(0)
					.meta({
						flowField: flowField({
							type: 'count',
							source: 'cartLines',
							key: 'cartId',
						}),
					}),
				totalAmount: z
					.number()
					.default(0)
					.meta({
						flowField: flowField({
							type: 'sum',
							source: 'cartLines',
							key: 'cartId',
							field: 'lineAmount',
						}),
					}),
			}),
			seed: ENTITY_SEED,
		})
			.table()
			.index('carts_customerId_idx', ['customerId'])
			.index('carts_status_idx', ['status']),

		cartLines: createTable('cartLines', {
			schema: (one) => ({
				cartId: one('carts'),
				itemDescription: z
					.string()
					.optional()
					.meta({
						flowField: flowField({
							type: 'lookup',
							source: 'items',
							key: '_id',
							from: 'itemId',
							field: 'description',
						}),
					}),
				itemId: one('items'),
				quantity: z.number().default(1).meta({ min: 1, max: 50 }),
				unitPrice: z.number().default(0).meta({ min: 10, max: 500 }),
				lineAmount: z.number().default(0).meta({ min: 10, max: 5000 }),
			}),
			seed: { min: 1, max: 4, perParent: true, parentTable: 'carts' },
		})
			.table()
			.index('cartLines_cartId_idx', ['cartId'])
			.index('cartLines_itemId_idx', ['itemId'])
			.computed((row) => ({
				calculatedAmount: row.quantity * row.unitPrice,
			})),

		// =====================================================================
		// Insight
		// =====================================================================
		locations: createTable('locations', {
			schema: {
				code: z.string(),
				name: z.string().meta({ field: 'company.name' }),
				type: z
					.enum(['WAREHOUSE', 'STORE', 'DISTRIBUTION_CENTER'])
					.default('WAREHOUSE'),
				address: z.string().optional().meta({ type: 'address' }),
				city: z.string().optional().meta({ type: 'city' }),
				country: z.string().optional().meta({ type: 'country' }),
				latitude: z
					.number()
					.min(-56)
					.max(72)
					.optional()
					.meta({ min: -56, max: 72 }),
				longitude: z
					.number()
					.min(-170)
					.max(-34)
					.optional()
					.meta({ min: -170, max: -34 }),
				active: z.boolean().default(true),

				itemCount: z
					.number()
					.default(0)
					.meta({
						flowField: flowField({
							type: 'count',
							source: 'itemLedgerEntries',
							key: 'locationCode',
							from: 'code',
						}),
					}),
			},
			seed: SUPPORTING_SEED,
			noSeries: { pattern: 'LOC0001', field: 'code' },
		})
			.table()
			.index('locations_code_idx', ['code']),

		itemLedgerEntries: createTable('itemLedgerEntries', {
			schema: (one) => ({
				entryNo: z.number().default(0),
				entryType: z
					.enum([
						'SALE',
						'PURCHASE',
						'POSITIVE_ADJUSTMENT',
						'NEGATIVE_ADJUSTMENT',
						'TRANSFER',
					])
					.default('PURCHASE'),
				itemId: one('items'),
				itemDescription: z
					.string()
					.optional()
					.meta({
						flowField: flowField({
							type: 'lookup',
							source: 'items',
							key: '_id',
							from: 'itemId',
							field: 'description',
						}),
					}),
				locationCode: z.string().optional(),
				postingDate: z.string().optional().meta({ type: 'datetime' }),
				quantity: z.number().default(0).meta({ min: 1, max: 50 }),
				remainingQty: z.number().default(0),
				open: z.boolean().default(true),
				sourceDocumentType: z.string().optional(),
				sourceDocumentNo: z.string().optional(),
			}),
			seed: ENTITY_SEED,
		})
			.table()
			.index('itemLedgerEntries_itemId_idx', ['itemId'])
			.index('itemLedgerEntries_locationCode_idx', ['locationCode']),

		valueEntries: createTable('valueEntries', {
			schema: (one) => ({
				entryNo: z.number().default(0),
				itemLedgerEntryId: one('itemLedgerEntries'),
				itemId: one('items'),
				itemDescription: z
					.string()
					.optional()
					.meta({
						flowField: flowField({
							type: 'lookup',
							source: 'items',
							key: '_id',
							from: 'itemId',
							field: 'description',
						}),
					}),
				postingDate: z.string().optional().meta({ type: 'datetime' }),
				entryType: z
					.enum([
						'DIRECT_COST',
						'REVALUATION',
						'ROUNDING',
						'INDIRECT_COST',
						'VARIANCE',
					])
					.default('DIRECT_COST'),
				costAmountActual: z.number().default(0).meta({ min: 0, max: 10000 }),
				salesAmountActual: z.number().default(0).meta({ min: 0, max: 10000 }),
				costPerUnit: z.number().default(0).meta({ min: 5, max: 300 }),
			}),
			seed: {
				min: 1,
				max: 2,
				perParent: true,
				parentTable: 'itemLedgerEntries',
			},
		})
			.table()
			.index('valueEntries_itemLedgerEntryId_idx', ['itemLedgerEntryId'])
			.index('valueEntries_itemId_idx', ['itemId']),

		// =====================================================================
		// Replenishment
		// =====================================================================
		vendors: createTable('vendors', {
			schema: {
				vendorNo: z.string(),
				name: z.string().meta({ type: 'company' }),
				contactName: z.string().optional().meta({ type: 'fullname' }),
				email: z.string().optional().meta({ type: 'email' }),
				phone: z.string().optional().meta({ type: 'phone' }),
				address: z.string().optional().meta({ type: 'address' }),
				city: z.string().optional().meta({ type: 'city' }),
				country: z.string().optional().meta({ type: 'country' }),
				currency: z
					.string()
					.default('USD')
					.meta({ field: 'finance.currencyCode' }),
				blocked: z.boolean().default(false),

				purchaseOrderCount: z
					.number()
					.default(0)
					.meta({
						flowField: flowField({
							type: 'count',
							source: 'purchaseHeaders',
							key: 'vendorId',
						}),
					}),
				totalBalance: z
					.number()
					.default(0)
					.meta({
						flowField: flowField({
							type: 'sum',
							source: 'purchaseHeaders',
							key: 'vendorId',
							field: 'totalAmount',
						}),
					}),
			},
			seed: ENTITY_SEED,
			noSeries: { pattern: 'VEND0000001', field: 'vendorNo' },
		})
			.table()
			.index('vendors_vendorNo_idx', ['vendorNo']),

		purchaseHeaders: createTable('purchaseHeaders', {
			schema: (one) => ({
				documentNo: z.string(),
				documentType: z
					.enum(['ORDER', 'RETURN_ORDER', 'QUOTE'])
					.default('ORDER'),
				status: z.enum(DOCUMENT_APPROVAL_STATUSES).default('DRAFT'),
				vendorId: one('vendors'),
				vendorName: z
					.string()
					.optional()
					.meta({
						flowField: flowField({
							type: 'lookup',
							source: 'vendors',
							key: '_id',
							from: 'vendorId',
							field: 'name',
						}),
					}),
				orderDate: z.string().optional().meta({ type: 'datetime' }),
				expectedReceiptDate: z.string().optional().meta({ type: 'datetime' }),
				currency: z
					.string()
					.default('USD')
					.meta({ field: 'finance.currencyCode' }),
				statusReason: z.string().optional(),
				statusUpdatedAt: z.date().optional(),
				idempotencyKey: z.string().optional(),

				lineCount: z
					.number()
					.default(0)
					.meta({
						flowField: flowField({
							type: 'count',
							source: 'purchaseLines',
							key: 'documentNo',
							from: 'documentNo',
						}),
					}),
				totalAmount: z
					.number()
					.default(0)
					.meta({
						flowField: flowField({
							type: 'sum',
							source: 'purchaseLines',
							key: 'documentNo',
							from: 'documentNo',
							field: 'lineAmount',
						}),
					}),
			}),
			seed: DOCUMENT_SEED,
			noSeries: { pattern: 'PO0000001', field: 'documentNo' },
		})
			.table()
			.index('purchaseHeaders_vendorId_idx', ['vendorId'])
			.index('purchaseHeaders_status_idx', ['status'])
			.index('purchaseHeaders_idempotencyKey_idx', ['idempotencyKey']),

		purchaseLines: createTable('purchaseLines', {
			schema: (one) => ({
				documentNo: one('purchaseHeaders'),
				lineNo: z.number().default(0),
				itemId: one('items'),
				description: z
					.string()
					.optional()
					.meta({
						flowField: flowField({
							type: 'lookup',
							source: 'items',
							key: '_id',
							from: 'itemId',
							field: 'description',
						}),
					}),
				quantity: z.number().default(0).meta({ min: 1, max: 50 }),
				unitCost: z.number().default(0).meta({ min: 5, max: 300 }),
				lineAmount: z.number().default(0).meta({ min: 10, max: 5000 }),
				quantityReceived: z.number().default(0),
				quantityInvoiced: z.number().default(0),
			}),
			seed: { min: 2, max: 5, perParent: true, parentTable: 'purchaseHeaders' },
		})
			.table()
			.index('purchaseLines_documentNo_idx', ['documentNo'])
			.index('purchaseLines_itemId_idx', ['itemId'])
			.computed((row) => ({
				calculatedAmount: row.quantity * row.unitCost,
				outstandingQty: row.quantity - row.quantityReceived,
			})),

		purchaseReceipts: createTable('purchaseReceipts', {
			schema: (one) => ({
				receiptNo: z.string(),
				purchaseOrderNo: one('purchaseHeaders'),
				purchaseLineId: one('purchaseLines'),
				itemId: one('items'),
				receiptDate: z.string().optional().meta({ type: 'datetime' }),
				quantityReceived: z.number().default(0).meta({ min: 0, max: 5000 }),
				receivedByUserId: z.string().optional(),
			}),
			seed: false,
			noSeries: { pattern: 'PRC0000001', field: 'receiptNo' },
		})
			.table()
			.index('purchaseReceipts_purchaseOrderNo_idx', ['purchaseOrderNo'])
			.index('purchaseReceipts_purchaseLineId_idx', ['purchaseLineId']),

		purchaseInvoiceHeaders: createTable('purchaseInvoiceHeaders', {
			schema: (one) => ({
				invoiceNo: z.string(),
				status: z.enum(POSTING_STATUSES).default('DRAFT'),
				vendorId: one('vendors'),
				vendorName: z
					.string()
					.optional()
					.meta({
						flowField: flowField({
							type: 'lookup',
							source: 'vendors',
							key: '_id',
							from: 'vendorId',
							field: 'name',
						}),
					}),
				purchaseOrderNo: one('purchaseHeaders'),
				postingDate: z.string().optional().meta({ type: 'datetime' }),
				dueDate: z.string().optional().meta({ type: 'datetime' }),
				currency: z
					.string()
					.default('USD')
					.meta({ field: 'finance.currencyCode' }),
				statusReason: z.string().optional(),
				statusUpdatedAt: z.date().optional(),

				lineCount: z
					.number()
					.default(0)
					.meta({
						flowField: flowField({
							type: 'count',
							source: 'purchaseInvoiceLines',
							key: 'invoiceNo',
							from: 'invoiceNo',
						}),
					}),
				totalAmount: z
					.number()
					.default(0)
					.meta({
						flowField: flowField({
							type: 'sum',
							source: 'purchaseInvoiceLines',
							key: 'invoiceNo',
							from: 'invoiceNo',
							field: 'lineAmount',
						}),
					}),
			}),
			seed: false,
			noSeries: { pattern: 'PINV0000001', field: 'invoiceNo' },
		})
			.table()
			.index('purchaseInvoiceHeaders_vendorId_idx', ['vendorId'])
			.index('purchaseInvoiceHeaders_status_idx', ['status'])
			.index('purchaseInvoiceHeaders_purchaseOrderNo_idx', ['purchaseOrderNo']),

		purchaseInvoiceLines: createTable('purchaseInvoiceLines', {
			schema: (one) => ({
				invoiceNo: one('purchaseInvoiceHeaders'),
				lineNo: z.number().default(0),
				itemId: one('items'),
				itemDescription: z
					.string()
					.optional()
					.meta({
						flowField: flowField({
							type: 'lookup',
							source: 'items',
							key: '_id',
							from: 'itemId',
							field: 'description',
						}),
					}),
				purchaseLineId: one('purchaseLines'),
				quantity: z.number().default(0).meta({ min: 1, max: 5000 }),
				unitCost: z.number().default(0).meta({ min: 0, max: 5000 }),
				lineAmount: z.number().default(0).meta({ min: 0, max: 500000 }),
			}),
			seed: false,
		})
			.table()
			.index('purchaseInvoiceLines_invoiceNo_idx', ['invoiceNo'])
			.index('purchaseInvoiceLines_itemId_idx', ['itemId'])
			.index('purchaseInvoiceLines_purchaseLineId_idx', ['purchaseLineId']),

		vendorLedgerEntries: createTable('vendorLedgerEntries', {
			schema: (one) => ({
				entryNo: z.number().default(0),
				vendorId: one('vendors'),
				vendorName: z
					.string()
					.optional()
					.meta({
						flowField: flowField({
							type: 'lookup',
							source: 'vendors',
							key: '_id',
							from: 'vendorId',
							field: 'name',
						}),
					}),
				postingDate: z.string().optional().meta({ type: 'datetime' }),
				documentType: z
					.enum(['INVOICE', 'PAYMENT', 'CREDIT_MEMO'])
					.default('INVOICE'),
				documentNo: z.string(),
				description: z.string().optional(),
				amount: z.number().default(0),
				remainingAmount: z.number().default(0),
				open: z.boolean().default(true),
				currency: z
					.string()
					.default('USD')
					.meta({ field: 'finance.currencyCode' }),
			}),
			seed: false,
		})
			.table()
			.index('vendorLedgerEntries_vendorId_idx', ['vendorId'])
			.index('vendorLedgerEntries_documentNo_idx', ['documentNo']),

		detailedVendorLedgerEntries: createTable('detailedVendorLedgerEntries', {
			schema: (one) => ({
				entryNo: z.number().default(0),
				vendorLedgerEntryId: one('vendorLedgerEntries'),
				postingDate: z.string().optional().meta({ type: 'datetime' }),
				documentType: z
					.enum(['INVOICE', 'PAYMENT', 'CREDIT_MEMO'])
					.default('INVOICE'),
				documentNo: z.string(),
				description: z.string().optional(),
				amount: z.number().default(0),
				unapplied: z.boolean().default(true),
			}),
			seed: false,
		})
			.table()
			.index('detailedVendorLedgerEntries_vendorLedgerEntryId_idx', [
				'vendorLedgerEntryId',
			])
			.index('detailedVendorLedgerEntries_documentNo_idx', ['documentNo']),

		transferHeaders: createTable('transferHeaders', {
			schema: {
				transferNo: z.string(),
				status: z.enum(TRANSFER_STATUSES).default('DRAFT'),
				fromLocationCode: z.string(),
				toLocationCode: z.string(),
				shipmentDate: z.string().optional().meta({ type: 'datetime' }),
				receiptDate: z.string().optional().meta({ type: 'datetime' }),
				statusReason: z.string().optional(),
				statusUpdatedAt: z.date().optional(),

				lineCount: z
					.number()
					.default(0)
					.meta({
						flowField: flowField({
							type: 'count',
							source: 'transferLines',
							key: 'transferNo',
							from: 'transferNo',
						}),
					}),
			},
			seed: DOCUMENT_SEED,
			noSeries: { pattern: 'TR0000001', field: 'transferNo' },
		})
			.table()
			.index('transferHeaders_status_idx', ['status']),

		transferLines: createTable('transferLines', {
			schema: (one) => ({
				transferNo: one('transferHeaders'),
				lineNo: z.number().default(0),
				itemId: one('items'),
				description: z
					.string()
					.optional()
					.meta({
						flowField: flowField({
							type: 'lookup',
							source: 'items',
							key: '_id',
							from: 'itemId',
							field: 'description',
						}),
					}),
				quantity: z.number().default(0).meta({ min: 1, max: 50 }),
				quantityShipped: z.number().default(0),
				quantityReceived: z.number().default(0),
			}),
			seed: { min: 1, max: 4, perParent: true, parentTable: 'transferHeaders' },
		})
			.table()
			.index('transferLines_transferNo_idx', ['transferNo'])
			.index('transferLines_itemId_idx', ['itemId'])
			.computed((row) => ({
				outstandingQty: row.quantity - row.quantityShipped,
			})),

		// =====================================================================
		// Ledger
		// =====================================================================
		salesInvoiceHeaders: createTable('salesInvoiceHeaders', {
			schema: (one) => ({
				invoiceNo: z.string(),
				status: z.enum(SALES_INVOICE_STATUSES).default('DRAFT'),
				eInvoiceStatus: z.enum(E_INVOICE_STATUSES).default('DRAFT'),
				customerId: one('customers'),
				customerName: z
					.string()
					.optional()
					.meta({
						flowField: flowField({
							type: 'lookup',
							source: 'customers',
							key: '_id',
							from: 'customerId',
							field: 'name',
						}),
					}),
				salesOrderNo: z.string().optional(),
				postingDate: z.string().optional().meta({ type: 'datetime' }),
				dueDate: z.string().optional().meta({ type: 'datetime' }),
				currency: z
					.string()
					.default('USD')
					.meta({ field: 'finance.currencyCode' }),
				taxJurisdiction: z.string().optional(),
				taxRegistrationNo: z.string().optional(),
				statusReason: z.string().optional(),
				statusUpdatedAt: z.date().optional(),

				lineCount: z
					.number()
					.default(0)
					.meta({
						flowField: flowField({
							type: 'count',
							source: 'salesInvoiceLines',
							key: 'invoiceNo',
							from: 'invoiceNo',
						}),
					}),
				totalAmount: z
					.number()
					.default(0)
					.meta({
						flowField: flowField({
							type: 'sum',
							source: 'salesInvoiceLines',
							key: 'invoiceNo',
							from: 'invoiceNo',
							field: 'lineAmount',
						}),
					}),
				totalTaxAmount: z
					.number()
					.default(0)
					.meta({
						flowField: flowField({
							type: 'sum',
							source: 'salesInvoiceLines',
							key: 'invoiceNo',
							from: 'invoiceNo',
							field: 'taxAmount',
						}),
					}),
			}),
			seed: DOCUMENT_SEED,
			noSeries: { pattern: 'SINV0000001', field: 'invoiceNo' },
		})
			.table()
			.index('salesInvoiceHeaders_customerId_idx', ['customerId'])
			.index('salesInvoiceHeaders_status_idx', ['status'])
			.index('salesInvoiceHeaders_eInvoiceStatus_idx', ['eInvoiceStatus']),

		salesInvoiceLines: createTable('salesInvoiceLines', {
			schema: (one) => ({
				invoiceNo: one('salesInvoiceHeaders'),
				lineNo: z.number().default(0),
				itemId: one('items'),
				itemDescription: z
					.string()
					.optional()
					.meta({
						flowField: flowField({
							type: 'lookup',
							source: 'items',
							key: '_id',
							from: 'itemId',
							field: 'description',
						}),
					}),
				quantity: z.number().default(0).meta({ min: 1, max: 50 }),
				unitPrice: z.number().default(0).meta({ min: 10, max: 500 }),
				lineAmount: z.number().default(0).meta({ min: 10, max: 5000 }),
				taxCode: z.string().optional(),
				taxRatePercent: z.number().default(0).meta({ min: 0, max: 100 }),
				taxAmount: z.number().default(0).meta({ min: 0, max: 5000 }),
			}),
			seed: {
				min: 2,
				max: 4,
				perParent: true,
				parentTable: 'salesInvoiceHeaders',
			},
		})
			.table()
			.index('salesInvoiceLines_invoiceNo_idx', ['invoiceNo'])
			.index('salesInvoiceLines_itemId_idx', ['itemId'])
			.computed((row) => ({
				calculatedAmount: row.quantity * row.unitPrice,
				calculatedTax: row.lineAmount * (row.taxRatePercent / 100),
			})),

		salesCreditMemoHeaders: createTable('salesCreditMemoHeaders', {
			schema: (one) => ({
				creditMemoNo: z.string(),
				status: z.enum(POSTING_STATUSES).default('DRAFT'),
				eInvoiceStatus: z.enum(E_INVOICE_STATUSES).default('DRAFT'),
				customerId: one('customers'),
				customerName: z
					.string()
					.optional()
					.meta({
						flowField: flowField({
							type: 'lookup',
							source: 'customers',
							key: '_id',
							from: 'customerId',
							field: 'name',
						}),
					}),
				appliesToInvoiceNo: z.string().optional(),
				postingDate: z.string().optional().meta({ type: 'datetime' }),
				currency: z
					.string()
					.default('USD')
					.meta({ field: 'finance.currencyCode' }),
				taxJurisdiction: z.string().optional(),
				taxRegistrationNo: z.string().optional(),
				statusReason: z.string().optional(),
				statusUpdatedAt: z.date().optional(),

				lineCount: z
					.number()
					.default(0)
					.meta({
						flowField: flowField({
							type: 'count',
							source: 'salesCreditMemoLines',
							key: 'creditMemoNo',
							from: 'creditMemoNo',
						}),
					}),
				totalAmount: z
					.number()
					.default(0)
					.meta({
						flowField: flowField({
							type: 'sum',
							source: 'salesCreditMemoLines',
							key: 'creditMemoNo',
							from: 'creditMemoNo',
							field: 'lineAmount',
						}),
					}),
				totalTaxAmount: z
					.number()
					.default(0)
					.meta({
						flowField: flowField({
							type: 'sum',
							source: 'salesCreditMemoLines',
							key: 'creditMemoNo',
							from: 'creditMemoNo',
							field: 'taxAmount',
						}),
					}),
			}),
			seed: false,
			noSeries: { pattern: 'SCM0000001', field: 'creditMemoNo' },
		})
			.table()
			.index('salesCreditMemoHeaders_customerId_idx', ['customerId'])
			.index('salesCreditMemoHeaders_status_idx', ['status'])
			.index('salesCreditMemoHeaders_eInvoiceStatus_idx', ['eInvoiceStatus']),

		salesCreditMemoLines: createTable('salesCreditMemoLines', {
			schema: (one) => ({
				creditMemoNo: one('salesCreditMemoHeaders'),
				lineNo: z.number().default(0),
				itemId: one('items'),
				itemDescription: z
					.string()
					.optional()
					.meta({
						flowField: flowField({
							type: 'lookup',
							source: 'items',
							key: '_id',
							from: 'itemId',
							field: 'description',
						}),
					}),
				quantity: z.number().default(0).meta({ min: 1, max: 50 }),
				unitPrice: z.number().default(0).meta({ min: 10, max: 500 }),
				lineAmount: z.number().default(0).meta({ min: 0, max: 5000 }),
				taxCode: z.string().optional(),
				taxRatePercent: z.number().default(0).meta({ min: 0, max: 100 }),
				taxAmount: z.number().default(0).meta({ min: 0, max: 5000 }),
			}),
			seed: false,
		})
			.table()
			.index('salesCreditMemoLines_creditMemoNo_idx', ['creditMemoNo'])
			.index('salesCreditMemoLines_itemId_idx', ['itemId'])
			.computed((row) => ({
				calculatedAmount: row.quantity * row.unitPrice,
				calculatedTax: row.lineAmount * (row.taxRatePercent / 100),
			})),

		eInvoiceSubmissions: createTable('eInvoiceSubmissions', {
			schema: {
				submissionNo: z.string(),
				documentType: z.enum(['INVOICE', 'CREDIT_MEMO']),
				documentNo: z.string(),
				documentId: z.string(),
				status: z.enum(E_INVOICE_STATUSES).default('DRAFT'),
				attemptNo: z.number().default(1),
				submittedAt: z.string().optional().meta({ type: 'datetime' }),
				respondedAt: z.string().optional().meta({ type: 'datetime' }),
				lastError: z.string().optional(),
				providerRef: z.string().optional(),
				payloadHash: z.string().optional(),
			},
			seed: false,
			noSeries: { pattern: 'EINV0000001', field: 'submissionNo' },
		})
			.table()
			.unique('eInvoiceSubmissions_doc_attempt_uq', [
				'documentType',
				'documentNo',
				'attemptNo',
			])
			.index('eInvoiceSubmissions_document_idx', ['documentType', 'documentNo'])
			.index('eInvoiceSubmissions_status_idx', ['status']),

		eInvoiceEvents: createTable('eInvoiceEvents', {
			schema: (one) => ({
				submissionId: one('eInvoiceSubmissions'),
				eventType: z.enum([
					'CREATED',
					'SUBMITTED',
					'ACCEPTED',
					'REJECTED',
					'RETRIED',
					'CANCELED',
				]),
				eventAt: z.string().optional().meta({ type: 'datetime' }),
				message: z.string().optional(),
				metadataJson: z.string().optional(),
			}),
			seed: false,
		})
			.table()
			.index('eInvoiceEvents_submissionId_idx', ['submissionId'])
			.index('eInvoiceEvents_eventType_idx', ['eventType']),

		custLedgerEntries: createTable('custLedgerEntries', {
			schema: (one) => ({
				entryNo: z.number().default(0),
				customerId: one('customers'),
				customerName: z
					.string()
					.optional()
					.meta({
						flowField: flowField({
							type: 'lookup',
							source: 'customers',
							key: '_id',
							from: 'customerId',
							field: 'name',
						}),
					}),
				postingDate: z.string().optional().meta({ type: 'datetime' }),
				documentType: z
					.enum(['INVOICE', 'CREDIT_MEMO', 'PAYMENT'])
					.default('INVOICE'),
				documentNo: z.string().optional(),
				description: z
					.string()
					.optional()
					.meta({ field: 'finance.transactionDescription' }),
				amount: z.number().default(0).meta({ min: -5000, max: 5000 }),
				remainingAmount: z.number().default(0).meta({ min: 0, max: 5000 }),
				open: z.boolean().default(true),
				currency: z
					.string()
					.default('USD')
					.meta({ field: 'finance.currencyCode' }),
			}),
			seed: ENTITY_SEED,
		})
			.table()
			.index('custLedgerEntries_customerId_idx', ['customerId'])
			.index('custLedgerEntries_documentNo_idx', ['documentNo']),

		glEntries: createTable('glEntries', {
			schema: {
				entryNo: z.number().default(0),
				postingDate: z.string().optional().meta({ type: 'datetime' }),
				accountNo: z.string().meta({ field: 'finance.accountNumber' }),
				accountName: z
					.string()
					.optional()
					.meta({ field: 'finance.accountName' }),
				documentType: z.string().optional(),
				documentNo: z.string().optional(),
				description: z
					.string()
					.optional()
					.meta({ field: 'finance.transactionDescription' }),
				debitAmount: z.number().default(0).meta({ min: 0, max: 10000 }),
				creditAmount: z.number().default(0).meta({ min: 0, max: 10000 }),
			},
			seed: ENTITY_SEED,
		})
			.table()
			.index('glEntries_accountNo_idx', ['accountNo'])
			.index('glEntries_documentNo_idx', ['documentNo'])
			.computed((row) => ({
				netAmount: row.debitAmount - row.creditAmount,
			})),

		// =====================================================================
		// Flow
		// =====================================================================
		bankAccounts: createTable('bankAccounts', {
			schema: {
				accountNo: z.string(),
				name: z.string().meta({ field: 'finance.accountName' }),
				bankName: z.string().optional().meta({ field: 'company.name' }),
				iban: z.string().default(() => crypto.randomUUID()),
				swiftCode: z.string().optional().meta({ field: 'finance.bic' }),
				currency: z
					.string()
					.default('USD')
					.meta({ field: 'finance.currencyCode' }),
				status: z.enum(BANK_ACCOUNT_STATUSES).default('ACTIVE'),
				lastSyncAt: z.date().optional(),

				entryCount: z
					.number()
					.default(0)
					.meta({
						flowField: flowField({
							type: 'count',
							source: 'bankAccountLedgerEntries',
							key: 'bankAccountId',
						}),
					}),
				currentBalance: z
					.number()
					.default(0)
					.meta({
						flowField: flowField({
							type: 'sum',
							source: 'bankAccountLedgerEntries',
							key: 'bankAccountId',
							field: 'amount',
						}),
					}),
			},
			seed: SUPPORTING_SEED,
			noSeries: { pattern: 'BANK0000001', field: 'accountNo' },
		})
			.table()
			.index('bankAccounts_accountNo_idx', ['accountNo'])
			.index('bankAccounts_status_idx', ['status'])
			.unique('bankAccounts_iban_uq', ['iban']),

		bankAccountLedgerEntries: createTable('bankAccountLedgerEntries', {
			schema: (one) => ({
				entryNo: z.number().default(0),
				bankAccountId: one('bankAccounts'),
				bankAccountName: z
					.string()
					.optional()
					.meta({
						flowField: flowField({
							type: 'lookup',
							source: 'bankAccounts',
							key: '_id',
							from: 'bankAccountId',
							field: 'name',
						}),
					}),
				postingDate: z.string().optional().meta({ type: 'datetime' }),
				documentType: z
					.enum(['PAYMENT', 'REFUND', 'TRANSFER', 'ADJUSTMENT', 'PAYROLL'])
					.default('PAYMENT'),
				documentNo: z.string().optional(),
				description: z
					.string()
					.optional()
					.meta({ field: 'finance.transactionDescription' }),
				debitAmount: z.number().default(0).meta({ min: 0, max: 10000 }),
				creditAmount: z.number().default(0).meta({ min: 0, max: 10000 }),
				amount: z.number().default(0).meta({ min: -5000, max: 5000 }),
				reconciliationStatus: z.enum(RECONCILIATION_STATUSES).default('OPEN'),
				statusReason: z.string().optional(),
				statusUpdatedAt: z.date().optional(),
				open: z.boolean().default(true),
			}),
			seed: {
				min: 3,
				max: 7,
				perParent: true,
				parentTable: 'bankAccounts',
			},
		})
			.table()
			.index('bankAccountLedgerEntries_bankAccountId_idx', ['bankAccountId'])
			.index('bankAccountLedgerEntries_documentNo_idx', ['documentNo'])
			.index('bankAccountLedgerEntries_reconciliationStatus_idx', [
				'reconciliationStatus',
			])
			.computed((row) => ({
				netAmount: row.creditAmount - row.debitAmount,
			})),

		genJournalLines: createTable('genJournalLines', {
			schema: {
				journalTemplate: z.string().default('GENERAL'),
				journalBatch: z.string().default('DEFAULT'),
				lineNo: z.number().default(0),
				postingDate: z.string().optional().meta({ type: 'datetime' }),
				documentType: z
					.enum([
						'PAYMENT',
						'INVOICE',
						'REFUND',
						'TRANSFER',
						'PAYROLL',
						'ADJUSTMENT',
					])
					.default('PAYMENT'),
				documentNo: z.string().optional(),
				accountType: z
					.enum([
						'GL_ACCOUNT',
						'BANK_ACCOUNT',
						'CUSTOMER',
						'VENDOR',
						'EMPLOYEE',
					])
					.default('GL_ACCOUNT'),
				accountNo: z.string().meta({ field: 'finance.accountNumber' }),
				balancingAccountType: z
					.enum([
						'GL_ACCOUNT',
						'BANK_ACCOUNT',
						'CUSTOMER',
						'VENDOR',
						'EMPLOYEE',
					])
					.optional(),
				balancingAccountNo: z.string().optional(),
				description: z
					.string()
					.optional()
					.meta({ field: 'finance.transactionDescription' }),
				debitAmount: z.number().default(0).meta({ min: 0, max: 10000 }),
				creditAmount: z.number().default(0).meta({ min: 0, max: 10000 }),
				status: z.enum(JOURNAL_LINE_STATUSES).default('OPEN'),
				statusReason: z.string().optional(),
				statusUpdatedAt: z.date().optional(),
				sourceModule: z.string().default('FLOW'),
			},
			seed: ENTITY_SEED,
		})
			.table()
			.index('genJournalLines_status_idx', ['status'])
			.index('genJournalLines_documentNo_idx', ['documentNo'])
			.index('genJournalLines_accountNo_idx', ['accountNo'])
			.computed((row) => ({
				netAmount: row.debitAmount - row.creditAmount,
			})),

		// =====================================================================
		// Payroll
		// =====================================================================
		employees: createTable('employees', {
			schema: {
				employeeNo: z.string(),
				firstName: z.string().meta({ type: 'firstname' }),
				lastName: z.string().meta({ type: 'lastname' }),
				email: z.string().optional().meta({ type: 'email' }),
				phone: z.string().optional().meta({ type: 'phone' }),
				department: z
					.string()
					.optional()
					.meta({ field: 'commerce.department' }),
				jobTitle: z.string().optional().meta({ type: 'job_title' }),
				employmentType: z
					.enum(['FULL_TIME', 'PART_TIME', 'CONTRACTOR', 'TEMPORARY'])
					.default('FULL_TIME'),
				status: z.enum(EMPLOYEE_STATUSES).default('ACTIVE'),
				hireDate: z.string().optional().meta({ type: 'datetime' }),
				terminationDate: z.string().optional(),
				taxId: z.string().optional(),
				baseSalary: z.number().default(0).meta({ min: 30000, max: 150000 }),
				payFrequency: z
					.enum(['WEEKLY', 'BIWEEKLY', 'SEMI_MONTHLY', 'MONTHLY'])
					.default('MONTHLY'),
				bankAccountId: z.string().optional(),

				ledgerEntryCount: z
					.number()
					.default(0)
					.meta({
						flowField: flowField({
							type: 'count',
							source: 'employeeLedgerEntries',
							key: 'employeeId',
						}),
					}),
				outstandingAmount: z
					.number()
					.default(0)
					.meta({
						flowField: flowField({
							type: 'sum',
							source: 'employeeLedgerEntries',
							key: 'employeeId',
							field: 'remainingAmount',
						}),
					}),
			},
			seed: ENTITY_SEED,
			noSeries: { pattern: 'EMP0000001', field: 'employeeNo' },
		})
			.table()
			.index('employees_employeeNo_idx', ['employeeNo'])
			.index('employees_status_idx', ['status'])
			.index('employees_department_idx', ['department']),

		employeeLedgerEntries: createTable('employeeLedgerEntries', {
			schema: (one) => ({
				entryNo: z.number().default(0),
				employeeId: one('employees'),
				employeeName: z
					.string()
					.optional()
					.meta({
						flowField: flowField({
							type: 'lookup',
							source: 'employees',
							key: '_id',
							from: 'employeeId',
							field: 'firstName',
						}),
					}),
				postingDate: z.string().optional().meta({ type: 'datetime' }),
				documentType: z
					.enum(['PAYROLL', 'ADJUSTMENT', 'PAYMENT', 'BENEFIT'])
					.default('PAYROLL'),
				documentNo: z.string().optional(),
				description: z
					.string()
					.optional()
					.meta({ field: 'finance.transactionDescription' }),
				amount: z.number().default(0).meta({ min: -5000, max: 5000 }),
				remainingAmount: z.number().default(0).meta({ min: 0, max: 5000 }),
				currency: z
					.string()
					.default('USD')
					.meta({ field: 'finance.currencyCode' }),
				open: z.boolean().default(true),
				payrollPeriod: z.string().optional(),
			}),
			seed: {
				min: 2,
				max: 5,
				perParent: true,
				parentTable: 'employees',
			},
		})
			.table()
			.index('employeeLedgerEntries_employeeId_idx', ['employeeId'])
			.index('employeeLedgerEntries_documentNo_idx', ['documentNo'])
			.computed((row) => ({
				isSettled: row.remainingAmount <= 0,
			})),

		payrollRuleSets: createTable('payrollRuleSets', {
			schema: {
				code: z.string(),
				name: z.string().meta({ type: 'sentence' }),
				jurisdiction: z.string().default('US-DEFAULT'),
				defaultTaxPercent: z.number().default(20),
				active: z.boolean().default(true),
				effectiveFrom: z.string().optional().meta({ type: 'datetime' }),
				effectiveTo: z.string().optional().meta({ type: 'datetime' }),
				versionNo: z.number().default(1),
			},
			seed: false,
			noSeries: { pattern: 'PRS000001', field: 'code' },
		})
			.table()
			.index('payrollRuleSets_active_idx', ['active'])
			.index('payrollRuleSets_jurisdiction_idx', ['jurisdiction']),

		payrollTaxBrackets: createTable('payrollTaxBrackets', {
			schema: (one) => ({
				rulesetId: one('payrollRuleSets'),
				lowerBound: z.number().default(0),
				upperBound: z.number().optional(),
				ratePercent: z.number().default(0),
				baseTax: z.number().default(0),
				priority: z.number().default(0),
			}),
			seed: false,
		})
			.table()
			.index('payrollTaxBrackets_rulesetId_idx', ['rulesetId']),

		payrollDeductionRules: createTable('payrollDeductionRules', {
			schema: (one) => ({
				rulesetId: one('payrollRuleSets'),
				code: z.string(),
				name: z.string().meta({ type: 'sentence' }),
				phase: z.enum(['PRE_TAX', 'POST_TAX']).default('POST_TAX'),
				fixedAmount: z.number().default(0),
				percentOfGross: z.number().default(0),
				active: z.boolean().default(true),
				priority: z.number().default(0),
			}),
			seed: false,
		})
			.table()
			.index('payrollDeductionRules_rulesetId_idx', ['rulesetId'])
			.index('payrollDeductionRules_active_idx', ['active']),

		payrollRuns: createTable('payrollRuns', {
			schema: (one) => ({
				runNo: z.string(),
				status: z.enum(PAYROLL_RUN_STATUSES).default('DRAFT'),
				periodStart: z.string().optional().meta({ type: 'datetime' }),
				periodEnd: z.string().optional().meta({ type: 'datetime' }),
				scopeType: z.enum(['ALL_ACTIVE', 'SELECTED']).default('ALL_ACTIVE'),
				selectedEmployeeIds: z.string().optional(),
				currency: z
					.string()
					.default('USD')
					.meta({ field: 'finance.currencyCode' }),
				rulesetId: one('payrollRuleSets').optional(),
				employeeCount: z.number().default(0),
				grossAmount: z.number().default(0),
				deductionAmount: z.number().default(0),
				netAmount: z.number().default(0),
				postedJournalCount: z.number().default(0),
				disbursementCount: z.number().default(0),
				calculationSnapshot: z.string().optional(),
				postingSummary: z.string().optional(),
				paidAt: z.string().optional().meta({ type: 'datetime' }),
				statusReason: z.string().optional(),
				statusUpdatedAt: z.date().optional(),
				adjustmentCount: z
					.number()
					.default(0)
					.meta({
						flowField: flowField({
							type: 'count',
							source: 'payrollRunAdjustments',
							key: 'runId',
						}),
					}),
				statutoryReportCount: z
					.number()
					.default(0)
					.meta({
						flowField: flowField({
							type: 'count',
							source: 'payrollRunStatutoryReports',
							key: 'runId',
						}),
					}),
			}),
			seed: SUPPORTING_SEED,
			noSeries: { pattern: 'PRUN0000001', field: 'runNo' },
		})
			.table()
			.index('payrollRuns_runNo_idx', ['runNo'])
			.index('payrollRuns_status_idx', ['status']),

		payrollRunAdjustments: createTable('payrollRunAdjustments', {
			schema: (one) => ({
				adjustmentNo: z.string(),
				runId: one('payrollRuns'),
				employeeId: one('employees'),
				adjustmentType: z
					.enum(['CORRECTION', 'BONUS', 'DEDUCTION'])
					.default('CORRECTION'),
				amountDelta: z.number().default(0),
				reason: z.string(),
				appliedAt: z.string().optional().meta({ type: 'datetime' }),
				appliedByUserId: z.string().optional(),
			}),
			seed: false,
			noSeries: { pattern: 'PADJ000001', field: 'adjustmentNo' },
		})
			.table()
			.index('payrollRunAdjustments_runId_idx', ['runId'])
			.index('payrollRunAdjustments_employeeId_idx', ['employeeId']),

		payrollRunStatutoryReports: createTable('payrollRunStatutoryReports', {
			schema: (one) => ({
				reportNo: z.string(),
				runId: one('payrollRuns'),
				reportType: z
					.enum(['TAX_SUMMARY', 'DEDUCTION_SUMMARY', 'PAYMENT_FILE'])
					.default('TAX_SUMMARY'),
				status: z.enum(STATUTORY_REPORT_STATUSES).default('GENERATED'),
				periodStart: z.string().optional().meta({ type: 'datetime' }),
				periodEnd: z.string().optional().meta({ type: 'datetime' }),
				artifactJson: z.string().default('{}'),
				generatedAt: z.string().optional().meta({ type: 'datetime' }),
				generatedByUserId: z.string().optional(),
			}),
			seed: false,
			noSeries: { pattern: 'PREPORT0001', field: 'reportNo' },
		})
			.table()
			.index('payrollRunStatutoryReports_runId_idx', ['runId'])
			.index('payrollRunStatutoryReports_reportType_idx', ['reportType']),

		// =====================================================================
		// POS
		// =====================================================================
		terminals: createTable('terminals', {
			schema: {
				terminalCode: z.string(),
				name: z.string().meta({ field: 'commerce.department' }),
				locationCode: z.string().optional(),
				status: z.enum(TERMINAL_STATUSES).default('ONLINE'),
				lastHeartbeat: z.date().optional(),

				sessionCount: z
					.number()
					.default(0)
					.meta({
						flowField: flowField({
							type: 'count',
							source: 'posSessions',
							key: 'terminalId',
						}),
					}),
			},
			seed: SUPPORTING_SEED,
			noSeries: { pattern: 'TERM001', field: 'terminalCode' },
		})
			.table()
			.index('terminals_terminalCode_idx', ['terminalCode']),

		posSessions: createTable('posSessions', {
			schema: (one) => ({
				sessionNo: z.string(),
				terminalId: one('terminals'),
				terminalName: z
					.string()
					.optional()
					.meta({
						flowField: flowField({
							type: 'lookup',
							source: 'terminals',
							key: '_id',
							from: 'terminalId',
							field: 'name',
						}),
					}),
				cashierId: z.string().optional(),
				status: z.enum(POS_SESSION_STATUSES).default('OPEN'),
				openedAt: z.date().optional(),
				closedAt: z.date().optional(),
				openingBalance: z.number().default(0).meta({ min: 0, max: 50000 }),
				closingBalance: z.number().default(0).meta({ min: 0, max: 50000 }),

				transactionCount: z
					.number()
					.default(0)
					.meta({
						flowField: flowField({
							type: 'count',
							source: 'posTransactions',
							key: 'posSessionId',
						}),
					}),
				totalSales: z
					.number()
					.default(0)
					.meta({
						flowField: flowField({
							type: 'sum',
							source: 'posTransactions',
							key: 'posSessionId',
							field: 'totalAmount',
						}),
					}),
			}),
			seed: { min: 2, max: 4, perParent: true, parentTable: 'terminals' },
			noSeries: { pattern: 'SESS0000001', field: 'sessionNo' },
		})
			.table()
			.index('posSessions_terminalId_idx', ['terminalId'])
			.index('posSessions_status_idx', ['status']),

		posTransactions: createTable('posTransactions', {
			schema: (one) => ({
				receiptNo: z.string(),
				posSessionId: one('posSessions'),
				status: z.enum(POS_TRANSACTION_STATUSES).default('OPEN'),
				customerId: z.string().optional(),
				customerName: z
					.string()
					.optional()
					.meta({
						flowField: flowField({
							type: 'lookup',
							source: 'customers',
							key: '_id',
							from: 'customerId',
							field: 'name',
						}),
					}),
				totalAmount: z.number().default(0).meta({ min: 5, max: 500 }),
				taxAmount: z.number().default(0).meta({ min: 0, max: 50 }),
				discountAmount: z.number().default(0).meta({ min: 0, max: 25 }),
				paidAmount: z.number().default(0).meta({ min: 5, max: 500 }),
				paymentMethod: z
					.enum(['CASH', 'CARD', 'MOBILE', 'MIXED'])
					.default('CASH'),
				transactionAt: z.date().optional(),
				statusReason: z.string().optional(),
				statusUpdatedAt: z.date().optional(),

				lineCount: z
					.number()
					.default(0)
					.meta({
						flowField: flowField({
							type: 'count',
							source: 'posTransactionLines',
							key: 'transactionId',
						}),
					}),
			}),
			seed: { min: 3, max: 8, perParent: true, parentTable: 'posSessions' },
			noSeries: { pattern: 'RCP0000001', field: 'receiptNo' },
		})
			.table()
			.index('posTransactions_posSessionId_idx', ['posSessionId'])
			.index('posTransactions_status_idx', ['status']),

		posTransactionLines: createTable('posTransactionLines', {
			schema: (one) => ({
				transactionId: one('posTransactions'),
				lineNo: z.number().default(0),
				itemId: one('items'),
				description: z
					.string()
					.optional()
					.meta({ field: 'commerce.productName' }),
				quantity: z.number().default(1).meta({ min: 1, max: 50 }),
				unitPrice: z.number().default(0).meta({ min: 10, max: 500 }),
				lineAmount: z.number().default(0).meta({ min: 10, max: 5000 }),
				discountPercent: z.number().default(0).meta({ min: 0, max: 25 }),
			}),
			seed: { min: 1, max: 5, perParent: true, parentTable: 'posTransactions' },
		})
			.table()
			.index('posTransactionLines_transactionId_idx', ['transactionId'])
			.index('posTransactionLines_itemId_idx', ['itemId'])
			.computed((row) => ({
				calculatedAmount:
					row.quantity * row.unitPrice * (1 - row.discountPercent / 100),
			})),

		// =====================================================================
		// Trace
		// =====================================================================
		shipments: createTable('shipments', {
			schema: {
				shipmentNo: z.string(),
				status: z.enum(SHIPMENT_STATUSES).default('PLANNED'),
				sourceDocumentType: z.string().optional(),
				sourceDocumentNo: z.string().optional(),
				shipmentMethodCode: z.string().optional(),
				priority: z.enum(SHIPMENT_PRIORITY_STATUSES).default('NORMAL'),
				plannedDispatchDate: z.string().optional().meta({ type: 'datetime' }),
				plannedDeliveryDate: z.string().optional().meta({ type: 'datetime' }),
				actualDispatchDate: z.string().optional().meta({ type: 'datetime' }),
				actualDeliveryDate: z.string().optional().meta({ type: 'datetime' }),
				courierName: z.string().optional(),
				trackingNo: z.string().optional(),
				statusReason: z.string().optional(),
				statusUpdatedAt: z.date().optional(),

				lineCount: z
					.number()
					.default(0)
					.meta({
						flowField: flowField({
							type: 'count',
							source: 'shipmentLines',
							key: 'shipmentNo',
							from: 'shipmentNo',
						}),
					}),
			},
			seed: DOCUMENT_SEED,
			noSeries: { pattern: 'SHIP0000001', field: 'shipmentNo' },
		})
			.table()
			.index('shipments_status_idx', ['status'])
			.index('shipments_trackingNo_idx', ['trackingNo']),

		shipmentLines: createTable('shipmentLines', {
			schema: (one) => ({
				shipmentNo: one('shipments'),
				lineNo: z.number().default(0),
				itemId: one('items'),
				itemDescription: z
					.string()
					.optional()
					.meta({
						flowField: flowField({
							type: 'lookup',
							source: 'items',
							key: '_id',
							from: 'itemId',
							field: 'description',
						}),
					}),
				description: z
					.string()
					.optional()
					.meta({ field: 'commerce.productName' }),
				quantity: z.number().default(0).meta({ min: 1, max: 50 }),
				quantityShipped: z.number().default(0),
			}),
			seed: { min: 1, max: 4, perParent: true, parentTable: 'shipments' },
		})
			.table()
			.index('shipmentLines_shipmentNo_idx', ['shipmentNo'])
			.index('shipmentLines_itemId_idx', ['itemId'])
			.computed((row) => ({
				outstandingQty: row.quantity - row.quantityShipped,
			})),

		shipmentMethods: createTable('shipmentMethods', {
			schema: {
				code: z.string(),
				description: z.string().meta({ type: 'sentence' }),
				active: z.boolean().default(true),
			},
			seed: SUPPORTING_SEED,
			noSeries: { pattern: 'SM001', field: 'code' },
		})
			.table()
			.defaults({ tenantId: 'demo-tenant' } as Record<string, unknown>),

		carrierAccounts: createTable('carrierAccounts', {
			schema: {
				accountCode: z.string(),
				carrierCode: z.string(),
				name: z.string().meta({ type: 'sentence' }),
				active: z.boolean().default(true),
				webhookSecret: z.string().optional(),
				apiBaseUrl: z.string().optional(),
				credentialRef: z.string().optional(),
				supportsRates: z.boolean().default(true),
				supportsLabels: z.boolean().default(true),
			},
			seed: false,
			noSeries: { pattern: 'CARR000001', field: 'accountCode' },
		})
			.table()
			.index('carrierAccounts_carrierCode_idx', ['carrierCode'])
			.index('carrierAccounts_active_idx', ['active']),

		shipmentCarrierLabels: createTable('shipmentCarrierLabels', {
			schema: (one) => ({
				labelNo: z.string(),
				shipmentId: one('shipments'),
				carrierAccountId: one('carrierAccounts'),
				status: z.enum(CARRIER_LABEL_STATUSES).default('QUOTED'),
				serviceLevel: z.string().optional(),
				rateQuoteAmount: z.number().default(0),
				currency: z.string().default('USD'),
				labelUrl: z.string().optional(),
				trackingNo: z.string().optional(),
				purchasedAt: z.string().optional().meta({ type: 'datetime' }),
				errorMessage: z.string().optional(),
			}),
			seed: false,
			noSeries: { pattern: 'SLBL000001', field: 'labelNo' },
		})
			.table()
			.index('shipmentCarrierLabels_shipmentId_idx', ['shipmentId'])
			.index('shipmentCarrierLabels_carrierAccountId_idx', ['carrierAccountId'])
			.index('shipmentCarrierLabels_status_idx', ['status']),

		shipmentTrackingEvents: createTable('shipmentTrackingEvents', {
			schema: (one) => ({
				eventNo: z.string(),
				shipmentId: one('shipments'),
				carrierAccountId: one('carrierAccounts').optional(),
				carrierEventId: z.string(),
				eventType: z.string(),
				eventStatus: z.string(),
				occurredAt: z.string().optional().meta({ type: 'datetime' }),
				location: z.string().optional(),
				source: z.enum(TRACKING_EVENT_SOURCES).default('WEBHOOK'),
				exception: z.boolean().default(false),
				rawPayload: z.string().optional(),
			}),
			seed: false,
			noSeries: { pattern: 'STEV000001', field: 'eventNo' },
		})
			.table()
			.unique('shipmentTrackingEvents_shipment_event_uq', [
				'shipmentId',
				'carrierEventId',
			])
			.index('shipmentTrackingEvents_shipmentId_idx', ['shipmentId'])
			.index('shipmentTrackingEvents_carrierAccountId_idx', [
				'carrierAccountId',
			])
			.index('shipmentTrackingEvents_occurredAt_idx', ['occurredAt']),
	}),
	{
		relations: (r) => ({
			// Hub relations
			orderWorkflows: {
				steps: r.many.orderWorkflowSteps({
					from: r.orderWorkflows._id,
					to: r.orderWorkflowSteps.workflowId,
				}),
				salesOrder: r.one.salesHeaders({
					from: r.orderWorkflows.salesOrderId,
					to: r.salesHeaders._id,
				}),
				invoice: r.one.salesInvoiceHeaders({
					from: r.orderWorkflows.invoiceNo,
					to: r.salesInvoiceHeaders.invoiceNo,
				}),
				shipment: r.one.shipments({
					from: r.orderWorkflows.shipmentNo,
					to: r.shipments.shipmentNo,
				}),
				failureTask: r.one.operationTasks({
					from: r.orderWorkflows.failureTaskId,
					to: r.operationTasks._id,
				}),
				failureNotification: r.one.moduleNotifications({
					from: r.orderWorkflows.failureNotificationId,
					to: r.moduleNotifications._id,
				}),
			},
			orderWorkflowSteps: {
				workflow: r.one.orderWorkflows({
					from: r.orderWorkflowSteps.workflowId,
					to: r.orderWorkflows._id,
				}),
			},
			hubUsers: {
				roleAssignments: r.many.hubUserRoles({
					from: r.hubUsers._id,
					to: r.hubUserRoles.hubUserId,
				}),
			},
			hubRoles: {
				userAssignments: r.many.hubUserRoles({
					from: r.hubRoles._id,
					to: r.hubUserRoles.roleId,
				}),
				permissions: r.many.hubRolePermissions({
					from: r.hubRoles._id,
					to: r.hubRolePermissions.roleId,
				}),
			},
			hubPermissions: {
				roleAssignments: r.many.hubRolePermissions({
					from: r.hubPermissions._id,
					to: r.hubRolePermissions.permissionId,
				}),
			},
			hubUserRoles: {
				user: r.one.hubUsers({
					from: r.hubUserRoles.hubUserId,
					to: r.hubUsers._id,
				}),
				role: r.one.hubRoles({
					from: r.hubUserRoles.roleId,
					to: r.hubRoles._id,
				}),
			},
			hubRolePermissions: {
				role: r.one.hubRoles({
					from: r.hubRolePermissions.roleId,
					to: r.hubRoles._id,
				}),
				permission: r.one.hubPermissions({
					from: r.hubRolePermissions.permissionId,
					to: r.hubPermissions._id,
				}),
			},
			hubModuleSettings: {
				revisions: r.many.hubModuleSettingsRevisions({
					from: r.hubModuleSettings._id,
					to: r.hubModuleSettingsRevisions.settingId,
				}),
			},
			hubModuleSettingsRevisions: {
				setting: r.one.hubModuleSettings({
					from: r.hubModuleSettingsRevisions.settingId,
					to: r.hubModuleSettings._id,
				}),
			},
			scheduledJobs: {
				runs: r.many.scheduledJobRuns({
					from: r.scheduledJobs._id,
					to: r.scheduledJobRuns.jobId,
				}),
			},
			scheduledJobRuns: {
				job: r.one.scheduledJobs({
					from: r.scheduledJobRuns.jobId,
					to: r.scheduledJobs._id,
				}),
			},

			// Market relations
			salesHeaders: {
				customer: r.one.customers({
					from: r.salesHeaders.customerId,
					to: r.customers._id,
				}),
				lines: r.many.salesLines({
					from: r.salesHeaders.documentNo,
					to: r.salesLines.documentNo,
				}),
				reservations: r.many.inventoryReservations({
					from: r.salesHeaders.documentNo,
					to: r.inventoryReservations.documentNo,
				}),
			},
			salesLines: {
				header: r.one.salesHeaders({
					from: r.salesLines.documentNo,
					to: r.salesHeaders.documentNo,
				}),
				item: r.one.items({
					from: r.salesLines.itemId,
					to: r.items._id,
				}),
				reservations: r.many.inventoryReservations({
					from: r.salesLines._id,
					to: r.inventoryReservations.salesLineId,
				}),
			},
			priceRules: {
				item: r.one.items({
					from: r.priceRules.itemId,
					to: r.items._id,
				}),
				customer: r.one.customers({
					from: r.priceRules.customerId,
					to: r.customers._id,
				}),
			},
			inventoryReservations: {
				header: r.one.salesHeaders({
					from: r.inventoryReservations.documentNo,
					to: r.salesHeaders.documentNo,
				}),
				line: r.one.salesLines({
					from: r.inventoryReservations.salesLineId,
					to: r.salesLines._id,
				}),
				item: r.one.items({
					from: r.inventoryReservations.itemId,
					to: r.items._id,
				}),
			},
			carts: {
				customer: r.one.customers({
					from: r.carts.customerId,
					to: r.customers._id,
				}),
				lines: r.many.cartLines({
					from: r.carts._id,
					to: r.cartLines.cartId,
				}),
			},
			cartLines: {
				cart: r.one.carts({
					from: r.cartLines.cartId,
					to: r.carts._id,
				}),
				item: r.one.items({
					from: r.cartLines.itemId,
					to: r.items._id,
				}),
			},

			// Insight relations
			itemLedgerEntries: {
				item: r.one.items({
					from: r.itemLedgerEntries.itemId,
					to: r.items._id,
				}),
			},
			valueEntries: {
				itemLedgerEntry: r.one.itemLedgerEntries({
					from: r.valueEntries.itemLedgerEntryId,
					to: r.itemLedgerEntries._id,
				}),
				item: r.one.items({
					from: r.valueEntries.itemId,
					to: r.items._id,
				}),
			},

			// Replenishment relations
			purchaseHeaders: {
				vendor: r.one.vendors({
					from: r.purchaseHeaders.vendorId,
					to: r.vendors._id,
				}),
				lines: r.many.purchaseLines({
					from: r.purchaseHeaders.documentNo,
					to: r.purchaseLines.documentNo,
				}),
				receipts: r.many.purchaseReceipts({
					from: r.purchaseHeaders.documentNo,
					to: r.purchaseReceipts.purchaseOrderNo,
				}),
				invoices: r.many.purchaseInvoiceHeaders({
					from: r.purchaseHeaders.documentNo,
					to: r.purchaseInvoiceHeaders.purchaseOrderNo,
				}),
			},
			purchaseLines: {
				header: r.one.purchaseHeaders({
					from: r.purchaseLines.documentNo,
					to: r.purchaseHeaders.documentNo,
				}),
				item: r.one.items({
					from: r.purchaseLines.itemId,
					to: r.items._id,
				}),
				receipts: r.many.purchaseReceipts({
					from: r.purchaseLines._id,
					to: r.purchaseReceipts.purchaseLineId,
				}),
				invoiceLines: r.many.purchaseInvoiceLines({
					from: r.purchaseLines._id,
					to: r.purchaseInvoiceLines.purchaseLineId,
				}),
			},
			purchaseReceipts: {
				header: r.one.purchaseHeaders({
					from: r.purchaseReceipts.purchaseOrderNo,
					to: r.purchaseHeaders.documentNo,
				}),
				line: r.one.purchaseLines({
					from: r.purchaseReceipts.purchaseLineId,
					to: r.purchaseLines._id,
				}),
				item: r.one.items({
					from: r.purchaseReceipts.itemId,
					to: r.items._id,
				}),
			},
			purchaseInvoiceHeaders: {
				vendor: r.one.vendors({
					from: r.purchaseInvoiceHeaders.vendorId,
					to: r.vendors._id,
				}),
				order: r.one.purchaseHeaders({
					from: r.purchaseInvoiceHeaders.purchaseOrderNo,
					to: r.purchaseHeaders.documentNo,
				}),
				lines: r.many.purchaseInvoiceLines({
					from: r.purchaseInvoiceHeaders.invoiceNo,
					to: r.purchaseInvoiceLines.invoiceNo,
				}),
			},
			purchaseInvoiceLines: {
				header: r.one.purchaseInvoiceHeaders({
					from: r.purchaseInvoiceLines.invoiceNo,
					to: r.purchaseInvoiceHeaders.invoiceNo,
				}),
				item: r.one.items({
					from: r.purchaseInvoiceLines.itemId,
					to: r.items._id,
				}),
				purchaseLine: r.one.purchaseLines({
					from: r.purchaseInvoiceLines.purchaseLineId,
					to: r.purchaseLines._id,
				}),
			},
			vendors: {
				purchaseOrders: r.many.purchaseHeaders({
					from: r.vendors._id,
					to: r.purchaseHeaders.vendorId,
				}),
				purchaseInvoices: r.many.purchaseInvoiceHeaders({
					from: r.vendors._id,
					to: r.purchaseInvoiceHeaders.vendorId,
				}),
				ledgerEntries: r.many.vendorLedgerEntries({
					from: r.vendors._id,
					to: r.vendorLedgerEntries.vendorId,
				}),
			},
			vendorLedgerEntries: {
				vendor: r.one.vendors({
					from: r.vendorLedgerEntries.vendorId,
					to: r.vendors._id,
				}),
				details: r.many.detailedVendorLedgerEntries({
					from: r.vendorLedgerEntries._id,
					to: r.detailedVendorLedgerEntries.vendorLedgerEntryId,
				}),
			},
			detailedVendorLedgerEntries: {
				vendorLedgerEntry: r.one.vendorLedgerEntries({
					from: r.detailedVendorLedgerEntries.vendorLedgerEntryId,
					to: r.vendorLedgerEntries._id,
				}),
			},
			transferHeaders: {
				lines: r.many.transferLines({
					from: r.transferHeaders.transferNo,
					to: r.transferLines.transferNo,
				}),
			},
			transferLines: {
				header: r.one.transferHeaders({
					from: r.transferLines.transferNo,
					to: r.transferHeaders.transferNo,
				}),
				item: r.one.items({
					from: r.transferLines.itemId,
					to: r.items._id,
				}),
			},

			// Ledger relations
			salesInvoiceHeaders: {
				customer: r.one.customers({
					from: r.salesInvoiceHeaders.customerId,
					to: r.customers._id,
				}),
				lines: r.many.salesInvoiceLines({
					from: r.salesInvoiceHeaders.invoiceNo,
					to: r.salesInvoiceLines.invoiceNo,
				}),
				creditMemos: r.many.salesCreditMemoHeaders({
					from: r.salesInvoiceHeaders.invoiceNo,
					to: r.salesCreditMemoHeaders.appliesToInvoiceNo,
				}),
				eInvoiceSubmissions: r.many.eInvoiceSubmissions({
					from: r.salesInvoiceHeaders.invoiceNo,
					to: r.eInvoiceSubmissions.documentNo,
				}),
			},
			salesInvoiceLines: {
				header: r.one.salesInvoiceHeaders({
					from: r.salesInvoiceLines.invoiceNo,
					to: r.salesInvoiceHeaders.invoiceNo,
				}),
				item: r.one.items({
					from: r.salesInvoiceLines.itemId,
					to: r.items._id,
				}),
			},
			salesCreditMemoHeaders: {
				customer: r.one.customers({
					from: r.salesCreditMemoHeaders.customerId,
					to: r.customers._id,
				}),
				appliesToInvoice: r.one.salesInvoiceHeaders({
					from: r.salesCreditMemoHeaders.appliesToInvoiceNo,
					to: r.salesInvoiceHeaders.invoiceNo,
				}),
				lines: r.many.salesCreditMemoLines({
					from: r.salesCreditMemoHeaders.creditMemoNo,
					to: r.salesCreditMemoLines.creditMemoNo,
				}),
				eInvoiceSubmissions: r.many.eInvoiceSubmissions({
					from: r.salesCreditMemoHeaders.creditMemoNo,
					to: r.eInvoiceSubmissions.documentNo,
				}),
			},
			salesCreditMemoLines: {
				header: r.one.salesCreditMemoHeaders({
					from: r.salesCreditMemoLines.creditMemoNo,
					to: r.salesCreditMemoHeaders.creditMemoNo,
				}),
				item: r.one.items({
					from: r.salesCreditMemoLines.itemId,
					to: r.items._id,
				}),
			},
			eInvoiceSubmissions: {
				events: r.many.eInvoiceEvents({
					from: r.eInvoiceSubmissions._id,
					to: r.eInvoiceEvents.submissionId,
				}),
			},
			eInvoiceEvents: {
				submission: r.one.eInvoiceSubmissions({
					from: r.eInvoiceEvents.submissionId,
					to: r.eInvoiceSubmissions._id,
				}),
			},
			custLedgerEntries: {
				customer: r.one.customers({
					from: r.custLedgerEntries.customerId,
					to: r.customers._id,
				}),
			},

			// Flow relations
			bankAccounts: {
				ledgerEntries: r.many.bankAccountLedgerEntries({
					from: r.bankAccounts._id,
					to: r.bankAccountLedgerEntries.bankAccountId,
				}),
			},
			bankAccountLedgerEntries: {
				bankAccount: r.one.bankAccounts({
					from: r.bankAccountLedgerEntries.bankAccountId,
					to: r.bankAccounts._id,
				}),
			},

			// Payroll relations
			employees: {
				ledgerEntries: r.many.employeeLedgerEntries({
					from: r.employees._id,
					to: r.employeeLedgerEntries.employeeId,
				}),
				adjustments: r.many.payrollRunAdjustments({
					from: r.employees._id,
					to: r.payrollRunAdjustments.employeeId,
				}),
			},
			employeeLedgerEntries: {
				employee: r.one.employees({
					from: r.employeeLedgerEntries.employeeId,
					to: r.employees._id,
				}),
			},
			payrollRuleSets: {
				taxBrackets: r.many.payrollTaxBrackets({
					from: r.payrollRuleSets._id,
					to: r.payrollTaxBrackets.rulesetId,
				}),
				deductionRules: r.many.payrollDeductionRules({
					from: r.payrollRuleSets._id,
					to: r.payrollDeductionRules.rulesetId,
				}),
				runs: r.many.payrollRuns({
					from: r.payrollRuleSets._id,
					to: r.payrollRuns.rulesetId,
				}),
			},
			payrollTaxBrackets: {
				ruleset: r.one.payrollRuleSets({
					from: r.payrollTaxBrackets.rulesetId,
					to: r.payrollRuleSets._id,
				}),
			},
			payrollDeductionRules: {
				ruleset: r.one.payrollRuleSets({
					from: r.payrollDeductionRules.rulesetId,
					to: r.payrollRuleSets._id,
				}),
			},
			payrollRuns: {
				ruleset: r.one.payrollRuleSets({
					from: r.payrollRuns.rulesetId,
					to: r.payrollRuleSets._id,
				}),
				adjustments: r.many.payrollRunAdjustments({
					from: r.payrollRuns._id,
					to: r.payrollRunAdjustments.runId,
				}),
				statutoryReports: r.many.payrollRunStatutoryReports({
					from: r.payrollRuns._id,
					to: r.payrollRunStatutoryReports.runId,
				}),
			},
			payrollRunAdjustments: {
				run: r.one.payrollRuns({
					from: r.payrollRunAdjustments.runId,
					to: r.payrollRuns._id,
				}),
				employee: r.one.employees({
					from: r.payrollRunAdjustments.employeeId,
					to: r.employees._id,
				}),
			},
			payrollRunStatutoryReports: {
				run: r.one.payrollRuns({
					from: r.payrollRunStatutoryReports.runId,
					to: r.payrollRuns._id,
				}),
			},

			// POS relations
			posSessions: {
				terminal: r.one.terminals({
					from: r.posSessions.terminalId,
					to: r.terminals._id,
				}),
				transactions: r.many.posTransactions({
					from: r.posSessions._id,
					to: r.posTransactions.posSessionId,
				}),
			},
			posTransactions: {
				session: r.one.posSessions({
					from: r.posTransactions.posSessionId,
					to: r.posSessions._id,
				}),
				lines: r.many.posTransactionLines({
					from: r.posTransactions._id,
					to: r.posTransactionLines.transactionId,
				}),
			},
			posTransactionLines: {
				transaction: r.one.posTransactions({
					from: r.posTransactionLines.transactionId,
					to: r.posTransactions._id,
				}),
				item: r.one.items({
					from: r.posTransactionLines.itemId,
					to: r.items._id,
				}),
			},

			// Trace relations
			shipments: {
				lines: r.many.shipmentLines({
					from: r.shipments.shipmentNo,
					to: r.shipmentLines.shipmentNo,
				}),
				labels: r.many.shipmentCarrierLabels({
					from: r.shipments._id,
					to: r.shipmentCarrierLabels.shipmentId,
				}),
				trackingEvents: r.many.shipmentTrackingEvents({
					from: r.shipments._id,
					to: r.shipmentTrackingEvents.shipmentId,
				}),
			},
			shipmentLines: {
				shipment: r.one.shipments({
					from: r.shipmentLines.shipmentNo,
					to: r.shipments.shipmentNo,
				}),
				item: r.one.items({
					from: r.shipmentLines.itemId,
					to: r.items._id,
				}),
			},
			carrierAccounts: {
				labels: r.many.shipmentCarrierLabels({
					from: r.carrierAccounts._id,
					to: r.shipmentCarrierLabels.carrierAccountId,
				}),
				events: r.many.shipmentTrackingEvents({
					from: r.carrierAccounts._id,
					to: r.shipmentTrackingEvents.carrierAccountId,
				}),
			},
			shipmentCarrierLabels: {
				shipment: r.one.shipments({
					from: r.shipmentCarrierLabels.shipmentId,
					to: r.shipments._id,
				}),
				carrierAccount: r.one.carrierAccounts({
					from: r.shipmentCarrierLabels.carrierAccountId,
					to: r.carrierAccounts._id,
				}),
			},
			shipmentTrackingEvents: {
				shipment: r.one.shipments({
					from: r.shipmentTrackingEvents.shipmentId,
					to: r.shipments._id,
				}),
				carrierAccount: r.one.carrierAccounts({
					from: r.shipmentTrackingEvents.carrierAccountId,
					to: r.carrierAccounts._id,
				}),
			},
		}),
	},
)
