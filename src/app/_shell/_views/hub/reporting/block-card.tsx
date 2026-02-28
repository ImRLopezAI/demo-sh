import type { ReportBlock } from '@server/reporting/contracts'
import {
	AlignLeft,
	ChevronDown,
	ChevronUp,
	GripVertical,
	Heading,
	KeyRound,
	SeparatorHorizontal,
	Table2,
	Trash2,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import * as React from 'react'
import { SortableItemHandle } from '@/components/data-grid/ui/sortable'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { HeadingConfig } from './block-configs/heading'
import { KeyValueConfig } from './block-configs/key-value'
import { ParagraphConfig } from './block-configs/paragraph'
import { SpacerConfig } from './block-configs/spacer'
import { TableConfig } from './block-configs/table'
import type { BlockWithId } from './types'

const BLOCK_ICONS: Record<ReportBlock['kind'], LucideIcon> = {
	heading: Heading,
	keyValue: KeyRound,
	table: Table2,
	spacer: SeparatorHorizontal,
	paragraph: AlignLeft,
}

const BLOCK_LABELS: Record<ReportBlock['kind'], string> = {
	heading: 'Heading',
	keyValue: 'Key-Value',
	table: 'Data Table',
	spacer: 'Spacer',
	paragraph: 'Paragraph',
}

function getBlockSummary(block: BlockWithId): string {
	switch (block.kind) {
		case 'heading':
			return `"${block.text}" (H${block.level})`
		case 'keyValue':
			return `${block.key}: ${block.valuePath}`
		case 'table':
			return `${block.columns.length} cols${block.maxRows ? `, max ${block.maxRows} rows` : ''}`
		case 'spacer':
			return block.size === 'sm'
				? 'Small'
				: block.size === 'md'
					? 'Medium'
					: 'Large'
		case 'paragraph':
			return block.text
				? `${block.text.slice(0, 50)}${block.text.length > 50 ? '...' : ''}`
				: '(empty)'
	}
}

export function BlockCard({
	block,
	entityKey,
	onUpdate,
	onRemove,
}: {
	block: BlockWithId
	entityKey: string
	onUpdate: (patch: Partial<ReportBlock>) => void
	onRemove: () => void
}) {
	const [expanded, setExpanded] = React.useState(false)
	const Icon = BLOCK_ICONS[block.kind]

	return (
		<Card className='overflow-hidden'>
			<div className='flex items-center gap-2 px-3 py-2'>
				<SortableItemHandle className='shrink-0 text-muted-foreground hover:text-foreground'>
					<GripVertical className='size-4' aria-hidden='true' />
				</SortableItemHandle>

				<Icon
					className='size-4 shrink-0 text-muted-foreground'
					aria-hidden='true'
				/>

				<Badge variant='outline' className='shrink-0 text-[10px]'>
					{BLOCK_LABELS[block.kind]}
				</Badge>

				<span className='min-w-0 flex-1 truncate text-muted-foreground text-xs'>
					{getBlockSummary(block)}
				</span>

				<Button
					type='button'
					variant='ghost'
					size='sm'
					onClick={() => setExpanded(!expanded)}
					className='h-7 w-7 shrink-0 p-0'
				>
					{expanded ? (
						<ChevronUp className='size-3.5' aria-hidden='true' />
					) : (
						<ChevronDown className='size-3.5' aria-hidden='true' />
					)}
				</Button>

				<Button
					type='button'
					variant='ghost'
					size='sm'
					onClick={onRemove}
					className='h-7 w-7 shrink-0 p-0 text-muted-foreground hover:text-destructive'
				>
					<Trash2 className='size-3.5' aria-hidden='true' />
				</Button>
			</div>

			{expanded && (
				<div className='border-t border-border/60 px-3 py-3'>
					<BlockConfigSwitch
						block={block}
						entityKey={entityKey}
						onUpdate={onUpdate}
					/>
				</div>
			)}
		</Card>
	)
}

function BlockConfigSwitch({
	block,
	entityKey,
	onUpdate,
}: {
	block: BlockWithId
	entityKey: string
	onUpdate: (patch: Partial<ReportBlock>) => void
}) {
	switch (block.kind) {
		case 'heading':
			return (
				<HeadingConfig
					text={block.text}
					level={block.level}
					onChange={onUpdate}
				/>
			)
		case 'keyValue':
			return (
				<KeyValueConfig
					keyLabel={block.key}
					valuePath={block.valuePath}
					onChange={onUpdate}
				/>
			)
		case 'table':
			return (
				<TableConfig
					columns={block.columns}
					maxRows={block.maxRows}
					entityKey={entityKey}
					onChange={onUpdate}
				/>
			)
		case 'spacer':
			return <SpacerConfig size={block.size} onChange={onUpdate} />
		case 'paragraph':
			return <ParagraphConfig text={block.text} onChange={onUpdate} />
	}
}

export function BlockCardPreview({ blockId }: { blockId: string | number }) {
	return (
		<Card className='flex items-center gap-2 px-3 py-2 opacity-80'>
			<GripVertical
				className='size-4 text-muted-foreground'
				aria-hidden='true'
			/>
			<span className='text-muted-foreground text-xs'>
				Moving block {blockId}
			</span>
		</Card>
	)
}
