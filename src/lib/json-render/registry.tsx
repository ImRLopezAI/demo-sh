'use client'

/**
 * json-render Component Registry
 *
 * Maps every catalog entry to its React implementation.
 * Custom domain components import from existing app code.
 */
import { defineRegistry } from '@json-render/react'
import { shadcnComponents } from '@json-render/shadcn'
/* ── Existing view imports (smart components) ── */
import LandingPage from '@/app/_shell/_views'
import {
	DashboardDistributionChart,
	DashboardSectionGrid,
	DashboardStatsPanel,
	DashboardTrendChart,
} from '@/app/_shell/_views/_shared/dashboard-widgets'
import { FormSection as FormSectionImpl } from '@/app/_shell/_views/_shared/form-section'
import { KpiCards as KpiCardsImpl } from '@/app/_shell/_views/_shared/kpi-cards'
import { PageHeader as PageHeaderImpl } from '@/app/_shell/_views/_shared/page-header'
import { StatusBadge as StatusBadgeImpl } from '@/app/_shell/_views/_shared/status-badge'
import FlowBankAccountsList from '@/app/_shell/_views/flow/bank-accounts-list'
import FlowBankLedgerList from '@/app/_shell/_views/flow/bank-ledger-list'
import FlowDashboard from '@/app/_shell/_views/flow/dashboard'
import FlowGlEntriesList from '@/app/_shell/_views/flow/gl-entries-list'
import PaymentJournal from '@/app/_shell/_views/flow/payment-journal'
import ReconciliationApprovals from '@/app/_shell/_views/flow/reconciliation-approvals'
import HubDashboard from '@/app/_shell/_views/hub/dashboard'
import HubNotificationsList from '@/app/_shell/_views/hub/notifications-list'
import OrderFulfillment from '@/app/_shell/_views/hub/order-fulfillment'
import ReportingCenter from '@/app/_shell/_views/hub/reporting-center'
/* ── Existing list view imports ── */
import HubTasksList from '@/app/_shell/_views/hub/tasks-list'
import InsightDashboard from '@/app/_shell/_views/insight/dashboard'
import ForecastWorkbench from '@/app/_shell/_views/insight/forecast-workbench'
import InsightItemLedgerList from '@/app/_shell/_views/insight/item-ledger-list'
import InsightLocationsList from '@/app/_shell/_views/insight/locations-list'
import InsightValueEntriesList from '@/app/_shell/_views/insight/value-entries-list'
import CollectionsCompliance from '@/app/_shell/_views/ledger/collections-compliance'
import LedgerCustomerLedgerList from '@/app/_shell/_views/ledger/customer-ledger-list'
import LedgerDashboard from '@/app/_shell/_views/ledger/dashboard'
import LedgerGlEntriesList from '@/app/_shell/_views/ledger/gl-entries-list'
import LedgerInvoicesList from '@/app/_shell/_views/ledger/invoices-list'
import MarketCartsList from '@/app/_shell/_views/market/carts-list'
import MarketCustomersList from '@/app/_shell/_views/market/customers-list'
import MarketDashboard from '@/app/_shell/_views/market/dashboard'
import MarketItemsList from '@/app/_shell/_views/market/items-list'
import PricingReturns from '@/app/_shell/_views/market/pricing-returns'
import MarketSalesOrdersList from '@/app/_shell/_views/market/sales-orders-list'
import AdjustmentsOffcycle from '@/app/_shell/_views/payroll/adjustments-offcycle'
import PayrollBankLedgerList from '@/app/_shell/_views/payroll/bank-ledger-list'
import PayrollDashboard from '@/app/_shell/_views/payroll/dashboard'
import PayrollEmployeeLedgerList from '@/app/_shell/_views/payroll/employee-ledger-list'
import PayrollEmployeesList from '@/app/_shell/_views/payroll/employees-list'
import PayrollGlEntriesList from '@/app/_shell/_views/payroll/gl-entries-list'
import PayrollJournal from '@/app/_shell/_views/payroll/payroll-journal'
import PosDashboard from '@/app/_shell/_views/pos/dashboard'
import PosSessionsList from '@/app/_shell/_views/pos/sessions-list'
import ShiftControls from '@/app/_shell/_views/pos/shift-controls'
/* ── Existing workbench imports ── */
import PosTerminalView from '@/app/_shell/_views/pos/terminal-view'
import PosTerminalsList from '@/app/_shell/_views/pos/terminals-list'
import PosTransactionsList from '@/app/_shell/_views/pos/transactions-list'
import ReplenishmentDashboard from '@/app/_shell/_views/replenishment/dashboard'
import PlanningWorkbench from '@/app/_shell/_views/replenishment/planning-workbench'
import ReplenishmentPurchaseOrdersList from '@/app/_shell/_views/replenishment/purchase-orders-list'
import ReplenishmentTransfersList from '@/app/_shell/_views/replenishment/transfers-list'
import ReplenishmentVendorsList from '@/app/_shell/_views/replenishment/vendors-list'
import CarrierOps from '@/app/_shell/_views/trace/carrier-ops'
import TraceDashboard from '@/app/_shell/_views/trace/dashboard'
import TraceShipmentMethodsList from '@/app/_shell/_views/trace/shipment-methods-list'
import TraceShipmentsList from '@/app/_shell/_views/trace/shipments-list'
/* ── Custom primitive component imports ── */
import { ShellLayout } from '@/app/_shell/shell-layout'
import { catalog } from './catalog'
import { handlers as actionHandlerImpls } from './handlers'

/* ── Module list view lookup ── */
const LIST_VIEW_MAP: Record<string, React.ComponentType<any>> = {
	'hub/operationTasks': HubTasksList,
	'hub/notifications': HubNotificationsList,
	'market/salesOrders': MarketSalesOrdersList,
	'market/items': MarketItemsList,
	'market/customers': MarketCustomersList,
	'market/carts': MarketCartsList,
	'pos/transactions': PosTransactionsList,
	'pos/terminals': PosTerminalsList,
	'pos/sessions': PosSessionsList,
	'replenishment/purchaseOrders': ReplenishmentPurchaseOrdersList,
	'replenishment/vendors': ReplenishmentVendorsList,
	'replenishment/transfers': ReplenishmentTransfersList,
	'insight/itemLedger': InsightItemLedgerList,
	'insight/locations': InsightLocationsList,
	'insight/valueEntries': InsightValueEntriesList,
	'ledger/invoices': LedgerInvoicesList,
	'ledger/customerLedger': LedgerCustomerLedgerList,
	'ledger/glEntries': LedgerGlEntriesList,
	'flow/bankAccounts': FlowBankAccountsList,
	'flow/bankLedger': FlowBankLedgerList,
	'flow/glEntries': FlowGlEntriesList,
	'payroll/employees': PayrollEmployeesList,
	'payroll/employeeLedger': PayrollEmployeeLedgerList,
	'payroll/glEntries': PayrollGlEntriesList,
	'payroll/bankLedger': PayrollBankLedgerList,
	'trace/shipments': TraceShipmentsList,
	'trace/shipmentMethods': TraceShipmentMethodsList,
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * Registry
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export const { registry } = defineRegistry(catalog, {
	components: {
		// ── shadcn base primitives ──
		Card: shadcnComponents.Card,
		Stack: shadcnComponents.Stack,
		Grid: shadcnComponents.Grid,
		Heading: shadcnComponents.Heading,
		Text: shadcnComponents.Text,
		Button: shadcnComponents.Button,
		Input: shadcnComponents.Input,
		Textarea: shadcnComponents.Textarea,
		Select: shadcnComponents.Select,
		Checkbox: shadcnComponents.Checkbox,
		Switch: shadcnComponents.Switch,
		Badge: shadcnComponents.Badge,
		Alert: shadcnComponents.Alert,
		Tabs: shadcnComponents.Tabs,
		Separator: shadcnComponents.Separator,
		Dialog: shadcnComponents.Dialog,
		Table: shadcnComponents.Table,
		Progress: shadcnComponents.Progress,
		Skeleton: shadcnComponents.Skeleton,
		Spinner: shadcnComponents.Spinner,
		Avatar: shadcnComponents.Avatar,
		Tooltip: shadcnComponents.Tooltip,
		Image: shadcnComponents.Image,
		Link: shadcnComponents.Link,
		Accordion: shadcnComponents.Accordion,
		Toggle: shadcnComponents.Toggle,
		Radio: shadcnComponents.Radio,
		Slider: shadcnComponents.Slider,
		DropdownMenu: shadcnComponents.DropdownMenu,
		Drawer: shadcnComponents.Drawer,
		Popover: shadcnComponents.Popover,
		Carousel: shadcnComponents.Carousel,
		Pagination: shadcnComponents.Pagination,

		// ── Landing ──
		LandingPage: () => <LandingPage />,

		// ── App Shell ──
		ShellLayout: ({ children }) => <ShellLayout>{children}</ShellLayout>,

		// ── Page Structure ──
		PageHeader: ({ props }) => (
			<PageHeaderImpl
				title={props.title}
				description={props.description ?? undefined}
				actions={
					props.actionLabel ? (
						<button
							type='button'
							className='inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 font-medium text-primary-foreground text-sm shadow-sm transition-all hover:shadow-md'
						>
							{props.actionLabel}
						</button>
					) : undefined
				}
			/>
		),
		SectionGrid: ({ props, children }) => (
			<DashboardSectionGrid
				className={props.columns === 2 ? 'xl:grid-cols-2' : undefined}
			>
				{children}
			</DashboardSectionGrid>
		),
		FormSection: ({ props, children }) => (
			<FormSectionImpl
				title={props.title}
				description={props.description ?? undefined}
			>
				{children}
			</FormSectionImpl>
		),

		// ── Data Display ──
		StatusBadge: ({ props }) => <StatusBadgeImpl status={props.status} />,
		KpiCards: ({ props }) => (
			<KpiCardsImpl
				cards={props.items.map((item) => ({
					title: item.title,
					value: item.value,
					description: item.description ?? undefined,
				}))}
			/>
		),
		StatsPanel: ({ props }) => (
			<DashboardStatsPanel
				title={props.title}
				description={props.description ?? undefined}
				items={props.items.map((i) => ({
					label: i.label,
					value: i.value,
					description: i.description ?? undefined,
				}))}
				className={props.className ?? undefined}
			/>
		),
		TrendChart: ({ props }) => (
			<DashboardTrendChart
				title={props.title}
				description={props.description ?? undefined}
				data={props.data}
				metricKey={props.metricKey}
				metricLabel={props.metricLabel}
				className={props.className ?? undefined}
			/>
		),
		DistributionChart: ({ props }) => (
			<DashboardDistributionChart
				title={props.title}
				description={props.description ?? undefined}
				data={props.data}
				className={props.className ?? undefined}
			/>
		),
		EntityList: ({ props, children }) => {
			const hasChildren = Array.isArray(children)
				? (children as React.ReactNode[]).length > 0
				: !!children
			if (!hasChildren) {
				return (
					<div className='flex flex-col items-center justify-center py-8 text-center'>
						<p className='text-muted-foreground text-sm'>
							{props.emptyMessage ?? 'No items found.'}
						</p>
					</div>
				)
			}
			return <ul className='space-y-3'>{children}</ul>
		},
		EntityListItem: ({ props }) => (
			<li className='flex items-center justify-between gap-3 rounded-lg border border-border/40 bg-background/30 p-3 transition-colors hover:bg-muted/50'>
				<div className='min-w-0 flex-1'>
					<p className='truncate font-medium text-sm'>{props.title}</p>
					{props.subtitle && (
						<p className='mt-0.5 text-muted-foreground text-xs'>
							{props.subtitle}
						</p>
					)}
				</div>
				<div className='flex shrink-0 items-center gap-2'>
					{props.status && <StatusBadgeImpl status={props.status} />}
					{props.secondaryStatus && (
						<StatusBadgeImpl status={props.secondaryStatus} />
					)}
					{props.trailingValue && (
						<span className='font-semibold text-sm tabular-nums'>
							{props.trailingValue}
						</span>
					)}
				</div>
			</li>
		),
		EmptyState: ({ props }) => (
			<div className='flex flex-col items-center justify-center py-8 text-center'>
				<p className='text-muted-foreground text-sm'>{props.message}</p>
			</div>
		),

		// ── Smart Module List View ──
		ModuleListView: ({ props }) => {
			const key = `${props.moduleId}/${props.entityId}`
			const ListComponent = LIST_VIEW_MAP[key]
			if (!ListComponent) {
				return (
					<div className='rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center'>
						<p className='font-medium text-destructive text-sm'>
							List view not found: {key}
						</p>
					</div>
				)
			}
			// Pass spec props through for components that can consume them
			return <ListComponent specProps={props} />
		},

		// ── Module Dashboards ──
		HubDashboard: () => <HubDashboard />,
		MarketDashboard: () => <MarketDashboard />,
		PosDashboard: () => <PosDashboard />,
		ReplenishmentDashboard: () => <ReplenishmentDashboard />,
		InsightDashboard: () => <InsightDashboard />,
		LedgerDashboard: () => <LedgerDashboard />,
		FlowDashboard: () => <FlowDashboard />,
		PayrollDashboard: () => <PayrollDashboard />,
		TraceDashboard: () => <TraceDashboard />,

		// ── Workbench Views ──
		PosTerminalView: ({ props }) => <PosTerminalView specProps={props} />,
		ReportingCenter: ({ props }) => <ReportingCenter specProps={props} />,
		PlanningWorkbench: ({ props }) => <PlanningWorkbench specProps={props} />,
		ForecastWorkbench: ({ props }) => <ForecastWorkbench specProps={props} />,
		OrderFulfillment: ({ props }) => <OrderFulfillment specProps={props} />,
		ReconciliationApprovals: ({ props }) => (
			<ReconciliationApprovals specProps={props} />
		),
		CollectionsCompliance: ({ props }) => (
			<CollectionsCompliance specProps={props} />
		),
		PricingReturns: ({ props }) => <PricingReturns specProps={props} />,
		ShiftControls: ({ props }) => <ShiftControls specProps={props} />,
		CarrierOps: ({ props }) => <CarrierOps specProps={props} />,
		PaymentJournal: ({ props }) => <PaymentJournal specProps={props} />,
		PayrollJournal: ({ props }) => <PayrollJournal specProps={props} />,
		AdjustmentsOffcycle: ({ props }) => (
			<AdjustmentsOffcycle specProps={props} />
		),
	},
	actions: {
		showToast: async (params) => {
			if (params)
				actionHandlerImpls.showToast(params as Record<string, unknown>)
		},
		copyToClipboard: async (params) => {
			if (params)
				actionHandlerImpls.copyToClipboard(params as Record<string, unknown>)
		},
		printPage: async () => {
			actionHandlerImpls.printPage({})
		},
		openExternal: async (params) => {
			if (params)
				actionHandlerImpls.openExternal(params as Record<string, unknown>)
		},
		refreshData: async (params) => {
			if (params)
				actionHandlerImpls.refreshData(params as Record<string, unknown>)
		},
		exportData: async (params) => {
			if (params)
				actionHandlerImpls.exportData(params as Record<string, unknown>)
		},
	},
})
