import { useModuleData } from '@/app/_shell/hooks/use-data'
import { PageHeader } from '@/components/ui/json-render/dashboard-sections'
import { ReportActionItems } from '@/lib/json-render/components/report-action-items'
import { resolveSelectedIds } from '@/lib/json-render/components/resolve-selected-ids'
import {
	renderSpecColumns,
	type SpecListProps,
} from '@/lib/json-render/components/spec-list-helpers'

interface CustLedgerEntry {
	_id: string
	entryNo: number
	customerId: string
	customerName: string
	postingDate: string
	documentType: 'INVOICE' | 'CREDIT_MEMO' | 'PAYMENT'
	documentNo: string
	description: string
	amount: number
	remainingAmount: number
	open: boolean
	currency: string
}

interface CustomerLedgerListProps {
	specProps?: SpecListProps
}

export default function CustomerLedgerList({
	specProps,
}: CustomerLedgerListProps = {}) {
	const { DataGrid, windowSize } = useModuleData<'ledger', CustLedgerEntry>(
		'ledger',
		'customerLedger',
		'all',
	)

	return (
		<div className='space-y-8 pb-8'>
			<PageHeader
				title={specProps?.title ?? 'Customer Ledger Entries'}
				description={
					specProps?.description ??
					'Track all customer receivable transactions including invoices, credit memos, and payments.'
				}
			/>

			<div className='overflow-hidden rounded-xl border border-border/50 bg-background/50 shadow-sm backdrop-blur-xl'>
				<DataGrid
					withSelect
					variant='flat'
					height={Math.max(windowSize.height - 150, 400)}
				>
					<DataGrid.Header className='border-border/50 border-b bg-muted/20 px-6 py-4'>
						<DataGrid.Toolbar filter sort search export />
					</DataGrid.Header>

					<DataGrid.Columns>
						{specProps?.columns ? (
							renderSpecColumns<CustLedgerEntry>(
								DataGrid.Column as unknown as React.ComponentType<{
							accessorKey: string
							title: string
							cellVariant?: string
							handleEdit?: ((row: any) => void) | undefined
							[key: string]: unknown
						}>,
								specProps.columns,
							)
						) : (
							<>
								<DataGrid.Column<CustLedgerEntry>
									accessorKey='entryNo'
									title='Entry No.'
									cellVariant='number'
								/>
								<DataGrid.Column<CustLedgerEntry>
									accessorKey='customerName'
									title='Customer'
								/>
								<DataGrid.Column<CustLedgerEntry>
									accessorKey='postingDate'
									title='Posting Date'
									cellVariant='date'
									formatter={(v, f) => f.date(v.postingDate, { format: 'P' })}
								/>
								<DataGrid.Column<CustLedgerEntry>
									accessorKey='documentType'
									title='Document Type'
									cellVariant='select'
									opts={{
										options: [
											{ label: 'Invoice', value: 'INVOICE' },
											{ label: 'Credit Memo', value: 'CREDIT_MEMO' },
											{ label: 'Payment', value: 'PAYMENT' },
										],
									}}
								/>
								<DataGrid.Column<CustLedgerEntry>
									accessorKey='documentNo'
									title='Document No.'
								/>
								<DataGrid.Column<CustLedgerEntry>
									accessorKey='description'
									title='Description'
								/>
								<DataGrid.Column<CustLedgerEntry>
									accessorKey='amount'
									title='Amount'
									cellVariant='number'
									formatter={(v, f) => f.currency(v.amount)}
								/>
								<DataGrid.Column<CustLedgerEntry>
									accessorKey='remainingAmount'
									title='Remaining Amount'
									cellVariant='number'
									formatter={(v, f) => f.currency(v.remainingAmount)}
								/>
								<DataGrid.Column<CustLedgerEntry>
									accessorKey='open'
									title='Open'
									cellVariant='checkbox'
								/>
								<DataGrid.Column<CustLedgerEntry>
									accessorKey='currency'
									title='Currency'
								/>
							</>
						)}
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
							{(table, state) => (
								<ReportActionItems
									table={table}
									selectionState={state.selectionState}
									moduleId='ledger'
									entityId='customerLedger'
								/>
							)}
						</DataGrid.ActionBar.Group>
					</DataGrid.ActionBar>
				</DataGrid>
			</div>
		</div>
	)
}
