import { useModuleData } from '../../hooks/use-data'
import { PageHeader } from '../_shared/page-header'

interface ModuleNotification {
	_id: string
	moduleId: string
	title: string
	body?: string | null
	status: 'UNREAD' | 'READ' | 'ARCHIVED'
	severity: 'INFO' | 'WARNING' | 'ERROR'
}

export default function NotificationsList() {
	const { DataGrid, windowSize } = useModuleData<'hub', ModuleNotification>(
		'hub',
		'notifications',
		'all',
	)

	return (
		<div className='space-y-4'>
			<PageHeader
				title='Notifications'
				description='Module notifications and alerts across the platform.'
			/>

			<DataGrid
				variant='minimal'
				height={Math.max(windowSize.height - 190, 390)}
			>
				<DataGrid.Header>
					<DataGrid.Toolbar filter sort search export />
				</DataGrid.Header>
				<DataGrid.Columns>
					<DataGrid.Column<ModuleNotification>
						accessorKey='moduleId'
						title='Module'
					/>
					<DataGrid.Column<ModuleNotification>
						accessorKey='title'
						title='Title'
					/>
					<DataGrid.Column<ModuleNotification>
						accessorKey='body'
						title='Body'
					/>
					<DataGrid.Column<ModuleNotification>
						accessorKey='status'
						title='Status'
						cellVariant='select'
					/>
					<DataGrid.Column<ModuleNotification>
						accessorKey='severity'
						title='Severity'
						cellVariant='select'
					/>
				</DataGrid.Columns>
			</DataGrid>
		</div>
	)
}
