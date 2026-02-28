import type { ReportBlock } from '@server/reporting/contracts'
import {
	AlignLeft,
	Heading,
	KeyRound,
	Plus,
	SeparatorHorizontal,
	Table2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Label } from '@/components/ui/label'
import {
	Sortable,
	SortableContent,
	SortableItem,
	SortableOverlay,
} from '@/components/data-grid/ui/sortable'
import { BlockCard, BlockCardPreview } from './block-card'
import type { BlockWithId } from './types'

const ADD_BLOCK_OPTIONS = [
	{
		kind: 'heading' as const,
		label: 'Heading',
		icon: Heading,
	},
	{
		kind: 'keyValue' as const,
		label: 'Key-Value',
		icon: KeyRound,
	},
	{
		kind: 'table' as const,
		label: 'Data Table',
		icon: Table2,
	},
	{
		kind: 'spacer' as const,
		label: 'Spacer',
		icon: SeparatorHorizontal,
	},
	{
		kind: 'paragraph' as const,
		label: 'Paragraph',
		icon: AlignLeft,
	},
]

export function BlockBuilder({
	blocks,
	entityKey,
	onAdd,
	onRemove,
	onUpdate,
	onReorder,
}: {
	blocks: BlockWithId[]
	entityKey: string
	onAdd: (kind: ReportBlock['kind']) => void
	onRemove: (id: string) => void
	onUpdate: (id: string, patch: Partial<ReportBlock>) => void
	onReorder: (newBlocks: BlockWithId[]) => void
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
						{ADD_BLOCK_OPTIONS.map((opt) => (
							<DropdownMenuItem
								key={opt.kind}
								onClick={() => onAdd(opt.kind)}
								className='gap-2'
							>
								<opt.icon className='size-4' aria-hidden='true' />
								{opt.label}
							</DropdownMenuItem>
						))}
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
