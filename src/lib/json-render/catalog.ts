/**
 * json-render Component Catalog
 *
 * Defines every component available in the Uplink app spec.
 * Two categories:
 *   1. shadcn primitives — thin wrappers from @json-render/shadcn
 *   2. Custom domain components — Uplink-specific smart components
 */
import { defineCatalog } from '@json-render/core'
import { schema } from '@json-render/react/schema'
import { shadcnComponentDefinitions } from '@json-render/shadcn/catalog'
import { z } from 'zod'

/* ─── Column definition shared across data-grid components ─── */
const columnDef = z.object({
	accessorKey: z.string(),
	title: z.string(),
	cellVariant: z.string().nullable().optional(),
	width: z.number().nullable().optional(),
})

const bulkActionDef = z.object({
	id: z.string(),
	label: z.string(),
	toStatus: z.string(),
	requireAllStatus: z.string().nullable().optional(),
	variant: z.enum(['default', 'destructive']).nullable().optional(),
})

/* ─── Card field/section definitions for detail views ─── */
const cardFieldDef = z.object({
	name: z.string(),
	label: z.string(),
	type: z
		.enum([
			'text',
			'number',
			'email',
			'tel',
			'select',
			'switch',
			'date',
			'textarea',
		])
		.nullable()
		.optional(),
	placeholder: z.string().nullable().optional(),
	options: z
		.array(z.object({ label: z.string(), value: z.string() }))
		.nullable()
		.optional(),
	readOnly: z.boolean().nullable().optional(),
	required: z.boolean().nullable().optional(),
	autoComplete: z.string().nullable().optional(),
	colSpan: z.number().nullable().optional(),
})

const cardSectionDef = z.object({
	title: z.string(),
	description: z.string().nullable().optional(),
	fields: z.array(cardFieldDef),
	columns: z.number().nullable().optional(),
})

/* ─── Catalog ─── */
export const catalog = defineCatalog(schema, {
	components: {
		// ━━━ shadcn primitives ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
		Card: shadcnComponentDefinitions.Card,
		Stack: shadcnComponentDefinitions.Stack,
		Grid: shadcnComponentDefinitions.Grid,
		Heading: shadcnComponentDefinitions.Heading,
		Text: shadcnComponentDefinitions.Text,
		Button: shadcnComponentDefinitions.Button,
		Input: shadcnComponentDefinitions.Input,
		Textarea: shadcnComponentDefinitions.Textarea,
		Select: shadcnComponentDefinitions.Select,
		Checkbox: shadcnComponentDefinitions.Checkbox,
		Switch: shadcnComponentDefinitions.Switch,
		Badge: shadcnComponentDefinitions.Badge,
		Alert: shadcnComponentDefinitions.Alert,
		Tabs: shadcnComponentDefinitions.Tabs,
		Separator: shadcnComponentDefinitions.Separator,
		Dialog: shadcnComponentDefinitions.Dialog,
		Table: shadcnComponentDefinitions.Table,
		Progress: shadcnComponentDefinitions.Progress,
		Skeleton: shadcnComponentDefinitions.Skeleton,
		Spinner: shadcnComponentDefinitions.Spinner,
		Avatar: shadcnComponentDefinitions.Avatar,
		Tooltip: shadcnComponentDefinitions.Tooltip,
		Image: shadcnComponentDefinitions.Image,
		Link: shadcnComponentDefinitions.Link,
		Accordion: shadcnComponentDefinitions.Accordion,
		Toggle: shadcnComponentDefinitions.Toggle,
		Radio: shadcnComponentDefinitions.Radio,
		Slider: shadcnComponentDefinitions.Slider,
		DropdownMenu: shadcnComponentDefinitions.DropdownMenu,
		Drawer: shadcnComponentDefinitions.Drawer,
		Popover: shadcnComponentDefinitions.Popover,
		Carousel: shadcnComponentDefinitions.Carousel,
		Pagination: shadcnComponentDefinitions.Pagination,

		// ━━━ Landing Page ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
		LandingPage: {
			props: z.object({}),
			description:
				'Full landing page (header, hero, services, stats, testimonial, CTA, footer)',
		},

		// ━━━ App Shell ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
		ShellLayout: {
			props: z.object({}),
			description:
				'App shell with site header, sidebar navigation, and content slot',
		},

		// ━━━ Page Structure ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
		PageHeader: {
			props: z.object({
				title: z.string(),
				description: z.string().nullable().optional(),
			}),
			description: 'Page title banner with optional supporting description',
		},
		DashboardPageStack: {
			props: z.object({}),
			description:
				'Vertical dashboard page stack with consistent route spacing',
		},
		DashboardThreeColumnGrid: {
			props: z.object({}),
			description: 'Three-column dashboard section grid for summary panels',
		},
		FormSection: {
			props: z.object({
				title: z.string(),
				description: z.string().nullable().optional(),
			}),
			description: 'Bordered form section with title heading',
		},

		// ━━━ Data Display ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
		StatusBadge: {
			props: z.object({
				status: z.string().nullable().optional(),
			}),
			description:
				'Semantic status badge mapping status codes to variant colors',
		},
		TrendChart: {
			props: z.object({
				title: z.string(),
				description: z.string().nullable().optional(),
				metricKey: z.enum(['count', 'amount']),
				metricLabel: z.string(),
				data: z.array(
					z.object({
						month: z.string(),
						count: z.number(),
						amount: z.number(),
					}),
				),
				className: z.string().nullable().optional(),
			}),
			description: 'Bar chart for time-series trends',
		},
		DistributionChart: {
			props: z.object({
				title: z.string(),
				description: z.string().nullable().optional(),
				data: z.array(z.object({ name: z.string(), value: z.number() })),
				className: z.string().nullable().optional(),
			}),
			description: 'Pie chart for category distribution',
		},
		EntityList: {
			props: z.object({
				emptyIcon: z.string().nullable().optional(),
				emptyMessage: z.string().nullable().optional(),
			}),
			description: 'Styled list container for entity items with empty state',
		},
		EntityListItem: {
			props: z.object({
				title: z.string(),
				subtitle: z.string().nullable().optional(),
				status: z.string().nullable().optional(),
				secondaryStatus: z.string().nullable().optional(),
				trailingValue: z.string().nullable().optional(),
			}),
			description: 'Single entity row with title, subtitle, and status badges',
		},
		EmptyState: {
			props: z.object({
				icon: z.string().nullable().optional(),
				message: z.string(),
			}),
			description: 'Empty data placeholder with icon and message',
		},

		// ━━━ Smart Module List View ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
		ModuleListView: {
			props: z.object({
				moduleId: z.string(),
				entityId: z.string(),
				viewSlug: z.string().nullable().optional(),
				title: z.string(),
				description: z.string().nullable().optional(),
				_filters: z
					.record(z.string(), z.string())
					.nullable()
					.optional()
					.describe(
						'Maps server filter keys to json-render state paths for the filter bridge',
					),
				columns: z.array(columnDef),
				bulkActions: z.array(bulkActionDef).nullable().optional(),
				enableNew: z.boolean().nullable().optional(),
				newLabel: z.string().nullable().optional(),
				_cardTitle: z
					.string()
					.nullable()
					.optional()
					.describe(
						'Title template for the record detail card, supports {fieldName} interpolation',
					),
				_cardNewTitle: z.string().nullable().optional(),
				_cardDescription: z.string().nullable().optional(),
				_cardSections: z
					.array(cardSectionDef)
					.nullable()
					.optional()
					.describe('Form field sections for the record detail card view'),
			}),
			description:
				'Complete list page: page header, data grid with filtering/sorting/pagination, bulk actions, and record detail',
		},

		// ━━━ Insight Dashboard Sections ━━━━━━━━━━━━━━━━━━━━━━━━━
		InsightDashboardData: {
			props: z.object({}),
			description:
				'Insight dashboard data provider that hydrates child sections with metrics and summaries',
		},
		InsightKpiStrip: {
			props: z.object({}),
			description: 'Insight dashboard KPI strip',
		},
		InsightEntryTypeDistribution: {
			props: z.object({}),
			description: 'Insight dashboard entry type distribution section',
		},
		InsightMovementTrend: {
			props: z.object({}),
			description: 'Insight dashboard movement trend section',
		},
		InsightInventoryStats: {
			props: z.object({}),
			description: 'Insight dashboard inventory stats section',
		},
		InsightRecentEntries: {
			props: z.object({}),
			description: 'Insight dashboard recent ledger entries section',
		},
		InsightLocationSummary: {
			props: z.object({}),
			description: 'Insight dashboard location summary section',
		},

		// ━━━ Hub Dashboard Sections ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
		HubDashboardData: {
			props: z.object({}),
			description:
				'Hub dashboard data provider that hydrates child sections with task metrics and operational summaries',
		},
		HubKpiStrip: {
			props: z.object({}),
			description: 'Hub dashboard KPI strip showing SLA scores, active tasks, and throughput',
		},
		HubTaskStatusDistribution: {
			props: z.object({}),
			description: 'Hub dashboard pie chart of task status distribution across all workflows',
		},
		HubTaskStatusChart: {
			props: z.object({}),
			description: 'Hub dashboard stacked bar chart of task statuses by category',
		},
		HubTaskVolumeTrend: {
			props: z.object({}),
			description: 'Hub dashboard trend chart of task creation and completion volumes over time',
		},
		HubOperationsStats: {
			props: z.object({}),
			description: 'Hub dashboard operational statistics including roles, scheduled jobs, and integrations',
		},
		HubRecentTasks: {
			props: z.object({}),
			description: 'Hub dashboard recent tasks list showing latest task activity',
		},
		HubRecentNotifications: {
			props: z.object({}),
			description: 'Hub dashboard recent notifications feed for system-wide alerts',
		},

		// ━━━ Market Dashboard Sections ━━━━━━━━━━━━━━━━━━━━━━━━━━
		MarketDashboardData: {
			props: z.object({}),
			description:
				'Market dashboard data provider that hydrates child sections with revenue and order metrics',
		},
		MarketKpiStrip: {
			props: z.object({}),
			description: 'Market dashboard KPI strip showing revenue, order count, and average order value',
		},
		MarketOrderStatusDistribution: {
			props: z.object({}),
			description: 'Market dashboard pie chart of order status distribution',
		},
		MarketOrderVolumeTrend: {
			props: z.object({}),
			description: 'Market dashboard trend chart of order volume and revenue over time',
		},
		MarketCommercialStats: {
			props: z.object({}),
			description: 'Market dashboard commercial statistics including customer segments and product performance',
		},
		MarketRecentOrders: {
			props: z.object({}),
			description: 'Market dashboard recent orders list showing latest order activity',
		},

		// ━━━ Flow Dashboard Sections ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
		FlowDashboardData: {
			props: z.object({}),
			description:
				'Flow dashboard data provider that hydrates child sections with cash flow and banking metrics',
		},
		FlowKpiStrip: {
			props: z.object({}),
			description: 'Flow dashboard KPI strip showing cash position, projected balance, and liquidity ratio',
		},
		FlowCashForecastControls: {
			props: z.object({}),
			description: 'Flow dashboard controls for adjusting cash forecast horizon and parameters',
		},
		FlowCashBalanceTrend: {
			props: z.object({}),
			description: 'Flow dashboard trend chart of cash balance over time with projected vs actual',
		},
		FlowForecastStats: {
			props: z.object({}),
			description: 'Flow dashboard forecast statistics including inflows, outflows, and net position',
		},
		FlowVarianceChart: {
			props: z.object({}),
			description: 'Flow dashboard chart comparing forecast variance against actuals',
		},
		FlowJournalThroughputTrend: {
			props: z.object({}),
			description: 'Flow dashboard trend chart of journal entry throughput over time',
		},
		FlowJournalStatusDistribution: {
			props: z.object({}),
			description: 'Flow dashboard pie chart of journal entry status distribution',
		},
		FlowTreasuryStats: {
			props: z.object({}),
			description: 'Flow dashboard treasury statistics including bank account balances and reconciliation status',
		},
		FlowBankAccountsList: {
			props: z.object({}),
			description: 'Flow dashboard list of bank accounts with balances and last reconciliation dates',
		},
		FlowRecentJournalLines: {
			props: z.object({}),
			description: 'Flow dashboard recent journal lines list showing latest financial entries',
		},

		// ━━━ Ledger Dashboard Sections ━━━━━━━━━━━━━━━━━━━━━━━━━━
		LedgerDashboardData: {
			props: z.object({}),
			description:
				'Ledger dashboard data provider that hydrates child sections with invoicing and receivable metrics',
		},
		LedgerKpiStrip: {
			props: z.object({}),
			description: 'Ledger dashboard KPI strip showing invoiced amount, outstanding receivables, and DSO',
		},
		LedgerHeroCards: {
			props: z.object({}),
			description: 'Ledger dashboard hero cards highlighting total invoiced, total collected, and aging summary',
		},
		LedgerInvoiceStatusCounts: {
			props: z.object({}),
			description: 'Ledger dashboard status count cards for draft, sent, paid, and overdue invoices',
		},
		LedgerEInvoiceFunnel: {
			props: z.object({}),
			description: 'Ledger dashboard e-invoice compliance funnel showing submission to acceptance stages',
		},
		LedgerStats: {
			props: z.object({}),
			description: 'Ledger dashboard summary statistics including receivables aging and credit note totals',
		},
		LedgerInvoiceVolumeTrend: {
			props: z.object({}),
			description: 'Ledger dashboard trend chart of invoice volume and amounts over time',
		},
		LedgerInvoiceRegister: {
			props: z.object({}),
			description: 'Ledger dashboard recent invoice register showing latest posted invoices',
		},

		// ━━━ POS Dashboard Sections ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
		PosDashboardData: {
			props: z.object({}),
			description:
				'POS dashboard data provider that hydrates child sections with transaction and terminal metrics',
		},
		PosKpiStrip: {
			props: z.object({}),
			description: 'POS dashboard KPI strip showing daily sales, transaction count, and average basket size',
		},
		PosPaymentMethodDistribution: {
			props: z.object({}),
			description: 'POS dashboard pie chart of payment method distribution across transactions',
		},
		PosTransactionStatusDistribution: {
			props: z.object({}),
			description: 'POS dashboard pie chart of transaction status distribution',
		},
		PosTransactionVolumeTrend: {
			props: z.object({}),
			description: 'POS dashboard trend chart of transaction volume and sales over time',
		},
		PosOperationalStats: {
			props: z.object({}),
			description: 'POS dashboard operational statistics including terminal uptime and void rates',
		},
		PosRecentTransactions: {
			props: z.object({}),
			description: 'POS dashboard recent transactions list showing latest checkout activity',
		},
		PosTerminalSummary: {
			props: z.object({}),
			description: 'POS dashboard terminal summary showing status and daily totals per terminal',
		},

		// ━━━ Payroll Dashboard Sections ━━━━━━━━━━━━━━━━━━━━━━━━━
		PayrollDashboardData: {
			props: z.object({}),
			description:
				'Payroll dashboard data provider that hydrates child sections with compensation and headcount metrics',
		},
		PayrollKpiStrip: {
			props: z.object({}),
			description: 'Payroll dashboard KPI strip showing total payroll, headcount, and average compensation',
		},
		PayrollEmploymentTypeDistribution: {
			props: z.object({}),
			description: 'Payroll dashboard pie chart of employment type distribution (full-time, part-time, contract)',
		},
		PayrollDepartmentBreakdown: {
			props: z.object({}),
			description: 'Payroll dashboard breakdown of headcount and compensation by department',
		},
		PayrollCompensationOverview: {
			props: z.object({}),
			description: 'Payroll dashboard compensation overview with salary ranges and deduction summaries',
		},
		PayrollHiringTrend: {
			props: z.object({}),
			description: 'Payroll dashboard trend chart of new hires and departures over time',
		},
		PayrollRecentHires: {
			props: z.object({}),
			description: 'Payroll dashboard recent hires list showing latest employee onboarding activity',
		},

		// ━━━ Trace Dashboard Sections ━━━━━━━━━━━━━━━━━━━━━━━━━━━
		TraceDashboardData: {
			props: z.object({}),
			description:
				'Trace dashboard data provider that hydrates child sections with shipment and logistics metrics',
		},
		TraceKpiStrip: {
			props: z.object({}),
			description: 'Trace dashboard KPI strip showing shipment count, on-time rate, and average delivery time',
		},
		TraceShipmentStatusDistribution: {
			props: z.object({}),
			description: 'Trace dashboard pie chart of shipment status distribution',
		},
		TraceShipmentVolumeTrend: {
			props: z.object({}),
			description: 'Trace dashboard trend chart of shipment volume over time',
		},
		TraceLogisticsStats: {
			props: z.object({}),
			description: 'Trace dashboard logistics statistics including carrier performance and delivery zones',
		},
		TraceRecentShipments: {
			props: z.object({}),
			description: 'Trace dashboard recent shipments list showing latest fulfillment activity',
		},

		// ━━━ Replenishment Dashboard Sections ━━━━━━━━━━━━━━━━━━━
		ReplenishmentDashboardData: {
			props: z.object({}),
			description:
				'Replenishment dashboard data provider that hydrates child sections with supply pipeline and vendor metrics',
		},
		ReplenishmentKpiStrip: {
			props: z.object({}),
			description: 'Replenishment dashboard KPI strip showing open POs, fill rate, and lead time',
		},
		ReplenishmentPurchaseOrderStatusDistribution: {
			props: z.object({}),
			description: 'Replenishment dashboard pie chart of purchase order status distribution',
		},
		ReplenishmentPurchaseOrderTrend: {
			props: z.object({}),
			description: 'Replenishment dashboard trend chart of purchase order volume and amounts over time',
		},
		ReplenishmentVendorStats: {
			props: z.object({}),
			description: 'Replenishment dashboard vendor statistics including performance scores and lead times',
		},
		ReplenishmentTransferStats: {
			props: z.object({}),
			description: 'Replenishment dashboard transfer statistics including pending transfers and allocation rates',
		},
		ReplenishmentRecentPurchaseOrders: {
			props: z.object({}),
			description: 'Replenishment dashboard recent purchase orders list showing latest procurement activity',
		},

		// ━━━ Workbench Views (smart, self-contained) ━━━━━━━━━━━
		PosTerminalView: {
			props: z.object({
				title: z.string().nullable().optional(),
				description: z.string().nullable().optional(),
			}),
			description: 'POS terminal checkout with cart, numpad, and payment flow',
		},
		ReportingCenter: {
			props: z.object({
				title: z.string().nullable().optional(),
				description: z.string().nullable().optional(),
			}),
			description:
				'Hub reporting center with template gallery and report builder',
		},
		PlanningWorkbench: {
			props: z.object({
				title: z.string().nullable().optional(),
				description: z.string().nullable().optional(),
			}),
			description:
				'Replenishment planning workbench for purchase and transfer proposals',
		},
		ForecastWorkbench: {
			props: z.object({
				title: z.string().nullable().optional(),
				description: z.string().nullable().optional(),
			}),
			description:
				'Insight forecast workbench for demand analysis and projections',
		},
		OrderFulfillment: {
			props: z.object({
				title: z.string().nullable().optional(),
				description: z.string().nullable().optional(),
			}),
			description: 'Hub order fulfillment workflow with pick/pack/ship stages',
		},
		ReconciliationApprovals: {
			props: z.object({
				title: z.string().nullable().optional(),
				description: z.string().nullable().optional(),
			}),
			description: 'Flow bank reconciliation matching and approval workflow',
		},
		CollectionsCompliance: {
			props: z.object({
				title: z.string().nullable().optional(),
				description: z.string().nullable().optional(),
			}),
			description: 'Ledger collections follow-up and compliance dashboard',
		},
		PricingReturns: {
			props: z.object({
				title: z.string().nullable().optional(),
				description: z.string().nullable().optional(),
			}),
			description: 'Market pricing rules and returns management',
		},
		ShiftControls: {
			props: z.object({
				title: z.string().nullable().optional(),
				description: z.string().nullable().optional(),
			}),
			description: 'POS shift open/close controls and cash management',
		},
		CarrierOps: {
			props: z.object({
				title: z.string().nullable().optional(),
				description: z.string().nullable().optional(),
			}),
			description: 'Trace carrier operations and rate management',
		},
		PaymentJournal: {
			props: z.object({
				title: z.string().nullable().optional(),
				description: z.string().nullable().optional(),
			}),
			description: 'Flow payment journal for vendor and refund disbursements',
		},
		PayrollJournal: {
			props: z.object({
				title: z.string().nullable().optional(),
				description: z.string().nullable().optional(),
			}),
			description: 'Payroll journal for run processing and posting',
		},
		AdjustmentsOffcycle: {
			props: z.object({
				title: z.string().nullable().optional(),
				description: z.string().nullable().optional(),
			}),
			description: 'Payroll adjustments and off-cycle payment processing',
		},
	},
	actions: {
		showToast: {
			params: z.object({
				title: z.string(),
				variant: z
					.enum(['default', 'success', 'warning', 'error'])
					.nullable()
					.optional(),
			}),
			description: 'Display a toast notification',
		},
		copyToClipboard: {
			params: z.object({
				text: z.string(),
			}),
			description: 'Copy text to clipboard',
		},
		printPage: {
			params: z.object({}),
			description: 'Print the current page',
		},
		openExternal: {
			params: z.object({
				url: z.string(),
			}),
			description: 'Open URL in a new browser tab',
		},
		refreshData: {
			params: z.object({
				module: z.string(),
				entity: z.string().nullable().optional(),
			}),
			description: 'Refresh data for a module entity',
		},
		exportData: {
			params: z.object({
				module: z.string(),
				entity: z.string(),
				format: z.enum(['csv', 'xlsx', 'json']).nullable().optional(),
			}),
			description: 'Export entity data in the specified format',
		},
	},
})

export type AppCatalog = typeof catalog
