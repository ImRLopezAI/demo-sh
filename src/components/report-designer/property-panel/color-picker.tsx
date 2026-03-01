'use client'

import { Droplets } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
	Popover,
	PopoverContent,
	PopoverHeader,
	PopoverTitle,
	PopoverTrigger,
} from '@/components/ui/popover'

export function ColorPicker({
	label,
	value,
	onChange,
}: {
	label: string
	value: string
	onChange: (value: string) => void
}) {
	return (
		<div className='space-y-1'>
			<Label className='text-[11px] text-muted-foreground'>{label}</Label>
			<div className='flex items-center gap-1'>
				<Popover>
					<PopoverTrigger
						render={
							<Button
								type='button'
								variant='outline'
								size='sm'
								aria-label={`${label} picker`}
								className='w-9 px-0'
							>
								<span
									className='size-3 rounded-xs border border-border'
									style={{ backgroundColor: value }}
								/>
							</Button>
						}
					/>
					<PopoverContent className='w-[210px]'>
						<PopoverHeader>
							<PopoverTitle className='flex items-center gap-1 text-xs'>
								<Droplets className='size-3' />
								{label}
							</PopoverTitle>
						</PopoverHeader>
						<input
							type='color'
							aria-label={`${label} color input`}
							value={value}
							onChange={(event) => onChange(event.target.value)}
							className='h-24 w-full rounded-sm border border-border bg-transparent'
						/>
					</PopoverContent>
				</Popover>
				<Input
					name={label.toLowerCase().replace(/\s+/g, '-')}
					autoComplete='off'
					aria-label={label}
					value={value}
					onChange={(event) => onChange(event.target.value)}
					className='h-7 text-[11px]'
				/>
			</div>
		</div>
	)
}
