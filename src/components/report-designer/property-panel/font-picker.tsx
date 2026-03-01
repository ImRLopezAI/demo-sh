'use client'

import { Label } from '@/components/ui/label'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'

const FONTS = [
	{ label: 'Helvetica', value: 'Helvetica' },
	{ label: 'Courier', value: 'Courier' },
	{ label: 'Times Roman', value: 'Times-Roman' },
] as const

export function FontPicker({
	value,
	onChange,
}: {
	value: 'Helvetica' | 'Courier' | 'Times-Roman'
	onChange: (value: 'Helvetica' | 'Courier' | 'Times-Roman') => void
}) {
	return (
		<div className='space-y-1'>
			<Label className='text-[11px] text-muted-foreground'>Font</Label>
			<Select
				value={value}
				onValueChange={(next) =>
					onChange(next as 'Helvetica' | 'Courier' | 'Times-Roman')
				}
			>
				<SelectTrigger className='h-7 text-[11px]'>
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					{FONTS.map((font) => (
						<SelectItem key={font.value} value={font.value}>
							{font.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	)
}
