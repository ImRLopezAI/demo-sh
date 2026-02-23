import { $rpc, useMutation, useQueryClient } from '@lib/rpc'
import { FileCheck, FileWarning, RefreshCw, Send } from 'lucide-react'
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
import { useModuleData, useModuleList } from '../../hooks/use-data'
import { PageHeader } from '../_shared/page-header'
import { StatusBadge } from '../_shared/status-badge'
import { useEntityMutations } from '../_shared/use-entity'

type Customer = { _id: string; name?: string }
type Item = { _id: string; itemNo?: string; description?: string }
type Invoice = {
	_id: string
	invoiceNo?: string
	customerId?: string
	status?: string
}

type CreditMemo = {
	_id: string
	creditMemoNo: string
	status: 'DRAFT' | 'POSTED' | 'CANCELED'
	eInvoiceStatus: string
	customerId: string
	customerName?: string | null
	appliesToInvoiceNo?: string | null
	totalAmount: number
	totalTaxAmount: number
}

type Submission = {
	_id: string
	submissionNo: string
	documentType: 'INVOICE' | 'CREDIT_MEMO'
	documentNo: string
	documentId: string
	status:
		| 'DRAFT'
		| 'POSTED'
		| 'SUBMITTED'
		| 'ACCEPTED'
		| 'REJECTED'
		| 'CANCELED'
	attemptNo: number
	providerRef?: string | null
	lastError?: string | null
}

type CustomerLedgerEntry = {
	_id: string
	entryNo: number
	customerId: string
	postingDate?: string | null
	documentType: string
	documentNo?: string | null
	description?: string | null
	amount: number
	remainingAmount: number
	open: boolean
	currency: string
}

export default function CollectionsComplianceView() {
	const queryClient = useQueryClient()
	const [customerId, setCustomerId] = React.useState('')
	const [invoiceNo, setInvoiceNo] = React.useState('')
	const [itemId, setItemId] = React.useState('')
	const [quantity, setQuantity] = React.useState('1')
	const [unitPrice, setUnitPrice] = React.useState('20')
	const [followUpAssignee, setFollowUpAssignee] =
		React.useState('collections-agent')

	const customers = (useModuleList('market', 'customers', { limit: 120 }).data
		?.items ?? []) as Customer[]
	const items = (useModuleList('market', 'items', { limit: 200 }).data?.items ??
		[]) as Item[]
	const invoices = (useModuleList('ledger', 'invoices', { limit: 120 }).data
		?.items ?? []) as Invoice[]

	const creditMemoMutations = useEntityMutations('ledger', 'creditMemos')
	const creditMemoLineMutations = useEntityMutations(
		'ledger',
		'creditMemoLines',
	)
	const createTask = useEntityMutations('hub', 'operationTasks').create
	const createNotification = useEntityMutations('hub', 'notifications').create

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

	const submitEinvoice = useMutation({
		...$rpc.ledger.eInvoicing.submit.mutationOptions({
			onSuccess: () => {
				void queryClient.invalidateQueries({
					queryKey: $rpc.ledger.eInvoiceSubmissions.key(),
				})
				void queryClient.invalidateQueries({
					queryKey: $rpc.ledger.invoices.key(),
				})
				void queryClient.invalidateQueries({
					queryKey: $rpc.ledger.creditMemos.key(),
				})
			},
		}),
	})

	const resolveEinvoice = useMutation({
		...$rpc.ledger.eInvoicing.resolveSubmission.mutationOptions({
			onSuccess: () => {
				void queryClient.invalidateQueries({
					queryKey: $rpc.ledger.eInvoiceSubmissions.key(),
				})
			},
		}),
	})

	const retryEinvoice = useMutation({
		...$rpc.ledger.eInvoicing.retryRejected.mutationOptions({
			onSuccess: () => {
				void queryClient.invalidateQueries({
					queryKey: $rpc.ledger.eInvoiceSubmissions.key(),
				})
			},
		}),
	})

	const { DataGrid: CreditMemoGrid, windowSize } = useModuleData<
		'ledger',
		CreditMemo
	>('ledger', 'creditMemos', 'overview')
	const { DataGrid: SubmissionGrid } = useModuleData<'ledger', Submission>(
		'ledger',
		'eInvoiceSubmissions',
		'overview',
	)
	const { DataGrid: LedgerGrid } = useModuleData<'ledger', CustomerLedgerEntry>(
		'ledger',
		'customerLedger',
		'overview',
	)

	const createCreditMemo = React.useCallback(async () => {
		if (!customerId || !itemId) return
		const qty = Math.max(1, Number.parseFloat(quantity) || 1)
		const price = Math.max(0, Number.parseFloat(unitPrice) || 0)
		const lineAmount = Number((qty * price).toFixed(2))

		const created = await creditMemoMutations.create.mutateAsync({
			creditMemoNo: '',
			status: 'DRAFT',
			eInvoiceStatus: 'DRAFT',
			customerId,
			appliesToInvoiceNo: invoiceNo || undefined,
			postingDate: new Date().toISOString(),
			currency: 'USD',
			taxJurisdiction: 'US-DEFAULT',
			totalTaxAmount: 0,
		})

		await creditMemoLineMutations.create.mutateAsync({
			creditMemoNo: created.creditMemoNo,
			lineNo: 1,
			itemId,
			quantity: qty,
			unitPrice: price,
			lineAmount,
			taxRatePercent: 0,
			taxAmount: 0,
		})
	}, [
		creditMemoLineMutations.create,
		creditMemoMutations.create,
		customerId,
		invoiceNo,
		itemId,
		quantity,
		unitPrice,
	])

	const assignCollectionsFollowUp = React.useCallback(
		async (row: CustomerLedgerEntry) => {
			await createTask.mutateAsync({
				taskNo: '',
				moduleId: 'ledger',
				title: `Collections follow-up ${row.documentNo ?? row.entryNo}`,
				description: `Outstanding amount ${row.remainingAmount.toFixed(2)} on ${row.documentType}.`,
				status: 'OPEN',
				priority: row.remainingAmount > 5000 ? 'CRITICAL' : 'HIGH',
				assigneeUserId: followUpAssignee || undefined,
			})
			await createNotification.mutateAsync({
				moduleId: 'ledger',
				title: `Collection follow-up created for ${row.documentNo ?? row.entryNo}`,
				body: `Outstanding amount: ${row.remainingAmount.toFixed(2)} ${row.currency}`,
				status: 'UNREAD',
				severity: row.remainingAmount > 5000 ? 'ERROR' : 'WARNING',
			})
		},
		[createNotification, createTask, followUpAssignee],
	)

	return (
		<div className='space-y-8 pb-8'>
			<PageHeader
				title='Collections & Compliance Operations'
				description='Manage credit memo lifecycle, e-invoice queue outcomes, and receivables follow-up workflows.'
			/>

			<div className='grid gap-6 xl:grid-cols-2'>
				<Card className='border-sky-500/30 bg-gradient-to-br from-sky-500/10 via-background to-background'>
					<CardHeader>
						<CardTitle className='flex items-center gap-2'>
							<FileCheck className='size-4' />
							Credit Memo Workspace
						</CardTitle>
						<CardDescription>
							Create return credits, post entries, and keep invoice linkage
							explicit.
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
								<Label>Applies To Invoice</Label>
								<Select
									value={invoiceNo}
									onValueChange={(value) => setInvoiceNo(value ?? '')}
								>
									<SelectTrigger>
										<SelectValue placeholder='Optional invoice reference' />
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
						</div>
						<div className='grid gap-3 md:grid-cols-3'>
							<div className='space-y-2'>
								<Label>Item</Label>
								<Select
									value={itemId}
									onValueChange={(value) => setItemId(value ?? '')}
								>
									<SelectTrigger>
										<SelectValue placeholder='Item' />
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
									value={quantity}
									onChange={(event) => setQuantity(event.target.value)}
								/>
							</div>
							<div className='space-y-2'>
								<Label>Unit Price</Label>
								<Input
									value={unitPrice}
									onChange={(event) => setUnitPrice(event.target.value)}
								/>
							</div>
						</div>
						<div className='flex flex-wrap gap-2'>
							<Button
								onClick={() => {
									void createCreditMemo()
								}}
								disabled={creditMemoMutations.create.isPending}
							>
								Create Draft Credit Memo
							</Button>
						</div>
					</CardContent>
				</Card>

				<Card className='border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-background to-background'>
					<CardHeader>
						<CardTitle className='flex items-center gap-2'>
							<FileWarning className='size-4' />
							E-Invoice Operations Center
						</CardTitle>
						<CardDescription>
							Submit, resolve, and retry provider interactions with queue
							visibility.
						</CardDescription>
					</CardHeader>
					<CardContent className='space-y-4'>
						<p className='text-muted-foreground text-sm'>
							Use row actions in both grids below to post credit memos, submit
							e-invoices, resolve callbacks, and retry rejected attempts.
						</p>
						<div className='flex items-center gap-2 text-muted-foreground text-xs'>
							<RefreshCw className='size-3.5' />
							Queue updates automatically after every operation.
						</div>
					</CardContent>
				</Card>
			</div>

			<div className='grid gap-6 xl:grid-cols-2'>
				<Card>
					<CardHeader>
						<CardTitle>Credit Memo Queue</CardTitle>
					</CardHeader>
					<CardContent>
						<div className='overflow-hidden rounded-xl border border-border/60'>
							<CreditMemoGrid
								variant='flat'
								height={Math.max(windowSize.height - 360, 280)}
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
										id='actions'
										title='Actions'
										cell={({ row }) => (
											<div className='flex flex-wrap gap-1'>
												<Button
													size='sm'
													variant='outline'
													onClick={() => {
														void postCreditMemo.mutateAsync({
															id: row.original._id,
														})
													}}
													disabled={
														postCreditMemo.isPending ||
														row.original.status !== 'DRAFT'
													}
												>
													Post
												</Button>
												<Button
													size='sm'
													variant='outline'
													onClick={() => {
														void submitEinvoice.mutateAsync({
															documentType: 'CREDIT_MEMO',
															id: row.original._id,
															force: false,
														})
													}}
													disabled={
														submitEinvoice.isPending ||
														row.original.status !== 'POSTED'
													}
												>
													<Send className='size-3.5' />
												</Button>
											</div>
										)}
									/>
								</CreditMemoGrid.Columns>
							</CreditMemoGrid>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>E-Invoice Submission Queue</CardTitle>
					</CardHeader>
					<CardContent>
						<div className='overflow-hidden rounded-xl border border-border/60'>
							<SubmissionGrid
								variant='flat'
								height={Math.max(windowSize.height - 360, 280)}
							>
								<SubmissionGrid.Header className='border-border/50 border-b bg-muted/20 px-4 py-3'>
									<SubmissionGrid.Toolbar filter sort search export />
								</SubmissionGrid.Header>
								<SubmissionGrid.Columns>
									<SubmissionGrid.Column
										accessorKey='submissionNo'
										title='Submission'
									/>
									<SubmissionGrid.Column
										accessorKey='documentType'
										title='Document Type'
									/>
									<SubmissionGrid.Column
										accessorKey='documentNo'
										title='Document No'
									/>
									<SubmissionGrid.Column
										accessorKey='status'
										title='Status'
										cell={({ row }) => (
											<StatusBadge status={row.original.status} />
										)}
									/>
									<SubmissionGrid.Column
										accessorKey='attemptNo'
										title='Attempt'
										cellVariant='number'
									/>
									<SubmissionGrid.Column
										id='actions'
										title='Actions'
										cell={({ row }) => (
											<div className='flex flex-wrap gap-1'>
												<Button
													size='sm'
													variant='outline'
													onClick={() => {
														void resolveEinvoice.mutateAsync({
															submissionId: row.original._id,
															status: 'ACCEPTED',
															message: 'Accepted by compliance ops',
														})
													}}
													disabled={
														resolveEinvoice.isPending ||
														row.original.status !== 'SUBMITTED'
													}
												>
													Accept
												</Button>
												<Button
													size='sm'
													variant='outline'
													onClick={() => {
														void resolveEinvoice.mutateAsync({
															submissionId: row.original._id,
															status: 'REJECTED',
															message: 'Rejected for validation review',
														})
													}}
													disabled={
														resolveEinvoice.isPending ||
														row.original.status !== 'SUBMITTED'
													}
												>
													Reject
												</Button>
												<Button
													size='sm'
													variant='outline'
													onClick={() => {
														void retryEinvoice.mutateAsync({
															submissionId: row.original._id,
														})
													}}
													disabled={
														retryEinvoice.isPending ||
														row.original.status !== 'REJECTED'
													}
												>
													Retry
												</Button>
											</div>
										)}
									/>
								</SubmissionGrid.Columns>
							</SubmissionGrid>
						</div>
					</CardContent>
				</Card>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Collections Cockpit</CardTitle>
					<CardDescription>
						Identify overdue receivables and open follow-up tasks.
					</CardDescription>
				</CardHeader>
				<CardContent className='space-y-4'>
					<div className='flex items-center gap-2'>
						<Label>Assignee</Label>
						<Input
							value={followUpAssignee}
							onChange={(event) => setFollowUpAssignee(event.target.value)}
							className='max-w-xs'
						/>
					</div>
					<div className='overflow-hidden rounded-xl border border-border/60'>
						<LedgerGrid
							variant='flat'
							height={Math.max(windowSize.height - 360, 300)}
						>
							<LedgerGrid.Header className='border-border/50 border-b bg-muted/20 px-4 py-3'>
								<LedgerGrid.Toolbar filter sort search export />
							</LedgerGrid.Header>
							<LedgerGrid.Columns>
								<LedgerGrid.Column
									accessorKey='entryNo'
									title='Entry'
									cellVariant='number'
								/>
								<LedgerGrid.Column
									accessorKey='documentType'
									title='Doc Type'
								/>
								<LedgerGrid.Column accessorKey='documentNo' title='Doc No' />
								<LedgerGrid.Column
									accessorKey='postingDate'
									title='Posting Date'
									cellVariant='date'
								/>
								<LedgerGrid.Column
									accessorKey='remainingAmount'
									title='Outstanding'
									cellVariant='number'
									formatter={(value, formatter) =>
										formatter.currency(value.remainingAmount)
									}
								/>
								<LedgerGrid.Column
									accessorKey='open'
									title='Open'
									cell={({ row }) => (
										<StatusBadge
											status={row.original.open ? 'OPEN' : 'SETTLED'}
										/>
									)}
								/>
								<LedgerGrid.Column
									id='followUp'
									title='Follow-up'
									cell={({ row }) => (
										<Button
											size='sm'
											variant='outline'
											onClick={() => {
												void assignCollectionsFollowUp(row.original)
											}}
											disabled={
												!row.original.open ||
												assignCollectionsFollowUp === null ||
												createTask.isPending
											}
										>
											Create Task
										</Button>
									)}
								/>
							</LedgerGrid.Columns>
						</LedgerGrid>
					</div>
				</CardContent>
			</Card>
		</div>
	)
}
