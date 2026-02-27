import { $rpc, useMutation, useQueryClient } from '@lib/rpc'
import { FileText, Mail, Plus } from 'lucide-react'
import * as React from 'react'
import { Button } from '@/components/ui/button'
import { useModuleData } from '../../hooks/use-data'
import { PageHeader } from '../_shared/page-header'
import {
	resolveSelectedIds,
	resolveSelectedRecords,
} from '../_shared/resolve-selected-ids'
import { StatusBadge } from '../_shared/status-badge'
import { useRecordSearchState } from '../_shared/use-record-search-state'
import { InvoiceCard } from './components/invoice-card'

interface SalesInvoiceHeader {
	_id: string
	invoiceNo: string
	status: 'DRAFT' | 'POSTED' | 'REVERSED'
	eInvoiceStatus:
		| 'DRAFT'
		| 'POSTED'
		| 'SUBMITTED'
		| 'ACCEPTED'
		| 'REJECTED'
		| 'CANCELED'
	customerId: string
	customerName: string
	salesOrderNo: string
	postingDate: string
	dueDate: string
	currency: string
	lineCount: number
	totalAmount: number
}

export default function InvoicesList() {
	const { close, openCreate, openDetail, selectedId } = useRecordSearchState()
	const queryClient = useQueryClient()

	const { DataGrid, windowSize } = useModuleData<'ledger', SalesInvoiceHeader>(
		'ledger',
		'invoices',
		'all',
	)

	const invalidate = React.useCallback(() => {
		void queryClient.invalidateQueries({
			queryKey: $rpc.ledger.invoices.key(),
		})
	}, [queryClient])

	const postInvoice = useMutation({
		...$rpc.ledger.invoices.postInvoice.mutationOptions({
			onSuccess: invalidate,
		}),
	})

	const submitEInvoice = useMutation({
		...$rpc.ledger.eInvoicing.submit.mutationOptions({
			onSuccess: invalidate,
		}),
	})

	const handleBulkPost = React.useCallback(
		async (ids: string[]) => {
			for (const id of ids) {
				await postInvoice.mutateAsync({ id })
			}
		},
		[postInvoice],
	)

	const handleBulkSubmitEInvoice = React.useCallback(
		async (ids: string[]) => {
			for (const id of ids) {
				await submitEInvoice.mutateAsync({
					documentType: 'INVOICE',
					id,
				})
			}
		},
		[submitEInvoice],
	)

	const handleEdit = React.useCallback(
		(row: SalesInvoiceHeader) => openDetail(row._id),
		[openDetail],
	)
	const handleNew = openCreate

	if (selectedId !== null) {
		return (
			<div className='space-y-8 pb-8'>
				<InvoiceCard
					selectedId={selectedId}
					onClose={close}
					presentation='page'
				/>
			</div>
		)
	}

	return (
		<div className='space-y-8 pb-8'>
			<PageHeader
				title='Sales Invoices'
				description='Manage electronic invoices and financial documents'
				actions={
					<Button
						size='sm'
						onClick={handleNew}
						className='shadow-sm transition-all hover:shadow-md'
					>
						<Plus className='mr-1.5 size-4' aria-hidden='true' />
						New Invoice
					</Button>
				}
			/>

			<div className='overflow-hidden rounded-xl border border-border/50 bg-background/50 shadow-sm backdrop-blur-xl'>
				<DataGrid
					variant='flat'
					height={Math.max(windowSize.height - 150, 400)}
					withSelect
				>
					<DataGrid.Header className='border-border/50 border-b bg-muted/20 px-6 py-4'>
						<DataGrid.Toolbar filter sort search export />
					</DataGrid.Header>
					<DataGrid.Columns>
						<DataGrid.Column<SalesInvoiceHeader>
							accessorKey='invoiceNo'
							title='Invoice No.'
							handleEdit={handleEdit}
						/>
						<DataGrid.Column<SalesInvoiceHeader>
							accessorKey='status'
							title='Status'
							cell={({ row }) => <StatusBadge status={row.original.status} />}
						/>
						<DataGrid.Column<SalesInvoiceHeader>
							accessorKey='eInvoiceStatus'
							title='E-Invoice'
							cell={({ row }) => (
								<StatusBadge status={row.original.eInvoiceStatus} />
							)}
						/>
						<DataGrid.Column<SalesInvoiceHeader>
							accessorKey='customerName'
							title='Customer'
						/>
						<DataGrid.Column<SalesInvoiceHeader>
							accessorKey='salesOrderNo'
							title='Sales Order No.'
						/>
						<DataGrid.Column<SalesInvoiceHeader>
							accessorKey='postingDate'
							title='Posting Date'
							cellVariant='date'
							formatter={(v, f) => f.date(v.postingDate, { format: 'P' })}
						/>
						<DataGrid.Column<SalesInvoiceHeader>
							accessorKey='dueDate'
							title='Due Date'
							cellVariant='date'
							formatter={(v, f) => f.date(v.dueDate, { format: 'P' })}
						/>
						<DataGrid.Column<SalesInvoiceHeader>
							accessorKey='currency'
							title='Currency'
						/>
						<DataGrid.Column<SalesInvoiceHeader>
							accessorKey='lineCount'
							title='Lines'
							cellVariant='number'
						/>
						<DataGrid.Column<SalesInvoiceHeader>
							accessorKey='totalAmount'
							title='Total Amount'
							cellVariant='number'
							formatter={(v, f) => f.currency(v.totalAmount)}
						/>
					</DataGrid.Columns>
					<DataGrid.ActionBar>
						<DataGrid.ActionBar.Selection>
							{(table, state) => (
								<span>
									{resolveSelectedIds(table, state.selectionState).length}{' '}
									selected
								</span>
							)}
						</DataGrid.ActionBar.Selection>
						<DataGrid.ActionBar.Separator />
						<DataGrid.ActionBar.Group>
							{(table, state) => {
								const records = resolveSelectedRecords(
									table,
									state.selectionState,
								)
								const ids = records.map((r) => r._id)
								const hasSelection = ids.length > 0
								const isBusy = postInvoice.isPending || submitEInvoice.isPending
								const allDraft = records.every((r) => r.status === 'DRAFT')
								const allPosted = records.every((r) => r.status === 'POSTED')
								const allEInvoiceDraft = records.every(
									(r) => r.eInvoiceStatus === 'DRAFT',
								)

								return (
									<>
										<DataGrid.ActionBar.Item
											disabled={!hasSelection || isBusy || !allDraft}
											onClick={() => {
												void handleBulkPost(ids)
											}}
										>
											<FileText className='size-3.5' aria-hidden='true' />
											Post
										</DataGrid.ActionBar.Item>
										<DataGrid.ActionBar.Item
											disabled={
												!hasSelection ||
												isBusy ||
												!allPosted ||
												!allEInvoiceDraft
											}
											onClick={() => {
												void handleBulkSubmitEInvoice(ids)
											}}
										>
											<Mail className='size-3.5' aria-hidden='true' />
											Submit E-Invoice
										</DataGrid.ActionBar.Item>
									</>
								)
							}}
						</DataGrid.ActionBar.Group>
					</DataGrid.ActionBar>
				</DataGrid>
			</div>
		</div>
	)
}
