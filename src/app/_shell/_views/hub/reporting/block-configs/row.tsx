import type { LeafBlock, ReportBlock } from '@server/reporting/contracts'
import type { LucideIcon } from 'lucide-react'
import {
	AlignLeft,
	ChevronDown,
	ChevronUp,
	Heading,
	KeyRound,
	List,
	Minus,
	PanelTop,
	Plus,
	SeparatorHorizontal,
	Table2,
	Trash2,
} from 'lucide-react'
import * as React from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Label } from '@/components/ui/label'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import { BlockConfigSwitch } from '../block-config-switch'
import type { BlockWithId } from '../types'

type RowBlock = Extract<ReportBlock, { kind: 'row' }>
type RowColumn = RowBlock['columns'][number]

const WIDTH_PRESETS: Array<{
	label: string
	widths: number[]
}> = [
	{ label: '50 / 50', widths: [50, 50] },
	{ label: '60 / 40', widths: [60, 40] },
	{ label: '70 / 30', widths: [70, 30] },
	{ label: '33 / 33 / 34', widths: [33, 33, 34] },
	{ label: '25 / 25 / 25 / 25', widths: [25, 25, 25, 25] },
]

const NESTABLE_KINDS: Array<{
	kind: LeafBlock['kind']
	label: string
	icon: LucideIcon
}> = [
	{ kind: 'heading', label: 'Heading', icon: Heading },
	{ kind: 'paragraph', label: 'Paragraph', icon: AlignLeft },
	{ kind: 'keyValue', label: 'Key-Value', icon: KeyRound },
	{ kind: 'keyValueGroup', label: 'KV Group', icon: List },
	{ kind: 'sectionHeader', label: 'Section Header', icon: PanelTop },
	{ kind: 'spacer', label: 'Spacer', icon: SeparatorHorizontal },
	{ kind: 'divider', label: 'Divider', icon: Minus },
	{ kind: 'table', label: 'Data Table', icon: Table2 },
]

const CHILD_BLOCK_ICONS: Record<LeafBlock['kind'], LucideIcon> = {
	heading: Heading,
	keyValue: KeyRound,
	table: Table2,
	spacer: SeparatorHorizontal,
	paragraph: AlignLeft,
	sectionHeader: PanelTop,
	keyValueGroup: List,
	divider: Minus,
}

function defaultForKind(kind: LeafBlock['kind']): LeafBlock {
	switch (kind) {
		case 'heading':
			return { kind: 'heading', text: 'Heading', level: 2 }
		case 'keyValue':
			return { kind: 'keyValue', key: '', valuePath: '' }
		case 'paragraph':
			return { kind: 'paragraph', text: '' }
		case 'spacer':
			return { kind: 'spacer', size: 'sm' }
		case 'sectionHeader':
			return { kind: 'sectionHeader', text: 'Section' }
		case 'keyValueGroup':
			return {
				kind: 'keyValueGroup',
				pairs: [{ key: '', valuePath: '' }],
			}
		case 'divider':
			return { kind: 'divider' }
		case 'table':
			return { kind: 'table', columns: [] }
	}
}

function getChildBlockLabel(block: LeafBlock): string {
	switch (block.kind) {
		case 'heading':
			return block.text ? `"${block.text.slice(0, 25)}"` : '(empty)'
		case 'keyValue':
			return block.key || block.valuePath || '(empty)'
		case 'paragraph':
			return block.text ? block.text.slice(0, 30) : '(empty)'
		case 'sectionHeader':
			return block.text || '(empty)'
		case 'keyValueGroup':
			return `${block.pairs.length} pair${block.pairs.length !== 1 ? 's' : ''}`
		case 'table':
			return `${block.columns.length} cols`
		case 'spacer':
			return block.size === 'sm'
				? 'Small'
				: block.size === 'md'
					? 'Medium'
					: 'Large'
		case 'divider':
			return 'Line'
	}
}

export function RowConfig({
	columns,
	onChange,
	entityKey,
	extraValuePaths,
	datasetColumns,
}: {
	columns: RowColumn[]
	onChange: (patch: Partial<RowBlock>) => void
	entityKey?: string
	extraValuePaths?: Array<{ value: string; label: string }>
	datasetColumns?: Array<{ key: string; label: string }>
}) {
	function applyPreset(presetIdx: number) {
		const preset = WIDTH_PRESETS[presetIdx]
		if (!preset) return
		const nextCols: RowColumn[] = preset.widths.map((w, i) => ({
			width: w,
			blocks: columns[i]?.blocks ?? [],
		}))
		onChange({ columns: nextCols })
	}

	function addBlockToColumn(colIdx: number, kind: LeafBlock['kind']) {
		const next = columns.map((col, i) =>
			i === colIdx
				? { ...col, blocks: [...col.blocks, defaultForKind(kind)] }
				: col,
		)
		onChange({ columns: next })
	}

	function removeBlockFromColumn(colIdx: number, blockIdx: number) {
		const next = columns.map((col, i) =>
			i === colIdx
				? { ...col, blocks: col.blocks.filter((_, j) => j !== blockIdx) }
				: col,
		)
		onChange({ columns: next })
	}

	function updateChildBlock(
		colIdx: number,
		blockIdx: number,
		patch: Partial<LeafBlock>,
	) {
		const next = columns.map((col, i) =>
			i === colIdx
				? {
						...col,
						blocks: col.blocks.map((b, j) =>
							j === blockIdx ? ({ ...b, ...patch } as LeafBlock) : b,
						),
					}
				: col,
		)
		onChange({ columns: next })
	}

	return (
		<div className='space-y-3'>
			<div className='space-y-1.5'>
				<Label className='text-muted-foreground text-xs'>
					Column Layout Preset
				</Label>
				<Select onValueChange={(v) => applyPreset(Number(v))}>
					<SelectTrigger>
						<SelectValue
							placeholder={columns.map((c) => `${c.width}%`).join(' / ')}
						/>
					</SelectTrigger>
					<SelectContent>
						{WIDTH_PRESETS.map((p, i) => (
							<SelectItem key={p.label} value={String(i)}>
								{p.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			<div className='space-y-2'>
				{columns.map((col, colIdx) => (
					<ColumnEditor
						key={colIdx}
						column={col}
						colIdx={colIdx}
						entityKey={entityKey}
						extraValuePaths={extraValuePaths}
						datasetColumns={datasetColumns}
						onAdd={(kind) => addBlockToColumn(colIdx, kind)}
						onRemove={(blockIdx) => removeBlockFromColumn(colIdx, blockIdx)}
						onUpdate={(blockIdx, patch) =>
							updateChildBlock(colIdx, blockIdx, patch)
						}
					/>
				))}
			</div>
		</div>
	)
}

function ColumnEditor({
	column,
	colIdx,
	entityKey,
	extraValuePaths,
	datasetColumns,
	onAdd,
	onRemove,
	onUpdate,
}: {
	column: RowColumn
	colIdx: number
	entityKey?: string
	extraValuePaths?: Array<{ value: string; label: string }>
	datasetColumns?: Array<{ key: string; label: string }>
	onAdd: (kind: LeafBlock['kind']) => void
	onRemove: (blockIdx: number) => void
	onUpdate: (blockIdx: number, patch: Partial<LeafBlock>) => void
}) {
	return (
		<div className='space-y-1.5 rounded-md border border-border/60 p-2'>
			<div className='flex items-center justify-between'>
				<Label className='text-[11px] text-muted-foreground'>
					Column {colIdx + 1} ({column.width}%)
				</Label>
				<DropdownMenu>
					<DropdownMenuTrigger
						render={
							<Button
								type='button'
								variant='ghost'
								size='sm'
								className='h-6 gap-1 px-2 text-[10px]'
							>
								<Plus className='size-3' aria-hidden='true' />
								Add
							</Button>
						}
					/>
					<DropdownMenuContent align='end'>
						{NESTABLE_KINDS.map((m) => (
							<DropdownMenuItem
								key={m.kind}
								onClick={() => onAdd(m.kind)}
								className='gap-2 text-xs'
							>
								<m.icon className='size-3.5' aria-hidden='true' />
								{m.label}
							</DropdownMenuItem>
						))}
					</DropdownMenuContent>
				</DropdownMenu>
			</div>

			{column.blocks.length === 0 ? (
				<p className='py-1 text-center text-[10px] text-muted-foreground'>
					Empty — click Add above
				</p>
			) : (
				<div className='space-y-1'>
					{column.blocks.map((block, bIdx) => (
						<ChildBlockCard
							key={bIdx}
							block={block}
							entityKey={entityKey}
							extraValuePaths={extraValuePaths}
							datasetColumns={datasetColumns}
							onUpdate={(patch) => onUpdate(bIdx, patch)}
							onRemove={() => onRemove(bIdx)}
						/>
					))}
				</div>
			)}
		</div>
	)
}

function ChildBlockCard({
	block,
	entityKey,
	extraValuePaths,
	datasetColumns,
	onUpdate,
	onRemove,
}: {
	block: LeafBlock
	entityKey?: string
	extraValuePaths?: Array<{ value: string; label: string }>
	datasetColumns?: Array<{ key: string; label: string }>
	onUpdate: (patch: Partial<LeafBlock>) => void
	onRemove: () => void
}) {
	const [expanded, setExpanded] = React.useState(false)
	const Icon = CHILD_BLOCK_ICONS[block.kind]

	// BlockConfigSwitch expects BlockWithId, create a wrapper with a dummy _id
	const blockWithId: BlockWithId = { ...block, _id: '__child__' } as BlockWithId

	return (
		<div className='rounded border border-border/40 bg-muted/20'>
			<div className='flex items-center gap-1.5 px-2 py-1'>
				<Icon
					className='size-3 shrink-0 text-muted-foreground'
					aria-hidden='true'
				/>
				<Badge variant='outline' className='shrink-0 px-1 py-0 text-[9px]'>
					{block.kind}
				</Badge>
				<span className='min-w-0 flex-1 truncate text-[10px] text-muted-foreground'>
					{getChildBlockLabel(block)}
				</span>
				<Button
					type='button'
					variant='ghost'
					size='sm'
					onClick={() => setExpanded(!expanded)}
					className='h-5 w-5 shrink-0 p-0'
				>
					{expanded ? (
						<ChevronUp className='size-3' aria-hidden='true' />
					) : (
						<ChevronDown className='size-3' aria-hidden='true' />
					)}
				</Button>
				<Button
					type='button'
					variant='ghost'
					size='sm'
					onClick={onRemove}
					className='h-5 w-5 shrink-0 p-0 text-muted-foreground hover:text-destructive'
				>
					<Trash2 className='size-3' aria-hidden='true' />
				</Button>
			</div>
			{expanded && (
				<div className='border-border/40 border-t px-2 py-2'>
					<BlockConfigSwitch
						block={blockWithId}
						entityKey={entityKey ?? ''}
						onUpdate={onUpdate as (patch: Partial<ReportBlock>) => void}
						extraValuePaths={extraValuePaths}
						datasetColumns={datasetColumns}
					/>
				</div>
			)}
		</div>
	)
}
