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

const statItemDef = z.object({
	label: z.string(),
	value: z.string(),
	description: z.string().nullable().optional(),
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
				actionLabel: z.string().nullable().optional(),
				actionIcon: z.string().nullable().optional(),
			}),
			description:
				'Page title banner with optional description and action button',
		},
		SectionGrid: {
			props: z.object({
				columns: z.number().nullable().optional(),
			}),
			description:
				'Responsive grid for dashboard sections (3-col on xl by default)',
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
		KpiCards: {
			props: z.object({
				items: z.array(
					z.object({
						title: z.string(),
						value: z.string(),
						icon: z.string().nullable().optional(),
						description: z.string().nullable().optional(),
					}),
				),
			}),
			description: 'Grid of KPI metric cards',
		},
		StatsPanel: {
			props: z.object({
				title: z.string(),
				description: z.string().nullable().optional(),
				items: z.array(statItemDef),
				className: z.string().nullable().optional(),
			}),
			description: 'Stats items in a bordered card',
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

		// ━━━ Module Dashboards (smart, self-contained) ━━━━━━━━━━
		HubDashboard: {
			props: z.object({}),
			description:
				'Hub command center with SLA scoreboard, task flow, roles, and scheduled jobs',
		},
		MarketDashboard: {
			props: z.object({}),
			description:
				'Market dashboard with revenue, order status, and recent orders',
		},
		PosDashboard: {
			props: z.object({}),
			description:
				'POS dashboard with terminal status, payment mix, and transaction feed',
		},
		ReplenishmentDashboard: {
			props: z.object({}),
			description:
				'Replenishment dashboard with supply pipeline and vendor health',
		},
		InsightDashboard: {
			props: z.object({}),
			description:
				'Insight dashboard with inventory analytics and forecast signals',
		},
		LedgerDashboard: {
			props: z.object({}),
			description:
				'Ledger dashboard with invoiced amounts, receivables, and e-invoice funnel',
		},
		FlowDashboard: {
			props: z.object({}),
			description:
				'Flow dashboard with cash forecast, projected balance, and bank accounts',
		},
		PayrollDashboard: {
			props: z.object({}),
			description:
				'Payroll dashboard with compensation, headcount, and run history',
		},
		TraceDashboard: {
			props: z.object({}),
			description: 'Trace dashboard with shipment status and logistics metrics',
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
