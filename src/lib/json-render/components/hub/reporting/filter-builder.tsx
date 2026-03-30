import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { ENTITY_FILTER_FIELDS } from './constants'
import { FilterRow } from './filter-row'
import type { FilterRow as FilterRowType } from './types'

export function FilterBuilder({
	filters,
	entityKey,
	onAdd,
	onRemove,
	onUpdate,
}: {
	filters: FilterRowType[]
	entityKey: string
	onAdd: () => void
	onRemove: (id: string) => void
	onUpdate: (id: string, patch: Partial<FilterRowType>) => void
}) {
	const fields = ENTITY_FILTER_FIELDS[entityKey] ?? []

	return (
		<div className='space-y-3'>
			<div className='flex items-center justify-between'>
				<Label className='font-medium text-sm'>Filters</Label>
				<Button
					type='button'
					variant='outline'
					size='sm'
					onClick={onAdd}
					className='h-7 gap-1 text-xs'
					disabled={fields.length === 0}
				>
					<Plus className='size-3' aria-hidden='true' />
					Add Filter
				</Button>
			</div>

			{fields.length === 0 ? (
				<p className='text-muted-foreground text-xs'>
					No filterable fields for this entity.
				</p>
			) : filters.length === 0 ? (
				<p className='text-muted-foreground text-xs'>
					No filters applied. Click "Add Filter" to narrow results.
				</p>
			) : (
				<div className='space-y-2'>
					{filters.map((filter) => (
						<FilterRow
							key={filter.id}
							filter={filter}
							fields={fields}
							onUpdate={(patch) => onUpdate(filter.id, patch)}
							onRemove={() => onRemove(filter.id)}
						/>
					))}
				</div>
			)}
		</div>
	)
}
