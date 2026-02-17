import { Plus } from 'lucide-react'
import * as React from 'react'
import { Button } from '@/components/ui/button'
import { useModuleData } from '../../hooks/use-data'
import { PageHeader } from '../_shared/page-header'
import { TaskCard } from './components/task-card'

interface OperationTask {
	_id: string
	taskNo: string
	moduleId: string
	title: string
	description?: string | null
	status: 'OPEN' | 'IN_PROGRESS' | 'BLOCKED' | 'DONE'
	priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
	assigneeUserId?: string | null
	dueDate?: string | null
}

export default function TasksList() {
	const [selectedId, setSelectedId] = React.useState<string | null>(null)

	const { DataGrid, windowSize } = useModuleData('hub', 'operationTasks')

	const handleEdit = React.useCallback(
		(row: OperationTask) => setSelectedId(row._id),
		[],
	)

	return (
		<div className='space-y-4'>
			<PageHeader
				title='Operation Tasks'
				description='Manage cross-module operational tasks.'
				actions={
					<Button onClick={() => setSelectedId('new')}>
						<Plus data-icon='inline-start' />
						New
					</Button>
				}
			/>

			<DataGrid variant='card' height={Math.max(windowSize.height - 190, 390)}>
				<DataGrid.Header>
					<DataGrid.Toolbar filter sort search export />
				</DataGrid.Header>
				<DataGrid.Columns>
					<DataGrid.Column
						accessorKey='taskNo'
						title='Task No.'
						handleEdit={handleEdit}
					/>
					<DataGrid.Column
						accessorKey='moduleId'
						title='Module'
					/>
					<DataGrid.Column accessorKey='title' title='Title' />
					<DataGrid.Column
						accessorKey='status'
						title='Status'
						cellVariant='select'
					/>
					<DataGrid.Column
						accessorKey='priority'
						title='Priority'
						cellVariant='select'
					/>
					<DataGrid.Column
						accessorKey='assigneeUserId'
						title='Assignee'
					/>
					<DataGrid.Column
						accessorKey='dueDate'
						title='Due Date'
						formatter={(v, f) => f.date(v.dueDate, { format: 'P' })}
					/>
				</DataGrid.Columns>
			</DataGrid>

			<TaskCard
				recordId={selectedId}
				open={selectedId !== null}
				onOpenChange={(open) => {
					if (!open) setSelectedId(null)
				}}
			/>
		</div>
	)
}
