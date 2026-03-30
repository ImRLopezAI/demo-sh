import type { ReportBlock } from '@server/reporting/contracts'
import {
	AlignLeft,
	Columns2,
	Heading,
	KeyRound,
	List,
	Minus,
	PanelTop,
	Plus,
	SeparatorHorizontal,
	Table2,
} from 'lucide-react'
import {
	Sortable,
	SortableContent,
	SortableItem,
	SortableOverlay,
} from '@/components/data-grid/ui/sortable'
import { Button } from '@/components/ui/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Label } from '@/components/ui/label'
import { BlockCard, BlockCardPreview } from './block-card'
import type { BlockWithId } from './types'

const CONTENT_BLOCKS = [
	{ kind: 'heading' as const, label: 'Heading', icon: Heading },
	{ kind: 'paragraph' as const, label: 'Paragraph', icon: AlignLeft },
	{ kind: 'keyValue' as const, label: 'Key-Value', icon: KeyRound },
	{ kind: 'keyValueGroup' as const, label: 'KV Group', icon: List },
]

const LAYOUT_BLOCKS = [
	{ kind: 'row' as const, label: 'Row (Columns)', icon: Columns2 },
	{ kind: 'spacer' as const, label: 'Spacer', icon: SeparatorHorizontal },
	{ kind: 'divider' as const, label: 'Divider', icon: Minus },
	{ kind: 'sectionHeader' as const, label: 'Section Header', icon: PanelTop },
]

const DATA_BLOCKS = [
	{ kind: 'table' as const, label: 'Data Table', icon: Table2 },
]

export function BlockBuilder({
	blocks,
	entityKey,
	onAdd,
	onRemove,
	onUpdate,
	onReorder,
	extraValuePaths,
	datasetColumns,
}: {
	blocks: BlockWithId[]
	entityKey: string
	onAdd: (kind: ReportBlock['kind']) => void
	onRemove: (id: string) => void
	onUpdate: (id: string, patch: Partial<ReportBlock>) => void
	onReorder: (newBlocks: BlockWithId[]) => void
	extraValuePaths?: Array<{ value: string; label: string }>
	datasetColumns?: Array<{ key: string; label: string }>
}) {
	return (
		<div className='space-y-3'>
			<div className='flex items-center justify-between'>
				<Label className='font-medium text-sm'>Report Blocks</Label>
				<DropdownMenu>
					<DropdownMenuTrigger
						render={
							<Button
								type='button'
								variant='outline'
								size='sm'
								className='h-7 gap-1 text-xs'
							>
								<Plus className='size-3' aria-hidden='true' />
								Add Block
							</Button>
						}
					/>
					<DropdownMenuContent align='end'>
						<DropdownMenuGroup>
							<DropdownMenuLabel>Content</DropdownMenuLabel>
							{CONTENT_BLOCKS.map((opt) => (
								<DropdownMenuItem
									key={opt.kind}
									onClick={() => onAdd(opt.kind)}
									className='gap-2'
								>
									<opt.icon className='size-4' aria-hidden='true' />
									{opt.label}
								</DropdownMenuItem>
							))}
						</DropdownMenuGroup>
						<DropdownMenuSeparator />
						<DropdownMenuGroup>
							<DropdownMenuLabel>Layout</DropdownMenuLabel>
							{LAYOUT_BLOCKS.map((opt) => (
								<DropdownMenuItem
									key={opt.kind}
									onClick={() => onAdd(opt.kind)}
									className='gap-2'
								>
									<opt.icon className='size-4' aria-hidden='true' />
									{opt.label}
								</DropdownMenuItem>
							))}
						</DropdownMenuGroup>
						<DropdownMenuSeparator />
						<DropdownMenuGroup>
							<DropdownMenuLabel>Data</DropdownMenuLabel>
							{DATA_BLOCKS.map((opt) => (
								<DropdownMenuItem
									key={opt.kind}
									onClick={() => onAdd(opt.kind)}
									className='gap-2'
								>
									<opt.icon className='size-4' aria-hidden='true' />
									{opt.label}
								</DropdownMenuItem>
							))}
						</DropdownMenuGroup>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>

			{blocks.length === 0 ? (
				<div className='flex h-32 items-center justify-center rounded-lg border border-border/60 border-dashed'>
					<p className='text-muted-foreground text-xs'>
						No blocks yet. Click "Add Block" to start building your report
						layout.
					</p>
				</div>
			) : (
				<Sortable
					value={blocks}
					onValueChange={onReorder}
					getItemValue={(b: BlockWithId) => b._id}
				>
					<SortableContent className='space-y-2'>
						{blocks.map((block) => (
							<SortableItem key={block._id} value={block._id}>
								<BlockCard
									block={block}
									entityKey={entityKey}
									onUpdate={(patch) => onUpdate(block._id, patch)}
									onRemove={() => onRemove(block._id)}
									extraValuePaths={extraValuePaths}
									datasetColumns={datasetColumns}
								/>
							</SortableItem>
						))}
					</SortableContent>
					<SortableOverlay>
						{({ value }) => <BlockCardPreview blockId={value} />}
					</SortableOverlay>
				</Sortable>
			)}
		</div>
	)
}
