'use client'

/**
 * json-render Component Registry
 *
 * Maps every catalog entry to its React implementation.
 * Custom domain components import from existing app code.
 */
import { defineRegistry } from '@json-render/react'
import { shadcnComponents } from '@json-render/shadcn'
/* ── App Shell ── */
import { ShellLayout } from '@/app/_shell/shell-layout'
/* ── Custom primitive component imports ── */
import {
	DashboardPageStack,
	DashboardThreeColumnGrid,
	PageHeader as PageHeaderImpl,
} from '@/components/ui/json-render/dashboard-sections'
import {
	DashboardDistributionChart,
	DashboardTrendChart,
} from '@/components/ui/json-render/dashboard-widgets'
import { FormSection as FormSectionImpl } from '@/components/ui/json-render/form-section'
import { StatusBadge as StatusBadgeImpl } from '@/components/ui/json-render/status-badge'
import { catalog } from './catalog'
/* ── Landing page ── */
import LandingPage from './components/landing-page'
/* ── Dashboard sections (atomic, named exports) ── */
import {
	FlowBankAccountsList as FlowBankAccountsDashboard,
	FlowCashBalanceTrend,
	FlowCashForecastControls,
	FlowDashboardData,
	FlowForecastStats,
	FlowJournalStatusDistribution,
	FlowJournalThroughputTrend,
	FlowKpiStrip,
	FlowRecentJournalLines,
	FlowTreasuryStats,
	FlowVarianceChart,
} from './components/flow-dashboard'
import {
	HubDashboardData,
	HubKpiStrip,
	HubOperationsStats,
	HubRecentNotifications,
	HubRecentTasks,
	HubTaskStatusChart,
	HubTaskStatusDistribution,
	HubTaskVolumeTrend,
} from './components/hub-dashboard'
import {
	InsightDashboardData,
	InsightEntryTypeDistribution,
	InsightInventoryStats,
	InsightKpiStrip,
	InsightLocationSummary,
	InsightMovementTrend,
	InsightRecentEntries,
} from './components/insight-dashboard'
import {
	LedgerDashboardData,
	LedgerEInvoiceFunnel,
	LedgerHeroCards,
	LedgerInvoiceRegister,
	LedgerInvoiceStatusCounts,
	LedgerInvoiceVolumeTrend,
	LedgerKpiStrip,
	LedgerStats,
} from './components/ledger-dashboard'
import {
	MarketCommercialStats,
	MarketDashboardData,
	MarketKpiStrip,
	MarketOrderStatusDistribution,
	MarketOrderVolumeTrend,
	MarketRecentOrders,
} from './components/market-dashboard'
import {
	PayrollCompensationOverview,
	PayrollDashboardData,
	PayrollDepartmentBreakdown,
	PayrollEmploymentTypeDistribution,
	PayrollHiringTrend,
	PayrollKpiStrip,
	PayrollRecentHires,
} from './components/payroll-dashboard'
import {
	PosDashboardData,
	PosKpiStrip,
	PosOperationalStats,
	PosPaymentMethodDistribution,
	PosRecentTransactions,
	PosTerminalSummary,
	PosTransactionStatusDistribution,
	PosTransactionVolumeTrend,
} from './components/pos-dashboard'
import {
	ReplenishmentDashboardData,
	ReplenishmentKpiStrip,
	ReplenishmentPurchaseOrderStatusDistribution,
	ReplenishmentPurchaseOrderTrend,
	ReplenishmentRecentPurchaseOrders,
	ReplenishmentTransferStats,
	ReplenishmentVendorStats,
} from './components/replenishment-dashboard'
import {
	TraceDashboardData,
	TraceKpiStrip,
	TraceLogisticsStats,
	TraceRecentShipments,
	TraceShipmentStatusDistribution,
	TraceShipmentVolumeTrend,
} from './components/trace-dashboard'
/* ── Workbench / list views (default exports from module subdirectories) ── */
// Flow
import FlowBankAccountsListView from './components/flow/bank-accounts-list'
import FlowBankLedgerList from './components/flow/bank-ledger-list'
import FlowGlEntriesList from './components/flow/gl-entries-list'
import PaymentJournal from './components/flow/payment-journal'
import ReconciliationApprovals from './components/flow/reconciliation-approvals'
// Hub
import HubNotificationsList from './components/hub/notifications-list'
import OrderFulfillment from './components/hub/order-fulfillment'
import ReportingCenter from './components/hub/reporting-center'
import HubTasksList from './components/hub/tasks-list'
// Insight
import ForecastWorkbench from './components/insight/forecast-workbench'
import InsightLocationsList from './components/insight/locations-list'
import InsightValueEntriesList from './components/insight/value-entries-list'
// Ledger
import CollectionsCompliance from './components/ledger/collections-compliance'
import LedgerCustomerLedgerList from './components/ledger/customer-ledger-list'
import LedgerGlEntriesList from './components/ledger/gl-entries-list'
import LedgerInvoicesList from './components/ledger/invoices-list'
// Market
import MarketCartsList from './components/market/carts-list'
import MarketCustomersList from './components/market/customers-list'
import MarketItemsList from './components/market/items-list'
import PricingReturns from './components/market/pricing-returns'
import MarketSalesOrdersList from './components/market/sales-orders-list'
// Payroll
import AdjustmentsOffcycle from './components/payroll/adjustments-offcycle'
import PayrollBankLedgerList from './components/payroll/bank-ledger-list'
import PayrollEmployeeLedgerList from './components/payroll/employee-ledger-list'
import PayrollEmployeesList from './components/payroll/employees-list'
import PayrollGlEntriesList from './components/payroll/gl-entries-list'
import PayrollJournal from './components/payroll/payroll-journal'
// POS
import PosSessionsList from './components/pos/sessions-list'
import ShiftControls from './components/pos/shift-controls'
import PosTerminalView from './components/pos/terminal-view'
import PosTerminalsList from './components/pos/terminals-list'
import PosTransactionsList from './components/pos/transactions-list'
// Replenishment
import PlanningWorkbench from './components/replenishment/planning-workbench'
import ReplenishmentPurchaseOrdersList from './components/replenishment/purchase-orders-list'
import ReplenishmentTransfersList from './components/replenishment/transfers-list'
import ReplenishmentVendorsList from './components/replenishment/vendors-list'
// Trace
import CarrierOps from './components/trace/carrier-ops'
import TraceShipmentMethodsList from './components/trace/shipment-methods-list'
import TraceShipmentsList from './components/trace/shipments-list'
/* ── Shared helpers ── */
import { GenericModuleListView } from './components/module-list-view'
import type { SpecListProps } from './components/spec-list-helpers'
import { handlers as actionHandlerImpls } from './handlers'

/* ── Module list view lookup ── */
const LIST_VIEW_MAP: Record<
	string,
	React.ComponentType<{ specProps?: SpecListProps }>
> = {
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
	'insight/locations': InsightLocationsList,
	'insight/valueEntries': InsightValueEntriesList,
	'ledger/invoices': LedgerInvoicesList,
	'ledger/customerLedger': LedgerCustomerLedgerList,
	'ledger/glEntries': LedgerGlEntriesList,
	'flow/bankAccounts': FlowBankAccountsListView,
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
			/>
		),
		DashboardPageStack: ({ children }) => (
			<DashboardPageStack>{children}</DashboardPageStack>
		),
		DashboardThreeColumnGrid: ({ children }) => (
			<DashboardThreeColumnGrid>{children}</DashboardThreeColumnGrid>
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
			const normalizedProps: SpecListProps = {
				...props,
				bulkActions: props.bulkActions ?? undefined,
				_filters: props._filters ?? undefined,
				_cardSections: props._cardSections ?? undefined,
			}
			if (ListComponent) return <ListComponent specProps={normalizedProps} />
			return <GenericModuleListView specProps={normalizedProps} />
		},

		// ── Insight Dashboard Sections ──
		InsightDashboardData: ({ children }) => (
			<InsightDashboardData>{children}</InsightDashboardData>
		),
		InsightKpiStrip: () => <InsightKpiStrip />,
		InsightEntryTypeDistribution: () => <InsightEntryTypeDistribution />,
		InsightMovementTrend: () => <InsightMovementTrend />,
		InsightInventoryStats: () => <InsightInventoryStats />,
		InsightRecentEntries: () => <InsightRecentEntries />,
		InsightLocationSummary: () => <InsightLocationSummary />,

		// ── Hub Dashboard Sections ──
		HubDashboardData: ({ children }) => (
			<HubDashboardData>{children}</HubDashboardData>
		),
		HubKpiStrip: () => <HubKpiStrip />,
		HubTaskStatusDistribution: () => <HubTaskStatusDistribution />,
		HubTaskStatusChart: () => <HubTaskStatusChart />,
		HubTaskVolumeTrend: () => <HubTaskVolumeTrend />,
		HubOperationsStats: () => <HubOperationsStats />,
		HubRecentTasks: () => <HubRecentTasks />,
		HubRecentNotifications: () => <HubRecentNotifications />,

		// ── Market Dashboard Sections ──
		MarketDashboardData: ({ children }) => (
			<MarketDashboardData>{children}</MarketDashboardData>
		),
		MarketKpiStrip: () => <MarketKpiStrip />,
		MarketOrderStatusDistribution: () => <MarketOrderStatusDistribution />,
		MarketOrderVolumeTrend: () => <MarketOrderVolumeTrend />,
		MarketCommercialStats: () => <MarketCommercialStats />,
		MarketRecentOrders: () => <MarketRecentOrders />,

		// ── Flow Dashboard Sections ──
		FlowDashboardData: ({ children }) => (
			<FlowDashboardData>{children}</FlowDashboardData>
		),
		FlowKpiStrip: () => <FlowKpiStrip />,
		FlowCashForecastControls: () => <FlowCashForecastControls />,
		FlowCashBalanceTrend: () => <FlowCashBalanceTrend />,
		FlowForecastStats: () => <FlowForecastStats />,
		FlowVarianceChart: () => <FlowVarianceChart />,
		FlowJournalThroughputTrend: () => <FlowJournalThroughputTrend />,
		FlowJournalStatusDistribution: () => <FlowJournalStatusDistribution />,
		FlowTreasuryStats: () => <FlowTreasuryStats />,
		FlowBankAccountsList: () => <FlowBankAccountsDashboard />,
		FlowRecentJournalLines: () => <FlowRecentJournalLines />,

		// ── Ledger Dashboard Sections ──
		LedgerDashboardData: ({ children }) => (
			<LedgerDashboardData>{children}</LedgerDashboardData>
		),
		LedgerKpiStrip: () => <LedgerKpiStrip />,
		LedgerHeroCards: () => <LedgerHeroCards />,
		LedgerInvoiceStatusCounts: () => <LedgerInvoiceStatusCounts />,
		LedgerEInvoiceFunnel: () => <LedgerEInvoiceFunnel />,
		LedgerStats: () => <LedgerStats />,
		LedgerInvoiceVolumeTrend: () => <LedgerInvoiceVolumeTrend />,
		LedgerInvoiceRegister: () => <LedgerInvoiceRegister />,

		// ── POS Dashboard Sections ──
		PosDashboardData: ({ children }) => (
			<PosDashboardData>{children}</PosDashboardData>
		),
		PosKpiStrip: () => <PosKpiStrip />,
		PosPaymentMethodDistribution: () => <PosPaymentMethodDistribution />,
		PosTransactionStatusDistribution: () => (
			<PosTransactionStatusDistribution />
		),
		PosTransactionVolumeTrend: () => <PosTransactionVolumeTrend />,
		PosOperationalStats: () => <PosOperationalStats />,
		PosRecentTransactions: () => <PosRecentTransactions />,
		PosTerminalSummary: () => <PosTerminalSummary />,

		// ── Payroll Dashboard Sections ──
		PayrollDashboardData: ({ children }) => (
			<PayrollDashboardData>{children}</PayrollDashboardData>
		),
		PayrollKpiStrip: () => <PayrollKpiStrip />,
		PayrollEmploymentTypeDistribution: () => (
			<PayrollEmploymentTypeDistribution />
		),
		PayrollDepartmentBreakdown: () => <PayrollDepartmentBreakdown />,
		PayrollCompensationOverview: () => <PayrollCompensationOverview />,
		PayrollHiringTrend: () => <PayrollHiringTrend />,
		PayrollRecentHires: () => <PayrollRecentHires />,

		// ── Trace Dashboard Sections ──
		TraceDashboardData: ({ children }) => (
			<TraceDashboardData>{children}</TraceDashboardData>
		),
		TraceKpiStrip: () => <TraceKpiStrip />,
		TraceShipmentStatusDistribution: () => <TraceShipmentStatusDistribution />,
		TraceShipmentVolumeTrend: () => <TraceShipmentVolumeTrend />,
		TraceLogisticsStats: () => <TraceLogisticsStats />,
		TraceRecentShipments: () => <TraceRecentShipments />,

		// ── Replenishment Dashboard Sections ──
		ReplenishmentDashboardData: ({ children }) => (
			<ReplenishmentDashboardData>{children}</ReplenishmentDashboardData>
		),
		ReplenishmentKpiStrip: () => <ReplenishmentKpiStrip />,
		ReplenishmentPurchaseOrderStatusDistribution: () => (
			<ReplenishmentPurchaseOrderStatusDistribution />
		),
		ReplenishmentPurchaseOrderTrend: () => (
			<ReplenishmentPurchaseOrderTrend />
		),
		ReplenishmentVendorStats: () => <ReplenishmentVendorStats />,
		ReplenishmentTransferStats: () => <ReplenishmentTransferStats />,
		ReplenishmentRecentPurchaseOrders: () => (
			<ReplenishmentRecentPurchaseOrders />
		),

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
