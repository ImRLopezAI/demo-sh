import { Plus, Trash2, Wand2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'

interface TableColumn {
	key: string
	label: string
}

export function TableConfig({
	columns,
	onChange,
	datasetColumns,
}: {
	columns: TableColumn[]
	maxRows?: number
	entityKey: string
	onChange: (patch: { columns?: TableColumn[]; maxRows?: number }) => void
	datasetColumns?: TableColumn[]
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

	const canAutoDetect = datasetColumns && datasetColumns.length > 0

	function autoDetect() {
		if (canAutoDetect) {
			onChange({ columns: [...datasetColumns] })
		}
	}

	return (
		<div className='space-y-3'>
			<div className='flex items-center justify-between'>
				<Label className='text-muted-foreground text-xs'>
					Columns ({columns.length})
				</Label>
				<div className='flex gap-1.5'>
					<Button
						type='button'
						variant='ghost'
						size='sm'
						onClick={autoDetect}
						disabled={!canAutoDetect}
						className='h-7 gap-1 text-xs'
						title={
							canAutoDetect
								? 'Fill columns from dataset fields'
								: 'Configure a dataset first'
						}
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
						{canAutoDetect ? (
							<Select
								value={col.key}
								onValueChange={(val) => {
									if (!val) return
									const match = datasetColumns?.find((c) => c.key === val)
									updateColumn(i, {
										key: val,
										label: match?.label ?? col.label,
									})
								}}
							>
								<SelectTrigger className='h-8 text-xs'>
									<SelectValue placeholder='Select field...' />
								</SelectTrigger>
								<SelectContent>
									{datasetColumns?.map((dc) => (
										<SelectItem key={dc.key} value={dc.key}>
											{dc.key}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						) : (
							<Input
								value={col.key}
								onChange={(e) => updateColumn(i, { key: e.target.value })}
								placeholder='key'
								className='h-8 text-xs'
							/>
						)}
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
							<Trash2
								className='size-3 text-muted-foreground'
								aria-hidden='true'
							/>
						</Button>
					</div>
				))}
				{columns.length === 0 && (
					<p className='py-2 text-center text-muted-foreground text-xs'>
						{canAutoDetect
							? 'No columns. Click Auto-detect to populate from dataset.'
							: 'No columns. Configure a dataset to auto-detect, or add manually.'}
					</p>
				)}
			</div>
		</div>
	)
}
