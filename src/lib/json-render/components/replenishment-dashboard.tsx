'use client'

import { Package } from 'lucide-react'
import * as React from 'react'
import { useModuleData } from '@/app/_shell/hooks/use-data'
import {
	MetricStrip,
	RecordListPanel,
	StackedDistributionPanel,
	StatRowsPanel,
} from '@/components/ui/json-render/dashboard-sections'
import { DashboardTrendChart } from '@/components/ui/json-render/dashboard-widgets'
import {
	average,
	buildCategorySeries,
	buildMonthlySeries,
	formatPercent,
} from '@/lib/json-render/dashboard-utils'

interface PurchaseOrder {
	_id: string
	documentNo: string
	documentType: 'ORDER' | 'RETURN_ORDER' | 'QUOTE'
	status:
		| 'DRAFT'
		| 'PENDING_APPROVAL'
		| 'APPROVED'
		| 'REJECTED'
		| 'COMPLETED'
		| 'CANCELED'
	vendorId: string
	orderDate: string
	expectedReceiptDate: string
	currency: string
	lineCount: number
	totalAmount: number
}

interface Vendor {
	_id: string
	vendorNo: string
	name: string
	blocked: boolean
}

interface Transfer {
	_id: string
	transferNo: string
	status: 'DRAFT' | 'RELEASED' | 'IN_TRANSIT' | 'RECEIVED' | 'CANCELED'
}

interface PurchaseLineBalance {
	_id: string
	quantity: number
	quantityReceived: number
	quantityInvoiced: number
}

type ReplenishmentDashboardContextValue = {
	isLoading: boolean
	metricItems: Array<{ label: string; value: string; icon: string }>
	purchaseOrderStatusMix: Array<{ name: string; value: number }>
	monthlyPurchaseOrderVolume: Array<{
		month: string
		count: number
		amount: number
	}>
	vendorStatItems: Array<{
		label: string
		value: string
		description: string
	}>
	transferStatItems: Array<{
		label: string
		value: string
		description: string
	}>
	recentPurchaseOrders: Array<{
		id: string
		title: string
		subtitle: string
		status: string
		leadingBadge: string
		leadingBadgeClassName: string
	}>
	vendorBadges: Array<{ label: string; count: string }>
}

const ReplenishmentDashboardContext =
	React.createContext<ReplenishmentDashboardContextValue | null>(null)

const PO_STATUS_COLORS: Record<string, string> = {
	DRAFT: 'bg-slate-500',
	PENDING_APPROVAL: 'bg-amber-500',
	APPROVED: 'bg-sky-500',
	REJECTED: 'bg-rose-500',
	COMPLETED: 'bg-emerald-500',
	CANCELED: 'bg-zinc-400',
}

function useReplenishmentDashboardData() {
	const { items: purchaseOrders, isLoading: purchaseOrdersLoading } =
		useModuleData<'replenishment', PurchaseOrder>(
			'replenishment',
			'purchaseOrders',
			'all',
		)
	const { items: vendors, isLoading: vendorsLoading } = useModuleData<
		'replenishment',
		Vendor
	>('replenishment', 'vendors', 'all')
	const { items: transfers, isLoading: transfersLoading } = useModuleData<
		'replenishment',
		Transfer
	>('replenishment', 'transfers', 'all')
	const { items: purchaseLines, isLoading: purchaseLinesLoading } =
		useModuleData<'replenishment', PurchaseLineBalance>(
			'replenishment',
			'purchaseLines',
			'all',
		)

	const isLoading =
		purchaseOrdersLoading ||
		vendorsLoading ||
		transfersLoading ||
		purchaseLinesLoading

	return React.useMemo<ReplenishmentDashboardContextValue>(() => {
		const totalPOs = purchaseOrders.length
		const pendingApproval = purchaseOrders.filter(
			(order) => order.status === 'PENDING_APPROVAL',
		).length
		const activeVendors = vendors.filter((vendor) => !vendor.blocked).length
		const blockedVendors = vendors.length - activeVendors
		const activeTransfers = transfers.filter(
			(transfer) =>
				transfer.status === 'RELEASED' || transfer.status === 'IN_TRANSIT',
		).length
		const averagePOValue = average(
			purchaseOrders.map((order) => order.totalAmount ?? 0),
		)
		const totalPOValue = purchaseOrders.reduce(
			(sum, order) => sum + (order.totalAmount ?? 0),
			0,
		)

		const totalOrderedQty = purchaseLines.reduce(
			(sum, line) => sum + Number(line.quantity ?? 0),
			0,
		)
		const totalReceivedQty = purchaseLines.reduce(
			(sum, line) => sum + Number(line.quantityReceived ?? 0),
			0,
		)
		const totalInvoicedQty = purchaseLines.reduce(
			(sum, line) => sum + Number(line.quantityInvoiced ?? 0),
			0,
		)
		const openReceiptQty = Math.max(0, totalOrderedQty - totalReceivedQty)
		const openInvoiceQty = Math.max(0, totalReceivedQty - totalInvoicedQty)

		const urgentReceipts = purchaseOrders.filter((order) => {
			if (order.status === 'COMPLETED' || order.status === 'CANCELED')
				return false
			const expectedDate = new Date(order.expectedReceiptDate).getTime()
			if (Number.isNaN(expectedDate)) return false
			const now = Date.now()
			const diffDays = (expectedDate - now) / (1000 * 60 * 60 * 24)
			return diffDays >= 0 && diffDays <= 7
		}).length

		const transferStatusCounts: Record<string, number> = {}
		for (const t of transfers) {
			transferStatusCounts[t.status] = (transferStatusCounts[t.status] ?? 0) + 1
		}

		const receivedPct =
			totalOrderedQty > 0 ? (totalReceivedQty / totalOrderedQty) * 100 : 0
		const invoicedPct =
			totalReceivedQty > 0 ? (totalInvoicedQty / totalReceivedQty) * 100 : 0

		const vendorNameById = new Map(
			vendors.map((vendor) => [vendor._id, vendor.name]),
		)

		return {
			isLoading,
			metricItems: [
				{
					label: 'Purchase Orders',
					value: totalPOs.toLocaleString(),
					icon: 'package',
				},
				{
					label: 'Pending Receipts',
					value: openReceiptQty.toLocaleString(),
					icon: 'package',
				},
				{
					label: 'Transfer Orders',
					value: transfers.length.toLocaleString(),
					icon: 'package',
				},
				{
					label: 'Active Vendors',
					value: `${activeVendors}/${vendors.length}`,
					icon: 'map',
				},
				{
					label: 'Total PO Value',
					value: totalPOValue.toLocaleString('en-US', {
						style: 'currency',
						currency: 'USD',
						maximumFractionDigits: 0,
					}),
					icon: 'dollar',
				},
				{
					label: 'Pending Approval',
					value: pendingApproval.toLocaleString(),
					icon: 'chart',
				},
			],
			purchaseOrderStatusMix: buildCategorySeries(
				purchaseOrders.map((order) => order.status),
			),
			monthlyPurchaseOrderVolume: buildMonthlySeries(
				purchaseOrders,
				(order) => order.orderDate,
			),
			vendorStatItems: [
				{
					label: 'Active Vendors',
					value: activeVendors.toLocaleString(),
					description: `${blockedVendors} blocked`,
				},
				{
					label: 'Average PO Value',
					value: `$${averagePOValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
					description: 'Across all purchase orders',
				},
				{
					label: 'Receipts Due in 7 Days',
					value: urgentReceipts.toLocaleString(),
					description: 'Open orders with expected receipt within 7 days',
				},
				{
					label: 'Receipt Fulfillment',
					value: `${receivedPct.toFixed(1)}%`,
					description: `${totalReceivedQty.toLocaleString()} of ${totalOrderedQty.toLocaleString()} ordered units received`,
				},
			],
			transferStatItems: [
				{
					label: 'Total Transfers',
					value: transfers.length.toLocaleString(),
					description: `${activeTransfers} currently active`,
				},
				...['DRAFT', 'RELEASED', 'IN_TRANSIT', 'RECEIVED', 'CANCELED'].map(
					(status) => {
						const count = transferStatusCounts[status] ?? 0
						return {
							label: status.replace(/_/g, ' '),
							value: count.toLocaleString(),
							description: `${formatPercent(count, transfers.length)} of all transfers`,
						}
					},
				),
				{
					label: 'Invoice Fulfillment',
					value: `${invoicedPct.toFixed(1)}%`,
					description: `${openInvoiceQty.toLocaleString()} units pending invoicing`,
				},
			],
			recentPurchaseOrders: [...purchaseOrders]
				.sort(
					(a, b) =>
						new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime(),
				)
				.slice(0, 8)
				.map((order) => ({
					id: order._id,
					title: order.documentNo,
					subtitle: `${vendorNameById.get(order.vendorId) ?? order.vendorId} · ${new Date(order.orderDate).toLocaleDateString()} · $${order.totalAmount?.toLocaleString('en-US', { minimumFractionDigits: 2 }) ?? '0.00'}`,
					status: order.status,
					leadingBadge: 'PO',
					leadingBadgeClassName: 'bg-sky-500/10 text-sky-600',
				})),
			vendorBadges: [
				{ label: 'Active', count: activeVendors.toString() },
				{ label: 'Blocked', count: blockedVendors.toString() },
			],
		}
	}, [isLoading, purchaseOrders, vendors, transfers, purchaseLines])
}

function useReplenishmentDashboardContext() {
	const value = React.useContext(ReplenishmentDashboardContext)
	if (!value) {
		throw new Error(
			'Replenishment dashboard section must be used within provider',
		)
	}
	return value
}

export function ReplenishmentDashboardData({
	children,
}: {
	children?: React.ReactNode
}) {
	const value = useReplenishmentDashboardData()
	return (
		<ReplenishmentDashboardContext.Provider value={value}>
			{children}
		</ReplenishmentDashboardContext.Provider>
	)
}

export function ReplenishmentKpiStrip() {
	const { metricItems } = useReplenishmentDashboardContext()
	return <MetricStrip items={metricItems} />
}

export function ReplenishmentPurchaseOrderStatusDistribution() {
	const { purchaseOrderStatusMix } = useReplenishmentDashboardContext()
	return (
		<StackedDistributionPanel
			title='Purchase Order Status'
			description='Breakdown by purchase order status'
			items={purchaseOrderStatusMix}
			colorMap={PO_STATUS_COLORS}
			emptyMessage='No order data available.'
		/>
	)
}

export function ReplenishmentPurchaseOrderTrend() {
	const { monthlyPurchaseOrderVolume } = useReplenishmentDashboardContext()
	return (
		<DashboardTrendChart
			className='shadow-sm transition-shadow hover:shadow-md'
			title='Purchase Order Trend'
			description='Purchase orders created per month'
			data={monthlyPurchaseOrderVolume}
			metricKey='count'
			metricLabel='Purchase Orders'
		/>
	)
}

export function ReplenishmentVendorStats() {
	const { vendorStatItems } = useReplenishmentDashboardContext()
	return <StatRowsPanel title='Vendor Health' items={vendorStatItems} />
}

export function ReplenishmentTransferStats() {
	const { transferStatItems } = useReplenishmentDashboardContext()
	return <StatRowsPanel title='Transfer Status' items={transferStatItems} />
}

export function ReplenishmentRecentPurchaseOrders() {
	const { isLoading, vendorBadges, recentPurchaseOrders } =
		useReplenishmentDashboardContext()
	return (
		<RecordListPanel
			title='Recent Purchase Orders'
			items={recentPurchaseOrders}
			isLoading={isLoading}
			metaBadges={vendorBadges}
			emptyMessage='No purchase orders found.'
			emptyIcon={<Package className='mb-3 h-8 w-8 text-muted-foreground/50' />}
		/>
	)
}
