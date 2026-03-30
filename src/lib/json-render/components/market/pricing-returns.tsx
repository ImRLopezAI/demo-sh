import { $rpc, useMutation, useQueryClient } from '@lib/rpc'
import { Plus, RefreshCw, RotateCcw } from 'lucide-react'
import * as React from 'react'
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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import { useModuleData, useModuleList } from '@/app/_shell/hooks/use-data'
import { PageHeader } from '@/components/ui/json-render/dashboard-sections'
import type { SpecWorkbenchProps } from '@/lib/json-render/components/spec-workbench-helpers'
import { StatusBadge } from '@/components/ui/json-render/status-badge'
import { useEntityMutations } from '@/lib/json-render/components/use-entity'

type Customer = { _id: string; name?: string }
type Item = {
	_id: string
	itemNo?: string
	description?: string
	unitPrice?: number
}
type SalesInvoice = { _id: string; invoiceNo?: string; customerId?: string }
type SalesLine = {
	_id: string
	documentNo: string
	itemId: string
	lineNo: number
}

type ReservationRow = {
	_id: string
	reservationNo: string
	documentNo: string
	itemId: string
	quantity: number
	status: 'ACTIVE' | 'RELEASED' | 'EXPIRED' | 'CONSUMED'
	reason?: string | null
}

type CreditMemoRow = {
	_id: string
	creditMemoNo: string
	status: 'DRAFT' | 'POSTED' | 'CANCELED'
	eInvoiceStatus: string
	customerName?: string | null
	appliesToInvoiceNo?: string | null
	totalAmount: number
	totalTaxAmount: number
}

type PricingLineInput = {
	itemId: string
	quantity: number
	unitPrice: number
	discountPercent: number
}

export default function PricingReturnsView({
	specProps,
}: {
	specProps?: SpecWorkbenchProps
} = {}) {
	const queryClient = useQueryClient()
	const [customerId, setCustomerId] = React.useState('')
	const [taxJurisdiction, setTaxJurisdiction] = React.useState('US-DEFAULT')
	const [lineA, setLineA] = React.useState<PricingLineInput>({
		itemId: '',
		quantity: 1,
		unitPrice: 0,
		discountPercent: 0,
	})
	const [lineB, setLineB] = React.useState<PricingLineInput>({
		itemId: '',
		quantity: 1,
		unitPrice: 0,
		discountPercent: 0,
	})
	const [releaseReason, setReleaseReason] = React.useState(
		'Manual release from console',
	)
	const [selectedReservationId, setSelectedReservationId] = React.useState('')
	const [targetSalesLineId, setTargetSalesLineId] = React.useState('')

	const [returnCustomerId, setReturnCustomerId] = React.useState('')
	const [returnInvoiceNo, setReturnInvoiceNo] = React.useState('')
	const [returnItemId, setReturnItemId] = React.useState('')
	const [returnQuantity, setReturnQuantity] = React.useState('1')
	const [returnUnitPrice, setReturnUnitPrice] = React.useState('20')

	const customersQuery = useModuleList('market', 'customers', { limit: 100 })
	const itemsQuery = useModuleList('market', 'items', { limit: 200 })
	const salesLinesQuery = useModuleList('market', 'salesLines', { limit: 300 })
	const invoicesQuery = useModuleList('ledger', 'invoices', { limit: 100 })

	const customers = (customersQuery.data?.items ?? []) as Customer[]
	const items = (itemsQuery.data?.items ?? []) as Item[]
	const salesLines = (salesLinesQuery.data?.items ?? []) as SalesLine[]
	const invoices = (invoicesQuery.data?.items ?? []) as SalesInvoice[]

	const pricingSimulation = useMutation({
		...$rpc.market.pricing.evaluateTotals.mutationOptions(),
	})

	const ledgerCreditMemoMutations = useEntityMutations('ledger', 'creditMemos')
	const ledgerCreditMemoLineMutations = useEntityMutations(
		'ledger',
		'creditMemoLines',
	)

	const releaseControlled = useMutation({
		...$rpc.market.inventoryReservations.releaseControlled.mutationOptions({
			onSuccess: () => {
				void queryClient.invalidateQueries({
					queryKey: $rpc.market.inventoryReservations.key(),
				})
				void queryClient.invalidateQueries({
					queryKey: $rpc.market.salesLines.key(),
				})
			},
		}),
	})
	const reassignControlled = useMutation({
		...$rpc.market.inventoryReservations.reassignControlled.mutationOptions({
			onSuccess: () => {
				void queryClient.invalidateQueries({
					queryKey: $rpc.market.inventoryReservations.key(),
				})
				void queryClient.invalidateQueries({
					queryKey: $rpc.market.salesLines.key(),
				})
			},
		}),
	})

	const postCreditMemo = useMutation({
		...$rpc.ledger.creditMemos.postCreditMemo.mutationOptions({
			onSuccess: () => {
				void queryClient.invalidateQueries({
					queryKey: $rpc.ledger.creditMemos.key(),
				})
				void queryClient.invalidateQueries({
					queryKey: $rpc.ledger.customerLedger.key(),
				})
			},
		}),
	})

	const {
		DataGrid: ReservationsGrid,
		items: reservationItems,
		windowSize,
	} = useModuleData<'market', ReservationRow>(
		'market',
		'inventoryReservations',
		'overview',
	)

	const { DataGrid: CreditMemoGrid } = useModuleData<'ledger', CreditMemoRow>(
		'ledger',
		'creditMemos',
		'overview',
	)

	const runPricingSimulation = React.useCallback(async () => {
		const lines = [lineA, lineB]
			.filter((line) => line.itemId)
			.map((line) => ({
				itemId: line.itemId,
				quantity: Number(line.quantity || 0),
				unitPrice: Number(line.unitPrice || 0),
				discountPercent: Number(line.discountPercent || 0),
			}))
		if (lines.length === 0) return

		await pricingSimulation.mutateAsync({
			customerId: customerId || undefined,
			taxJurisdiction,
			channel: 'MARKET',
			currency: 'USD',
			lines,
		})
	}, [customerId, lineA, lineB, pricingSimulation, taxJurisdiction])

	const handleReleaseReservation = React.useCallback(
		async (reservationId: string) => {
			await releaseControlled.mutateAsync({
				id: reservationId,
				reason:
					releaseReason || 'Manual release from Market reservations console',
			})
		},
		[releaseControlled, releaseReason],
	)

	const handleReassignReservation = React.useCallback(async () => {
		const reservationId = selectedReservationId.trim()
		const nextLineId = targetSalesLineId.trim()
		if (!reservationId || !nextLineId) return
		await reassignControlled.mutateAsync({
			id: reservationId,
			targetSalesLineId: nextLineId,
			reason:
				releaseReason || 'Manual reassignment from Market reservations console',
		})
	}, [
		reassignControlled,
		releaseReason,
		selectedReservationId,
		targetSalesLineId,
	])

	const handleCreateReturnCredit = React.useCallback(async () => {
		if (!returnCustomerId || !returnItemId) return
		const quantity = Math.max(1, Number.parseFloat(returnQuantity) || 1)
		const unitPrice = Math.max(0, Number.parseFloat(returnUnitPrice) || 0)
		const lineAmount = Number((quantity * unitPrice).toFixed(2))

		const creditMemo = await ledgerCreditMemoMutations.create.mutateAsync({
			creditMemoNo: '',
			status: 'DRAFT',
			eInvoiceStatus: 'DRAFT',
			customerId: returnCustomerId,
			appliesToInvoiceNo: returnInvoiceNo || undefined,
			postingDate: new Date().toISOString(),
			currency: 'USD',
			taxJurisdiction: taxJurisdiction || undefined,
			taxRegistrationNo: undefined,
			totalTaxAmount: 0,
		})

		await ledgerCreditMemoLineMutations.create.mutateAsync({
			creditMemoNo: creditMemo.creditMemoNo,
			lineNo: 1,
			itemId: returnItemId,
			quantity,
			unitPrice,
			lineAmount,
			taxRatePercent: 0,
			taxAmount: 0,
		})

		await postCreditMemo.mutateAsync({ id: creditMemo._id })
	}, [
		ledgerCreditMemoLineMutations.create,
		ledgerCreditMemoMutations.create,
		postCreditMemo,
		returnCustomerId,
		returnInvoiceNo,
		returnItemId,
		returnQuantity,
		returnUnitPrice,
		taxJurisdiction,
	])

	const simulated = pricingSimulation.data

	return (
		<div className='space-y-8 pb-8'>
			<PageHeader
				title={specProps?.title ?? 'Pricing, Reservations & Returns'}
				description={
					specProps?.description ??
					'Simulate pricing before commit, control reservation aging, and post return credit memos.'
				}
			/>

			<div className='grid gap-6 xl:grid-cols-2'>
				<Card className='border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-background to-background'>
					<CardHeader>
						<CardTitle>Pricing Simulation Workspace</CardTitle>
						<CardDescription>
							Preview line/cart totals using the same pricing and tax engine as
							checkout.
						</CardDescription>
					</CardHeader>
					<CardContent className='space-y-4'>
						<div className='grid gap-3 md:grid-cols-2'>
							<div className='space-y-2'>
								<Label>Customer</Label>
								<Select
									value={customerId}
									onValueChange={(value) => setCustomerId(value ?? '')}
								>
									<SelectTrigger>
										<SelectValue placeholder='Select customer (optional)' />
									</SelectTrigger>
									<SelectContent>
										{customers.map((customer) => (
											<SelectItem key={customer._id} value={customer._id}>
												{customer.name ?? customer._id}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div className='space-y-2'>
								<Label>Tax Jurisdiction</Label>
								<Input
									value={taxJurisdiction}
									onChange={(event) => setTaxJurisdiction(event.target.value)}
								/>
							</div>
						</div>

						<div className='grid gap-3 md:grid-cols-2'>
							<PricingLineEditor
								title='Line A'
								line={lineA}
								items={items}
								onChange={setLineA}
							/>
							<PricingLineEditor
								title='Line B'
								line={lineB}
								items={items}
								onChange={setLineB}
							/>
						</div>

						<Button
							onClick={() => {
								void runPricingSimulation()
							}}
							disabled={pricingSimulation.isPending}
						>
							<RefreshCw className='mr-1.5 size-4' />
							{pricingSimulation.isPending ? 'Simulating...' : 'Run Simulation'}
						</Button>

						{simulated ? (
							<div className='rounded-lg border border-border/60 bg-background/80 p-3'>
								<p className='font-medium text-sm'>
									Subtotal ${simulated.subtotal.toFixed(2)} · Tax $
									{simulated.taxAmount.toFixed(2)} · Total $
									{simulated.total.toFixed(2)}
								</p>
								<ul className='mt-2 space-y-1 text-muted-foreground text-xs'>
									{simulated.lines.map((line, index) => (
										<li key={`${line.itemId}-${index}`}>
											{line.itemId}: qty total ${line.totalWithTax.toFixed(2)} (
											{line.taxPolicyCode ?? 'no-tax-policy'})
										</li>
									))}
								</ul>
							</div>
						) : null}
					</CardContent>
				</Card>

				<Card className='border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-background to-background'>
					<CardHeader>
						<CardTitle>Returns to Credit Memo</CardTitle>
						<CardDescription>
							Create a return authorization and immediately post linked credit
							memo artifacts.
						</CardDescription>
					</CardHeader>
					<CardContent className='space-y-4'>
						<div className='space-y-2'>
							<Label>Customer</Label>
							<Select
								value={returnCustomerId}
								onValueChange={(value) => setReturnCustomerId(value ?? '')}
							>
								<SelectTrigger>
									<SelectValue placeholder='Select customer' />
								</SelectTrigger>
								<SelectContent>
									{customers.map((customer) => (
										<SelectItem key={customer._id} value={customer._id}>
											{customer.name ?? customer._id}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className='space-y-2'>
							<Label>Source Invoice (optional)</Label>
							<Select
								value={returnInvoiceNo}
								onValueChange={(value) => setReturnInvoiceNo(value ?? '')}
							>
								<SelectTrigger>
									<SelectValue placeholder='Select invoice' />
								</SelectTrigger>
								<SelectContent>
									{invoices.map((invoice) => (
										<SelectItem
											key={invoice._id}
											value={invoice.invoiceNo ?? invoice._id}
										>
											{invoice.invoiceNo ?? invoice._id}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className='grid gap-3 md:grid-cols-3'>
							<div className='space-y-2'>
								<Label>Item</Label>
								<Select
									value={returnItemId}
									onValueChange={(value) => setReturnItemId(value ?? '')}
								>
									<SelectTrigger>
										<SelectValue placeholder='Select item' />
									</SelectTrigger>
									<SelectContent>
										{items.map((item) => (
											<SelectItem key={item._id} value={item._id}>
												{item.itemNo ?? item._id} · {item.description ?? 'Item'}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div className='space-y-2'>
								<Label>Qty</Label>
								<Input
									value={returnQuantity}
									onChange={(event) => setReturnQuantity(event.target.value)}
								/>
							</div>
							<div className='space-y-2'>
								<Label>Unit Price</Label>
								<Input
									value={returnUnitPrice}
									onChange={(event) => setReturnUnitPrice(event.target.value)}
								/>
							</div>
						</div>

						<Button
							onClick={() => {
								void handleCreateReturnCredit()
							}}
							disabled={
								ledgerCreditMemoMutations.create.isPending ||
								postCreditMemo.isPending
							}
						>
							<Plus className='mr-1.5 size-4' />
							Create & Post Credit Memo
						</Button>
					</CardContent>
				</Card>
			</div>

			<div className='grid gap-6 xl:grid-cols-2'>
				<Card>
					<CardHeader>
						<CardTitle>Reservation Operations Console</CardTitle>
						<CardDescription>
							Monitor aging/conflicts and run controlled release/reassignment.
						</CardDescription>
					</CardHeader>
					<CardContent className='space-y-4'>
						<div className='grid gap-3 lg:grid-cols-4'>
							<Input
								value={releaseReason}
								onChange={(event) => setReleaseReason(event.target.value)}
								placeholder='Release reason'
							/>
							<Select
								value={selectedReservationId}
								onValueChange={(value) => setSelectedReservationId(value ?? '')}
							>
								<SelectTrigger>
									<SelectValue placeholder='Select reservation' />
								</SelectTrigger>
								<SelectContent>
									{reservationItems
										.filter((row) => row.status === 'ACTIVE')
										.map((row) => (
											<SelectItem key={row._id} value={row._id}>
												{row.reservationNo} · {row.itemId}
											</SelectItem>
										))}
								</SelectContent>
							</Select>
							<Select
								value={targetSalesLineId}
								onValueChange={(value) => setTargetSalesLineId(value ?? '')}
							>
								<SelectTrigger>
									<SelectValue placeholder='Target sales line' />
								</SelectTrigger>
								<SelectContent>
									{salesLines.map((line) => (
										<SelectItem key={line._id} value={line._id}>
											{line.documentNo} · line {line.lineNo} · {line.itemId}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<Button
								variant='outline'
								onClick={() => {
									void handleReassignReservation()
								}}
								disabled={
									!selectedReservationId ||
									!targetSalesLineId ||
									reassignControlled.isPending
								}
							>
								Reassign Selected
							</Button>
						</div>

						<div className='overflow-hidden rounded-xl border border-border/60'>
							<ReservationsGrid
								variant='flat'
								height={Math.max(windowSize.height - 320, 300)}
							>
								<ReservationsGrid.Header className='border-border/50 border-b bg-muted/20 px-4 py-3'>
									<ReservationsGrid.Toolbar filter sort search />
								</ReservationsGrid.Header>
								<ReservationsGrid.Columns>
									<ReservationsGrid.Column
										accessorKey='reservationNo'
										title='Reservation'
									/>
									<ReservationsGrid.Column
										accessorKey='documentNo'
										title='Order No'
									/>
									<ReservationsGrid.Column accessorKey='itemId' title='Item' />
									<ReservationsGrid.Column
										accessorKey='quantity'
										title='Qty'
										cellVariant='number'
									/>
									<ReservationsGrid.Column
										accessorKey='status'
										title='Status'
										cell={({ row }) => (
											<StatusBadge status={row.original.status} />
										)}
									/>
									<ReservationsGrid.Column
										id='actions'
										title='Actions'
										cell={({ row }) => (
											<Button
												size='sm'
												variant='outline'
												disabled={
													row.original.status !== 'ACTIVE' ||
													releaseControlled.isPending
												}
												onClick={() => {
													void handleReleaseReservation(row.original._id)
												}}
											>
												<RotateCcw className='mr-1.5 size-3.5' />
												Release
											</Button>
										)}
									/>
								</ReservationsGrid.Columns>
							</ReservationsGrid>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Credit Memo Ledger Linkage</CardTitle>
						<CardDescription>
							Track return authorizations through posted credit memo references.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className='overflow-hidden rounded-xl border border-border/60'>
							<CreditMemoGrid
								variant='flat'
								height={Math.max(windowSize.height - 320, 300)}
							>
								<CreditMemoGrid.Header className='border-border/50 border-b bg-muted/20 px-4 py-3'>
									<CreditMemoGrid.Toolbar filter sort search export />
								</CreditMemoGrid.Header>
								<CreditMemoGrid.Columns>
									<CreditMemoGrid.Column
										accessorKey='creditMemoNo'
										title='Credit Memo'
									/>
									<CreditMemoGrid.Column
										accessorKey='customerName'
										title='Customer'
									/>
									<CreditMemoGrid.Column
										accessorKey='appliesToInvoiceNo'
										title='Invoice Ref'
									/>
									<CreditMemoGrid.Column
										accessorKey='status'
										title='Status'
										cell={({ row }) => (
											<StatusBadge status={row.original.status} />
										)}
									/>
									<CreditMemoGrid.Column
										accessorKey='eInvoiceStatus'
										title='E-Invoice'
									/>
									<CreditMemoGrid.Column
										accessorKey='totalAmount'
										title='Amount'
										cellVariant='number'
										formatter={(value, formatter) =>
											formatter.currency(value.totalAmount)
										}
									/>
								</CreditMemoGrid.Columns>
							</CreditMemoGrid>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	)
}

function PricingLineEditor({
	title,
	line,
	items,
	onChange,
}: {
	title: string
	line: PricingLineInput
	items: Item[]
	onChange: (next: PricingLineInput) => void
}) {
	return (
		<div className='rounded-lg border border-border/60 bg-background/80 p-3'>
			<p className='font-medium text-sm'>{title}</p>
			<div className='mt-3 space-y-2'>
				<Select
					value={line.itemId}
					onValueChange={(itemId) =>
						onChange({ ...line, itemId: itemId ?? '' })
					}
				>
					<SelectTrigger>
						<SelectValue placeholder='Select item' />
					</SelectTrigger>
					<SelectContent>
						{items.map((item) => (
							<SelectItem key={item._id} value={item._id}>
								{item.itemNo ?? item._id} · {item.description ?? 'Item'}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				<div className='grid gap-2 sm:grid-cols-3'>
					<Input
						type='number'
						value={line.quantity}
						onChange={(event) =>
							onChange({ ...line, quantity: Number(event.target.value) })
						}
						placeholder='Qty'
					/>
					<Input
						type='number'
						value={line.unitPrice}
						onChange={(event) =>
							onChange({ ...line, unitPrice: Number(event.target.value) })
						}
						placeholder='Unit Price'
					/>
					<Input
						type='number'
						value={line.discountPercent}
						onChange={(event) =>
							onChange({ ...line, discountPercent: Number(event.target.value) })
						}
						placeholder='Discount %'
					/>
				</div>
			</div>
		</div>
	)
}
