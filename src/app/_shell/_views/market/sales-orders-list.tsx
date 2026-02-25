import { Plus } from 'lucide-react'
import * as React from 'react'
import { useNavigate, useRouterState } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { useModuleData } from '../../hooks/use-data'
import { PageHeader } from '../_shared/page-header'
import { StatusBadge } from '../_shared/status-badge'
import { SalesOrderCard } from './components/sales-order-card'

interface SalesOrder {
	_id: string
	documentNo: string
	documentType: string
	status: string
	customerId: string
	customerName: string
	orderDate: string
	currency: string
	lineCount: number
	totalAmount: number
}

export default function SalesOrdersList() {
	const navigate = useNavigate()
	const location = useRouterState({ select: (state) => state.location })

	const { DataGrid, windowSize } = useModuleData<'market', SalesOrder>(
		'market',
		'salesOrders',
		'all',
	)

	const selectedId = React.useMemo(() => {
		if (!location.search || typeof location.search !== 'object') {
			return null
		}

		const searchRecord = location.search as Record<string, unknown>
		const scopeValue = searchRecord._recordScope
		const modeValue = searchRecord.mode
		const recordIdValue = searchRecord.recordId

		if (typeof scopeValue === 'string' && scopeValue !== location.pathname) {
			return null
		}

		if (modeValue === 'new') {
			return 'new'
		}

		if (
			modeValue === 'detail' &&
			typeof recordIdValue === 'string' &&
			recordIdValue.trim().length > 0
		) {
			return recordIdValue
		}

		return null
	}, [location.pathname, location.search])

	const clearRecordSearchState = React.useCallback(
		(previous: unknown) => {
			if (!previous || typeof previous !== 'object' || Array.isArray(previous)) {
				return {}
			}

			const nextSearch = { ...(previous as Record<string, unknown>) }
			delete nextSearch.mode
			delete nextSearch.recordId
			delete nextSearch._recordScope
			return nextSearch
		},
		[],
	)

	const handleEdit = React.useCallback(
		(row: SalesOrder) =>
			navigate({
				to: '/market/sales-orders',
				search: (previous) => {
					const baseSearch =
						!previous ||
						typeof previous !== 'object' ||
						Array.isArray(previous)
							? {}
							: { ...(previous as Record<string, unknown>) }

					return {
						...baseSearch,
						mode: 'detail',
						recordId: row._id,
						_recordScope: '/market/sales-orders',
					}
				},
			}),
		[navigate],
	)
	const handleNew = React.useCallback(() => {
		void navigate({
			to: '/market/sales-orders',
			search: (previous) => {
				const baseSearch =
					!previous ||
					typeof previous !== 'object' ||
					Array.isArray(previous)
						? {}
						: { ...(previous as Record<string, unknown>) }

				delete baseSearch.recordId

				return {
					...baseSearch,
					mode: 'new',
					_recordScope: '/market/sales-orders',
				}
			},
		})
	}, [navigate])

	const handleClose = React.useCallback(() => {
		void navigate({
			to: '/market/sales-orders',
			search: clearRecordSearchState,
		})
	}, [clearRecordSearchState, navigate])

	const handleCreated = React.useCallback(
		(recordId: string) => {
			if (!recordId) {
				void navigate({
					to: '/market/sales-orders',
					search: clearRecordSearchState,
				})
				return
			}

			void navigate({
				to: '/market/sales-orders',
				search: (previous) => {
					const baseSearch =
						!previous ||
						typeof previous !== 'object' ||
						Array.isArray(previous)
							? {}
							: { ...(previous as Record<string, unknown>) }

					return {
						...baseSearch,
						mode: 'detail',
						recordId,
						_recordScope: '/market/sales-orders',
					}
				},
			})
		},
		[clearRecordSearchState, navigate],
	)

	if (selectedId !== null) {
		return (
			<div className='space-y-8 pb-8'>
				<SalesOrderCard
					selectedId={selectedId}
					onClose={handleClose}
					onCreated={handleCreated}
					presentation='page'
				/>
			</div>
		)
	}

	return (
		<div className='space-y-8 pb-8'>
			<PageHeader
				title='Sales Orders'
				description='Manage customer orders, quotes, and returns'
				actions={
					<Button
						size='sm'
						onClick={handleNew}
						data-testid='sales-order-new-button'
						className='shadow-sm transition-all hover:shadow-md'
					>
						<Plus className='mr-1.5 size-4' aria-hidden='true' />
						New Order
					</Button>
				}
			/>

			<div className='overflow-hidden rounded-xl border border-border/50 bg-background/50 shadow-sm backdrop-blur-xl'>
				<DataGrid
					variant='lined'
					height={Math.max(windowSize.height - 240, 400)}
				>
					<DataGrid.Header className='border-border/50 border-b bg-muted/20 px-6 py-4'>
						<DataGrid.Toolbar filter sort search export />
					</DataGrid.Header>
					<DataGrid.Columns>
						<DataGrid.Column
							accessorKey='documentNo'
							title='Document No.'
							handleEdit={handleEdit}
						/>
						<DataGrid.Column
							accessorKey='documentType'
							title='Type'
							cellVariant='select'
						/>
						<DataGrid.Column
							accessorKey='status'
							title='Status'
							cell={({ row }) => <StatusBadge status={row.original.status} />}
						/>
						<DataGrid.Column accessorKey='customerName' title='Customer' />
						<DataGrid.Column
							accessorKey='orderDate'
							title='Order Date'
							cellVariant='date'
							formatter={(v, f) => f.date(v.orderDate, { format: 'P' })}
						/>
						<DataGrid.Column accessorKey='currency' title='Currency' />
						<DataGrid.Column
							accessorKey='lineCount'
							title='Lines'
							cellVariant='number'
						/>
						<DataGrid.Column
							accessorKey='totalAmount'
							title='Total Amount'
							cellVariant='number'
							formatter={(v, f) => f.currency(v.totalAmount)}
						/>
					</DataGrid.Columns>
				</DataGrid>
			</div>
		</div>
	)
}
