import { Mail, User } from 'lucide-react'
import * as React from 'react'
import {
	Combobox,
	ComboboxContent,
	ComboboxInput,
	ComboboxItem,
	ComboboxList,
} from '@/components/ui/combobox'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import { useModuleList } from '@/app/_shell/hooks/use-data'
import type { CustomerInfo } from './use-pos-terminal'
import type { Action } from './terminal-types'

interface CustomerSearchDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	dispatch: React.Dispatch<Action>
}

interface Customer {
	_id: string
	customerNo?: string
	name?: string
	email?: string
}

const SKELETON_ROW_IDS = [
	'customer-skeleton-1',
	'customer-skeleton-2',
	'customer-skeleton-3',
	'customer-skeleton-4',
] as const

function normalizeInputValue(value: unknown): string {
	if (typeof value === 'string') return value
	if (typeof value === 'number') return String(value)
	if (Array.isArray(value)) return value.join(' ')
	return ''
}

export function CustomerSearchDialog({
	open,
	onOpenChange,
	dispatch,
}: CustomerSearchDialogProps) {
	const [search, setSearch] = React.useState('')
	const [selectedCustomerId, setSelectedCustomerId] = React.useState<
		string | null
	>(null)
	const deferredSearch = React.useDeferredValue(search)
	const searchQuery = React.useMemo(() => {
		const value = normalizeInputValue(deferredSearch).trim()
		return value.length > 0 ? value : undefined
	}, [deferredSearch])

	const { data, isLoading } = useModuleList('market', 'customers', {
		limit: 100,
		search: searchQuery,
	})

	const customers = ((data as unknown as { items?: Customer[] })?.items ??
		[]) as Customer[]
	const customerMap = React.useMemo(
		() => new Map(customers.map((customer) => [customer._id, customer])),
		[customers],
	)

	React.useEffect(() => {
		if (open) {
			setSearch('')
			setSelectedCustomerId(null)
		}
	}, [open])

	const handleInputValueChange = React.useCallback((nextValue: unknown) => {
		setSearch(normalizeInputValue(nextValue))
	}, [])

	const handleSelect = React.useCallback(
		(customerId: unknown) => {
			if (typeof customerId !== 'string') {
				setSelectedCustomerId(null)
				return
			}

			setSelectedCustomerId(customerId)

			const customer = customerMap.get(customerId)
			if (!customer) return

			const info: CustomerInfo = {
				id: customer._id,
				customerNo: customer.customerNo ?? '',
				name: customer.name ?? 'Unknown',
			}
			dispatch({ type: 'SET_CUSTOMER', customer: info })
			onOpenChange(false)
		},
		[customerMap, dispatch, onOpenChange],
	)

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className='sm:max-w-lg'>
				<DialogHeader className='pr-8'>
					<DialogTitle>Select Customer</DialogTitle>
					<DialogDescription>
						Search by customer number, name, or email.
					</DialogDescription>
				</DialogHeader>

				<div className='space-y-2'>
					<Combobox
						defaultOpen
						autoHighlight
						value={selectedCustomerId}
						onValueChange={handleSelect}
						inputValue={search}
						onInputValueChange={handleInputValueChange}
						filter={null}
					>
						<ComboboxInput
							className='w-full'
							showClear
							placeholder='Search customer\u2026'
							aria-label='Search customers'
							autoFocus
						/>
						<ComboboxContent className='p-0' sideOffset={8}>
							{isLoading ? (
								<div className='space-y-1 p-1'>
									{SKELETON_ROW_IDS.map((key) => (
										<div
											key={key}
											className='h-12 rounded-md bg-muted motion-safe:animate-pulse'
										/>
									))}
								</div>
							) : customers.length > 0 ? (
								<ComboboxList className='max-h-[320px] p-1'>
									{customers.map((customer) => (
										<ComboboxItem
											key={customer._id}
											value={customer._id}
											className='min-h-12 items-start gap-2.5 px-2.5 py-2'
										>
											<User
												className='mt-0.5 size-4 shrink-0 text-muted-foreground'
												aria-hidden='true'
											/>
											<div className='min-w-0 flex-1'>
												<p className='truncate font-medium text-sm'>
													{customer.name ?? 'Unknown'}
												</p>
												<p className='truncate text-muted-foreground text-xs'>
													{customer.customerNo ?? 'No customer number'}
												</p>
												{customer.email ? (
													<p className='mt-0.5 flex items-center gap-1 truncate text-[11px] text-muted-foreground/90'>
														<Mail
															className='size-3 shrink-0'
															aria-hidden='true'
														/>
														<span className='truncate'>{customer.email}</span>
													</p>
												) : null}
											</div>
										</ComboboxItem>
									))}
								</ComboboxList>
							) : (
								<div className='px-3 py-8 text-center text-muted-foreground text-sm'>
									No customers found
								</div>
							)}
						</ComboboxContent>
					</Combobox>
				</div>
			</DialogContent>
		</Dialog>
	)
}
