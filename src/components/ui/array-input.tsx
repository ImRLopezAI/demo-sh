import { GripVertical, Plus, X } from 'lucide-react'
import { Reorder } from 'motion/react'
import React from 'react'
import { Button } from './button'
import { Item, ItemActions, ItemContent, ItemTitle } from './item'
import { Textarea } from './textarea'

interface ArrayInputProps
	extends Omit<React.ComponentProps<typeof Textarea>, 'value' | 'onChange'> {
	data: string[]
	setData: (arr: string[]) => void
}
export function ArrayInput({
	data,
	setData,
	rows = 1,
	...props
}: ArrayInputProps) {
	const [inputValue, setInputValue] = React.useState('')

	const handleAdd = React.useCallback(() => {
		if (inputValue.trim()) {
			const updated = [...(data || []), inputValue.trim()]
			setData(updated)
			setInputValue('')
		}
	}, [inputValue, data, setData])

	const handleRemove = React.useCallback(
		(idx: number) => {
			const updated = (data || []).filter((_, i) => i !== idx)
			setData(updated)
		},
		[data, setData],
	)

	const handleReorder = React.useCallback(
		(newItems: string[]) => {
			setData(newItems)
		},
		[setData],
	)

	return (
		<div className='flex flex-col gap-3'>
			<div className='flex flex-col gap-2'>
				<Textarea
					value={inputValue}
					onChange={(e) => setInputValue(e.target.value)}
					rows={rows}
					{...props}
				/>
				<Button
					type='button'
					onClick={handleAdd}
					variant='outline'
					size='sm'
					className='w-fit'
					disabled={!inputValue.trim()}
				>
					<Plus size={16} /> Add
				</Button>
			</div>

			{data && data.length > 0 && (
				<Reorder.Group
					axis='y'
					values={data}
					onReorder={handleReorder}
					className='flex flex-col gap-2'
				>
					{data.map((item, idx) => (
						<Reorder.Item
							key={item}
							value={item}
							className='group relative flex items-start gap-2 rounded-md border bg-muted/50 p-2 text-sm'
						>
							<Item className='w-full p-0'>
								<ItemContent>
									<ItemTitle className='truncate'>{item}</ItemTitle>
								</ItemContent>
								<ItemActions className='absolute top-2 right-2 opacity-0 transition-opacity group-hover:opacity-100'>
									<Button
										variant='ghost'
										size='icon-sm'
										onClick={() => handleRemove(idx)}
									>
										<X size={16} />
									</Button>
									<div className='cursor-grab p-1'>
										<GripVertical size={16} />
									</div>
								</ItemActions>
							</Item>
						</Reorder.Item>
					))}
				</Reorder.Group>
			)}
		</div>
	)
}
