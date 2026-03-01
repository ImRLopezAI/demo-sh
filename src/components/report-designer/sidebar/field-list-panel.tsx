'use client'

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
			<button
				type='button'
				draggable
				onDragStart={(event) => {
					event.dataTransfer.effectAllowed = 'copy'
					event.dataTransfer.setData('designer-field-path', field.path)
				}}
				className='flex w-full items-center justify-between rounded border border-slate-300/70 bg-white/80 px-2 py-1 text-left text-[11px] text-slate-700 transition hover:border-cyan-300 hover:bg-cyan-50'
				style={{ marginLeft: depth * 10 }}
			>
				<span>{field.label}</span>
				<span className='font-mono text-[10px] text-slate-500'>
					{field.type}
				</span>
			</button>
			{field.children?.map((child) => (
				<FieldNode key={child.path} field={child} depth={depth + 1} />
			))}
		</div>
	)
}

export function FieldListPanel({ fields }: { fields: DesignerFieldItem[] }) {
	return (
		<div className='space-y-2'>
			<h3 className='font-semibold text-[11px] text-slate-600 uppercase tracking-[0.16em]'>
				Dictionary
			</h3>
			<div className='max-h-72 space-y-1 overflow-auto pr-1'>
				{fields.length === 0 ? (
					<p className='rounded border border-slate-300/70 border-dashed px-2 py-2 text-[11px] text-slate-500'>
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
