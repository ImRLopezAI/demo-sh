import { Plus } from 'lucide-react'
import * as React from 'react'
import { Button } from '@/components/ui/button'
import { useModuleData } from '../../hooks/use-data'
import { PageHeader } from '../_shared/page-header'
import { StatusBadge } from '../_shared/status-badge'
import { useRecordSearchState } from '../_shared/use-record-search-state'
import { TerminalCard } from './components/terminal-card'

interface Terminal {
	_id: string
	terminalCode: string
	name: string
	locationCode: string
	status: 'ONLINE' | 'OFFLINE' | 'MAINTENANCE'
	sessionCount: number
}

export default function TerminalsList() {
	const { close, openCreate, openDetail, selectedId } = useRecordSearchState()

	const { DataGrid, windowSize } = useModuleData<'pos', Terminal>(
		'pos',
		'terminals',
		'all',
	)

	const handleEdit = React.useCallback(
		(row: Terminal) => {
			openDetail(row._id)
		},
		[openDetail],
	)

	if (selectedId !== null) {
		return (
			<div className='space-y-8 pb-8'>
				<TerminalCard
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
				title='Terminals'
				description='Manage POS terminals and their status.'
				actions={
					<Button
						size='sm'
						onClick={openCreate}
						className='shadow-sm transition-all hover:shadow-md'
					>
						<Plus className='mr-1.5 size-3.5' aria-hidden='true' />
						New Terminal
					</Button>
				}
			/>

			<div className='overflow-hidden rounded-xl border border-border/50 bg-background/50 shadow-sm backdrop-blur-xl'>
				<DataGrid
					variant='flat'
					height={Math.max(windowSize.height - 150, 400)}
				>
					<DataGrid.Header className='border-border/50 border-b bg-muted/20 px-6 py-4'>
						<DataGrid.Toolbar filter sort search export />
					</DataGrid.Header>
					<DataGrid.Columns>
						<DataGrid.Column<Terminal>
							accessorKey='terminalCode'
							title='Terminal Code'
							handleEdit={handleEdit}
						/>
						<DataGrid.Column<Terminal> accessorKey='name' title='Name' />
						<DataGrid.Column<Terminal>
							accessorKey='locationCode'
							title='Location'
						/>
						<DataGrid.Column<Terminal>
							accessorKey='status'
							title='Status'
							cell={({ row }) => <StatusBadge status={row.original.status} />}
						/>
						<DataGrid.Column<Terminal>
							accessorKey='sessionCount'
							title='Sessions'
							cellVariant='number'
						/>
					</DataGrid.Columns>
				</DataGrid>
			</div>
		</div>
	)
}
