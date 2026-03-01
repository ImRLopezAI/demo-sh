'use client'

import { Database, Search, Settings2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { DesignerFieldItem } from '../types'

function FieldNode({
	field,
	depth,
}: {
	field: DesignerFieldItem
	depth: number
}) {
	return (
		<div className='space-y-1'>
			<Button
				type='button'
				variant='ghost'
				size='sm'
				draggable
				onDragStart={(event) => {
					event.dataTransfer.effectAllowed = 'copy'
					event.dataTransfer.setData('designer-field-path', field.path)
				}}
				className='h-auto w-full justify-between rounded-sm border border-border bg-background px-2 py-1 text-left text-[11px] text-foreground transition-colors hover:border-primary/40 hover:bg-muted/60 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30'
				style={{ marginLeft: depth * 10 }}
			>
				<span>{field.label}</span>
				<span className='font-mono text-[10px] text-muted-foreground'>
					{field.type}
				</span>
			</Button>
			{field.children?.map((child) => (
				<FieldNode key={child.path} field={child} depth={depth + 1} />
			))}
		</div>
	)
}

export function FieldListPanel({ fields }: { fields: DesignerFieldItem[] }) {
	return (
		<div className='space-y-2'>
			<h3 className='border-border border-b pb-1 font-semibold text-[11px] text-muted-foreground uppercase tracking-[0.16em]'>
				Dictionary
			</h3>
			<div className='flex items-center gap-1'>
				<Button type='button' variant='outline' size='sm'>
					New
				</Button>
				<Button type='button' variant='outline' size='sm'>
					Actions
				</Button>
				<Button
					type='button'
					variant='ghost'
					size='icon-xs'
					aria-label='Remove dictionary item'
					className='ml-auto'
				>
					<X className='size-3' />
				</Button>
				<Button
					type='button'
					variant='ghost'
					size='icon-xs'
					aria-label='Dictionary settings'
				>
					<Settings2 className='size-3' />
				</Button>
			</div>
			<div className='relative'>
				<Search className='pointer-events-none absolute top-1/2 left-2 size-3 -translate-y-1/2 text-muted-foreground' />
				<Input
					aria-label='Search dictionary fields'
					placeholder='Search fields…'
					className='h-7 pl-6 text-[11px]'
				/>
			</div>
			<div className='max-h-72 space-y-1 overflow-auto pr-1'>
				<div className='mb-1 inline-flex items-center gap-1 rounded-sm bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground'>
					<Database className='size-3' />
					Data Sources
				</div>
				{fields.length === 0 ? (
					<p className='rounded border border-border border-dashed bg-background px-2 py-2 text-[11px] text-muted-foreground'>
						No schema fields available.
					</p>
				) : (
					fields.map((field) => (
						<FieldNode key={field.path} field={field} depth={0} />
					))
				)}
			</div>
		</div>
	)
}
