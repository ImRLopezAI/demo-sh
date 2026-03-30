import * as React from 'react'
import { useModuleList } from '@/app/_shell/hooks/use-data'
import type { SpecWorkbenchProps } from '@/lib/json-render/components/spec-workbench-helpers'
import { ActionBar } from './action-bar'
import { CustomerSearchDialog } from './customer-search-dialog'
import { Numpad } from './numpad'
import { PaymentDialog } from './payment-dialog'
import { ProductGrid } from './product-grid'
import { SessionSelectDialog } from './session-select-dialog'
import { TerminalHeader } from './terminal-header'
import { TransactionJournal } from './transaction-journal'
import { usePosTerminal } from './use-pos-terminal'

interface CatalogItem {
	_id: string
	itemNo?: string
	description?: string
	unitPrice?: number
	type?: string
	barcode?: string
}

interface PosTerminalViewProps {
	specProps?: SpecWorkbenchProps
}

export default function PosTerminalView({
	specProps: _specProps,
}: PosTerminalViewProps = {}) {
	const {
		state,
		dispatch,
		totals,
		addItem,
		completeSale,
		voidTransaction,
		isOnline,
		pendingSyncCount,
		isSyncingQueue,
		lastSyncError,
		syncOfflineQueueNow,
	} = usePosTerminal()
	const [customerDialogOpen, setCustomerDialogOpen] = React.useState(false)

	const { data: itemsData, isLoading: itemsLoading } = useModuleList(
		'market',
		'items',
		{ limit: 200 },
	)
	const items = ((itemsData as unknown as { items?: CatalogItem[] })?.items ??
		[]) as CatalogItem[]

	return (
		<div className='-m-4 flex h-[calc(100dvh-3rem)] flex-col md:-m-6'>
			<TerminalHeader
				session={state.session}
				customer={state.customer}
				isOnline={isOnline}
				pendingSyncCount={pendingSyncCount}
				isSyncingQueue={isSyncingQueue}
				lastSyncError={lastSyncError}
				onSyncNow={syncOfflineQueueNow}
			/>

			<div className='flex flex-1 overflow-hidden'>
				<TransactionJournal
					cart={state.cart}
					selectedLineId={state.selectedLineId}
					totals={totals}
					dispatch={dispatch}
				/>

				<div className='flex flex-1 flex-col overflow-hidden'>
					<ProductGrid
						items={items}
						isLoading={itemsLoading}
						searchQuery={state.searchQuery}
						categoryFilter={state.categoryFilter}
						dispatch={dispatch}
						onAddItem={addItem}
					/>

					<Numpad
						numpadTarget={state.numpadTarget}
						numpadBuffer={state.numpadBuffer}
						hasSelectedLine={state.selectedLineId !== null}
						dispatch={dispatch}
					/>
				</div>
			</div>

			<ActionBar
				totals={totals}
				dispatch={dispatch}
				onVoid={voidTransaction}
				onCustomerSearch={() => setCustomerDialogOpen(true)}
			/>

			{/* Dialogs */}
			<SessionSelectDialog open={state.sessionDialogOpen} dispatch={dispatch} />

			<PaymentDialog
				open={state.paymentDialogOpen}
				onOpenChange={(open) =>
					dispatch({ type: open ? 'OPEN_PAYMENT' : 'CLOSE_PAYMENT' })
				}
				totals={totals}
				onComplete={completeSale}
			/>

			<CustomerSearchDialog
				open={customerDialogOpen}
				onOpenChange={setCustomerDialogOpen}
				dispatch={dispatch}
			/>
		</div>
	)
}
