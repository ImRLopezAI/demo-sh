import { Plus, Trash2, Wand2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ENTITY_SUGGESTED_COLUMNS } from '../constants'

interface TableColumn {
	key: string
	label: string
}

export function TableConfig({
	columns,
	maxRows,
	entityKey,
	onChange,
}: {
	columns: TableColumn[]
	maxRows?: number
	entityKey: string
	onChange: (patch: {
		columns?: TableColumn[]
		maxRows?: number
	}) => void
}) {
	function addColumn() {
		onChange({ columns: [...columns, { key: '', label: '' }] })
	}

	function removeColumn(index: number) {
		onChange({ columns: columns.filter((_, i) => i !== index) })
	}

	function updateColumn(index: number, patch: Partial<TableColumn>) {
		onChange({
			columns: columns.map((col, i) =>
				i === index ? { ...col, ...patch } : col,
			),
		})
	}

	function autoDetect() {
		const suggested = ENTITY_SUGGESTED_COLUMNS[entityKey]
		if (suggested) {
			onChange({ columns: [...suggested] })
		}
	}

	return (
		<div className='space-y-3'>
			<div className='flex items-center justify-between'>
				<Label className='text-xs text-muted-foreground'>
					Columns ({columns.length})
				</Label>
				<div className='flex gap-1.5'>
					<Button
						type='button'
						variant='ghost'
						size='sm'
						onClick={autoDetect}
						className='h-7 gap-1 text-xs'
					>
						<Wand2 className='size-3' aria-hidden='true' />
						Auto-detect
					</Button>
					<Button
						type='button'
						variant='ghost'
						size='sm'
						onClick={addColumn}
						className='h-7 gap-1 text-xs'
					>
						<Plus className='size-3' aria-hidden='true' />
						Add
					</Button>
				</div>
			</div>
			<div className='space-y-2'>
				{columns.map((col, i) => (
					<div key={i} className='flex items-center gap-2'>
						<Input
							value={col.key}
							onChange={(e) => updateColumn(i, { key: e.target.value })}
							placeholder='key'
							className='h-8 text-xs'
						/>
						<Input
							value={col.label}
							onChange={(e) => updateColumn(i, { label: e.target.value })}
							placeholder='label'
							className='h-8 text-xs'
						/>
						<Button
							type='button'
							variant='ghost'
							size='sm'
							onClick={() => removeColumn(i)}
							className='h-8 w-8 shrink-0 p-0'
						>
							<Trash2 className='size-3 text-muted-foreground' aria-hidden='true' />
						</Button>
					</div>
				))}
				{columns.length === 0 && (
					<p className='py-2 text-center text-muted-foreground text-xs'>
						No columns. Click Add or Auto-detect to get started.
					</p>
				)}
			</div>
			<div className='space-y-1.5'>
				<Label className='text-xs text-muted-foreground'>Max Rows</Label>
				<Input
					type='number'
					value={maxRows ?? ''}
					onChange={(e) =>
						onChange({
							maxRows: e.target.value ? Number(e.target.value) : undefined,
						})
					}
					placeholder='60'
					className='h-8 w-24 text-xs'
					min={1}
					max={500}
				/>
			</div>
		</div>
	)
}
