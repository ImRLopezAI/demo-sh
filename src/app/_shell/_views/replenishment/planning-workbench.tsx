import { $rpc, useMutation } from '@lib/rpc'
import { AlertCircle, Factory, Play, TrendingUp, Truck } from 'lucide-react'
import * as React from 'react'
import { useGrid } from '@/components/data-grid/compound'
import { useWindowSize } from '@/components/data-grid/hooks/use-window-size'
import { Button } from '@/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useModuleList } from '../../hooks/use-data'
import { PageHeader } from '../_shared/page-header'
import type { SpecWorkbenchProps } from '../_shared/spec-workbench-helpers'
import { StatusBadge } from '../_shared/status-badge'
import { useEntityMutations } from '../_shared/use-entity'

type PurchaseProposal = {
	itemId: string
	itemNo?: string
	description?: string
	currentInventory: number
	demandSignal: number
	targetStock: number
	suggestedOrderQty: number
	preferredVendorId?: string
	preferredVendorName?: string
	unitCost: number
	estimatedCost: number
	rankScore: number
}

type TransferProposal = {
	itemId: string
	itemNo?: string
	description?: string
	fromLocationCode: string
	toLocationCode: string
	availableQty: number
	shortageQty: number
	suggestedTransferQty: number
	rankScore: number
}

type Vendor = {
	_id: string
	name?: string
	blocked?: boolean
}

type PurchaseOrder = {
	_id: string
	documentNo: string
	vendorId: string
	status:
		| 'DRAFT'
		| 'PENDING_APPROVAL'
		| 'APPROVED'
		| 'REJECTED'
		| 'COMPLETED'
		| 'CANCELED'
	expectedReceiptDate?: string | null
	totalAmount: number
}

type PurchaseInvoice = {
	_id: string
	invoiceNo: string
	vendorId: string
	status: 'DRAFT' | 'POSTED' | 'CANCELED'
	purchaseOrderNo?: string | null
	totalAmount: number
}

type SupplierScore = {
	vendorId: string
	vendorName: string
	orderCount: number
	completedOrders: number
	postedInvoices: number
	fillRate: number
	invoiceMatchRate: number
	totalSpend: number
}

type ExceptionRow = {
	id: string
	type: 'LATE_RECEIPT' | 'VENDOR_BLOCKED' | 'INVOICE_MISMATCH'
	severity: 'LOW' | 'MEDIUM' | 'HIGH'
	referenceNo: string
	detail: string
	owner?: string
}

interface PlanningWorkbenchViewProps {
	specProps?: SpecWorkbenchProps
}

export default function PlanningWorkbenchView({
	specProps,
}: PlanningWorkbenchViewProps = {}) {
	const windowSize = useWindowSize({ defaultWidth: 1280, defaultHeight: 900 })
	const [proposalLimit, setProposalLimit] = React.useState('25')
	const [selectedItemId, setSelectedItemId] = React.useState('')
	const [shortageQty, setShortageQty] = React.useState('20')
	const [demandA, setDemandA] = React.useState('10')
	const [demandB, setDemandB] = React.useState('7')
	const [exceptionOwner, setExceptionOwner] = React.useState('ops-manager')

	const purchaseProposalsMutation = useMutation({
		...$rpc.replenishment.generatePurchaseProposals.mutationOptions(),
	})
	const transferProposalsMutation = useMutation({
		...$rpc.replenishment.generateTransferProposals.mutationOptions(),
	})
	const allocateShortageMutation = useMutation({
		...$rpc.replenishment.allocateShortage.mutationOptions(),
	})

	const createTask = useEntityMutations('hub', 'operationTasks').create

	const vendors = (useModuleList('replenishment', 'vendors', { limit: 200 })
		.data?.items ?? []) as Vendor[]
	const purchaseOrders = (useModuleList('replenishment', 'purchaseOrders', {
		limit: 400,
	}).data?.items ?? []) as PurchaseOrder[]
	const purchaseInvoices = (useModuleList('replenishment', 'purchaseInvoices', {
		limit: 400,
	}).data?.items ?? []) as PurchaseInvoice[]

	const purchaseProposals =
		(purchaseProposalsMutation.data?.proposals as
			| PurchaseProposal[]
			| undefined) ?? []
	const transferProposals =
		(transferProposalsMutation.data?.proposals as
			| TransferProposal[]
			| undefined) ?? []

	const supplierScores = React.useMemo<SupplierScore[]>(() => {
		const byVendor = new Map<string, SupplierScore>()
		for (const vendor of vendors) {
			byVendor.set(vendor._id, {
				vendorId: vendor._id,
				vendorName: vendor.name ?? vendor._id,
				orderCount: 0,
				completedOrders: 0,
				postedInvoices: 0,
				fillRate: 0,
				invoiceMatchRate: 0,
				totalSpend: 0,
			})
		}

		const ordersByNo = new Map<string, PurchaseOrder>()
		for (const order of purchaseOrders) {
			ordersByNo.set(order.documentNo, order)
			const row = byVendor.get(order.vendorId)
			if (!row) continue
			row.orderCount += 1
			if (order.status === 'COMPLETED') {
				row.completedOrders += 1
			}
			row.totalSpend += Number(order.totalAmount ?? 0)
		}

		for (const invoice of purchaseInvoices) {
			const row = byVendor.get(invoice.vendorId)
			if (!row) continue
			if (invoice.status === 'POSTED') {
				row.postedInvoices += 1
			}
			const sourceOrder = invoice.purchaseOrderNo
				? ordersByNo.get(invoice.purchaseOrderNo)
				: undefined
			if (sourceOrder && sourceOrder.totalAmount > 0) {
				const diff = Math.abs(
					sourceOrder.totalAmount - Number(invoice.totalAmount ?? 0),
				)
				const match = diff <= sourceOrder.totalAmount * 0.05 ? 1 : 0
				row.invoiceMatchRate += match
			}
		}

		return Array.from(byVendor.values())
			.map((row) => ({
				...row,
				fillRate:
					row.orderCount > 0
						? Number((row.completedOrders / row.orderCount).toFixed(2))
						: 0,
				invoiceMatchRate:
					row.postedInvoices > 0
						? Number((row.invoiceMatchRate / row.postedInvoices).toFixed(2))
						: 0,
				totalSpend: Number(row.totalSpend.toFixed(2)),
			}))
			.sort((a, b) => b.totalSpend - a.totalSpend)
	}, [purchaseInvoices, purchaseOrders, vendors])

	const exceptionRows = React.useMemo<ExceptionRow[]>(() => {
		const rows: ExceptionRow[] = []
		const now = Date.now()

		for (const order of purchaseOrders) {
			if (!order.expectedReceiptDate) continue
			if (order.status === 'COMPLETED' || order.status === 'CANCELED') continue
			const expected = Date.parse(order.expectedReceiptDate)
			if (!Number.isFinite(expected) || expected >= now) continue
			rows.push({
				id: `late-${order._id}`,
				type: 'LATE_RECEIPT',
				severity: 'HIGH',
				referenceNo: order.documentNo,
				detail: `Expected receipt ${order.expectedReceiptDate} still not completed.`,
			})
		}

		const vendorMap = new Map(vendors.map((vendor) => [vendor._id, vendor]))
		for (const order of purchaseOrders) {
			const vendor = vendorMap.get(order.vendorId)
			if (!vendor?.blocked) continue
			rows.push({
				id: `blocked-${order._id}`,
				type: 'VENDOR_BLOCKED',
				severity: 'MEDIUM',
				referenceNo: order.documentNo,
				detail: `Vendor ${vendor.name ?? vendor._id} is blocked but order is active.`,
			})
		}

		const ordersByNo = new Map(
			purchaseOrders.map((order) => [order.documentNo, order]),
		)
		for (const invoice of purchaseInvoices) {
			if (!invoice.purchaseOrderNo) continue
			const order = ordersByNo.get(invoice.purchaseOrderNo)
			if (!order) continue
			const diff = Math.abs(
				Number(order.totalAmount ?? 0) - Number(invoice.totalAmount ?? 0),
			)
			if (diff <= 1) continue
			rows.push({
				id: `mismatch-${invoice._id}`,
				type: 'INVOICE_MISMATCH',
				severity: 'MEDIUM',
				referenceNo: invoice.invoiceNo,
				detail: `Invoice ${invoice.totalAmount.toFixed(2)} mismatches PO ${order.totalAmount.toFixed(2)}.`,
			})
		}

		return rows.slice(0, 100)
	}, [purchaseInvoices, purchaseOrders, vendors])

	const proposalData = React.useMemo(
		() => [...purchaseProposals, ...transferProposals],
		[purchaseProposals, transferProposals],
	)

	const ProposalGrid = useGrid(
		() => ({
			data: proposalData,
			isLoading:
				purchaseProposalsMutation.isPending ||
				transferProposalsMutation.isPending,
			readOnly: true,
			enableSearch: true,
		}),
		[
			proposalData,
			purchaseProposalsMutation.isPending,
			transferProposalsMutation.isPending,
		],
	)

	const SupplierGrid = useGrid(
		() => ({
			data: supplierScores,
			isLoading: false,
			readOnly: true,
			enableSearch: true,
		}),
		[supplierScores],
	)

	const ExceptionGrid = useGrid(
		() => ({
			data: exceptionRows,
			isLoading: false,
			readOnly: true,
			enableSearch: true,
		}),
		[exceptionRows],
	)

	const runProposalGeneration = React.useCallback(async () => {
		const limit = Math.min(
			100,
			Math.max(1, Number.parseInt(proposalLimit, 10) || 25),
		)
		await Promise.all([
			purchaseProposalsMutation.mutateAsync({ limit }),
			transferProposalsMutation.mutateAsync({ limit }),
		])
	}, [proposalLimit, purchaseProposalsMutation, transferProposalsMutation])

	const runAllocation = React.useCallback(async () => {
		const fallbackItem =
			purchaseProposals[0]?.itemId ?? transferProposals[0]?.itemId
		const itemId = selectedItemId || fallbackItem
		if (!itemId) return
		await allocateShortageMutation.mutateAsync({
			itemId,
			shortageQty: Math.max(1, Number.parseFloat(shortageQty) || 1),
			locationDemands: [
				{
					locationCode: 'LOC-A',
					demandQty: Math.max(1, Number.parseFloat(demandA) || 1),
					priority: 10,
				},
				{
					locationCode: 'LOC-B',
					demandQty: Math.max(1, Number.parseFloat(demandB) || 1),
					priority: 8,
				},
			],
		})
	}, [
		allocateShortageMutation,
		demandA,
		demandB,
		purchaseProposals,
		selectedItemId,
		shortageQty,
		transferProposals,
	])

	const assignException = React.useCallback(
		async (row: ExceptionRow) => {
			await createTask.mutateAsync({
				taskNo: '',
				moduleId: 'replenishment',
				title: `${row.type} · ${row.referenceNo}`,
				description: row.detail,
				status: 'OPEN',
				priority: row.severity === 'HIGH' ? 'CRITICAL' : 'HIGH',
				assigneeUserId: exceptionOwner || undefined,
			})
		},
		[createTask, exceptionOwner],
	)

	return (
		<div className='space-y-8 pb-8'>
			<PageHeader
				title={specProps?.title ?? 'Planning Workbench'}
				description={
					specProps?.description ??
					'Generate replenishment proposals, evaluate supplier performance, and triage planning exceptions.'
				}
			/>

			<div className='grid gap-6 xl:grid-cols-2'>
				<Card className='border-cyan-500/30 bg-gradient-to-br from-cyan-500/10 via-background to-background'>
					<CardHeader>
						<CardTitle className='flex items-center gap-2'>
							<Factory className='size-4' />
							Proposal Generation
						</CardTitle>
						<CardDescription>
							Generate purchase and transfer proposals with one planner action.
						</CardDescription>
					</CardHeader>
					<CardContent className='space-y-4'>
						<div className='flex flex-wrap items-end gap-2'>
							<div className='space-y-2'>
								<Label>Proposal Limit</Label>
								<Input
									type='number'
									value={proposalLimit}
									onChange={(event) => setProposalLimit(event.target.value)}
									className='w-28'
								/>
							</div>
							<Button
								onClick={() => {
									void runProposalGeneration()
								}}
								disabled={
									purchaseProposalsMutation.isPending ||
									transferProposalsMutation.isPending
								}
							>
								<Play className='mr-1.5 size-4' />
								Generate Proposals
							</Button>
						</div>
						<div className='grid gap-3 sm:grid-cols-2'>
							<SummaryCard
								title='Purchase Proposals'
								value={String(purchaseProposals.length)}
								icon={TrendingUp}
							/>
							<SummaryCard
								title='Transfer Proposals'
								value={String(transferProposals.length)}
								icon={Truck}
							/>
						</div>

						<div className='rounded-lg border border-border/60 bg-background/80 p-3'>
							<p className='font-medium text-sm'>Constrained Allocation</p>
							<div className='mt-2 grid gap-2 sm:grid-cols-4'>
								<Input
									value={selectedItemId}
									onChange={(event) => setSelectedItemId(event.target.value)}
									placeholder='Item ID'
								/>
								<Input
									value={shortageQty}
									onChange={(event) => setShortageQty(event.target.value)}
									placeholder='Shortage'
								/>
								<Input
									value={demandA}
									onChange={(event) => setDemandA(event.target.value)}
									placeholder='LOC-A demand'
								/>
								<Input
									value={demandB}
									onChange={(event) => setDemandB(event.target.value)}
									placeholder='LOC-B demand'
								/>
							</div>
							<Button
								className='mt-2'
								variant='outline'
								onClick={() => {
									void runAllocation()
								}}
								disabled={allocateShortageMutation.isPending}
							>
								Run Allocation
							</Button>
							{allocateShortageMutation.data ? (
								<ul className='mt-2 space-y-1 text-xs'>
									{allocateShortageMutation.data.allocations.map(
										(allocation) => (
											<li key={allocation.locationCode}>
												{allocation.locationCode}: allocated{' '}
												{allocation.allocatedQty} / requested{' '}
												{allocation.requestedQty}
											</li>
										),
									)}
								</ul>
							) : null}
						</div>
					</CardContent>
				</Card>

				<Card className='border-violet-500/30 bg-gradient-to-br from-violet-500/10 via-background to-background'>
					<CardHeader>
						<CardTitle className='flex items-center gap-2'>
							<AlertCircle className='size-4' />
							Exception Queue
						</CardTitle>
						<CardDescription>
							Late receipts, blocked vendors, and invoice mismatches in one
							triage queue.
						</CardDescription>
					</CardHeader>
					<CardContent className='space-y-4'>
						<div className='flex items-center gap-2'>
							<Input
								value={exceptionOwner}
								onChange={(event) => setExceptionOwner(event.target.value)}
								placeholder='Assignee user ID'
								className='max-w-xs'
							/>
						</div>
						<div className='overflow-hidden rounded-xl border border-border/60'>
							<ExceptionGrid
								variant='flat'
								height={Math.max(windowSize.height - 380, 280)}
							>
								<ExceptionGrid.Header className='border-border/50 border-b bg-muted/20 px-4 py-3'>
									<ExceptionGrid.Toolbar filter sort search />
								</ExceptionGrid.Header>
								<ExceptionGrid.Columns>
									<ExceptionGrid.Column accessorKey='type' title='Type' />
									<ExceptionGrid.Column
										accessorKey='referenceNo'
										title='Reference'
									/>
									<ExceptionGrid.Column
										accessorKey='severity'
										title='Severity'
										cell={({ row }) => (
											<StatusBadge status={row.original.severity} />
										)}
									/>
									<ExceptionGrid.Column accessorKey='detail' title='Detail' />
									<ExceptionGrid.Column
										id='assign'
										title='Assign'
										cell={({ row }) => (
											<Button
												size='sm'
												variant='outline'
												onClick={() => {
													void assignException(row.original)
												}}
												disabled={createTask.isPending}
											>
												Assign
											</Button>
										)}
									/>
								</ExceptionGrid.Columns>
							</ExceptionGrid>
						</div>
					</CardContent>
				</Card>
			</div>

			<div className='grid gap-6 xl:grid-cols-2'>
				<Card>
					<CardHeader>
						<CardTitle>Proposal Results</CardTitle>
						<CardDescription>
							Combined purchase + transfer planning output.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className='overflow-hidden rounded-xl border border-border/60'>
							<ProposalGrid
								variant='flat'
								height={Math.max(windowSize.height - 360, 280)}
							>
								<ProposalGrid.Header className='border-border/50 border-b bg-muted/20 px-4 py-3'>
									<ProposalGrid.Toolbar filter sort search export />
								</ProposalGrid.Header>
								<ProposalGrid.Columns>
									<ProposalGrid.Column accessorKey='itemNo' title='Item' />
									<ProposalGrid.Column
										accessorKey='description'
										title='Description'
									/>
									<ProposalGrid.Column
										accessorKey='suggestedOrderQty'
										title='PO Qty'
										cellVariant='number'
									/>
									<ProposalGrid.Column
										accessorKey='suggestedTransferQty'
										title='Transfer Qty'
										cellVariant='number'
									/>
									<ProposalGrid.Column
										accessorKey='preferredVendorName'
										title='Preferred Vendor'
									/>
									<ProposalGrid.Column
										accessorKey='fromLocationCode'
										title='From'
									/>
									<ProposalGrid.Column
										accessorKey='toLocationCode'
										title='To'
									/>
								</ProposalGrid.Columns>
							</ProposalGrid>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Supplier Scorecards</CardTitle>
						<CardDescription>
							Lead-time and invoice quality signals by vendor.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className='overflow-hidden rounded-xl border border-border/60'>
							<SupplierGrid
								variant='flat'
								height={Math.max(windowSize.height - 360, 280)}
							>
								<SupplierGrid.Header className='border-border/50 border-b bg-muted/20 px-4 py-3'>
									<SupplierGrid.Toolbar filter sort search export />
								</SupplierGrid.Header>
								<SupplierGrid.Columns>
									<SupplierGrid.Column
										accessorKey='vendorName'
										title='Vendor'
									/>
									<SupplierGrid.Column
										accessorKey='orderCount'
										title='Orders'
										cellVariant='number'
									/>
									<SupplierGrid.Column
										accessorKey='completedOrders'
										title='Completed'
										cellVariant='number'
									/>
									<SupplierGrid.Column
										accessorKey='fillRate'
										title='Fill Rate'
										cellVariant='number'
									/>
									<SupplierGrid.Column
										accessorKey='postedInvoices'
										title='Posted Invoices'
										cellVariant='number'
									/>
									<SupplierGrid.Column
										accessorKey='invoiceMatchRate'
										title='Invoice Match'
										cellVariant='number'
									/>
									<SupplierGrid.Column
										accessorKey='totalSpend'
										title='Spend'
										cellVariant='number'
										formatter={(value, formatter) =>
											formatter.currency(value.totalSpend)
										}
									/>
								</SupplierGrid.Columns>
							</SupplierGrid>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	)
}

function SummaryCard({
	title,
	value,
	icon: Icon,
}: {
	title: string
	value: string
	icon: React.ComponentType<{ className?: string }>
}) {
	return (
		<div className='rounded-lg border border-border/60 bg-background/80 p-3'>
			<div className='flex items-center justify-between gap-2'>
				<p className='text-muted-foreground text-xs'>{title}</p>
				<Icon className='size-4 text-muted-foreground' />
			</div>
			<p className='mt-1 font-semibold text-lg'>{value}</p>
		</div>
	)
}
