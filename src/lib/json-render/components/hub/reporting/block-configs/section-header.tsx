import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

const COLOR_PRESETS = [
	{ value: '#2c5282', label: 'Blue' },
	{ value: '#276749', label: 'Green' },
	{ value: '#9b2c2c', label: 'Red' },
	{ value: '#6b46c1', label: 'Purple' },
	{ value: '#4a5568', label: 'Gray' },
] as const

export function SectionHeaderConfig({
	text,
	color,
	onChange,
}: {
	text: string
	color?: string
	onChange: (patch: { text?: string; color?: string }) => void
}) {
	const activeColor = color ?? '#2c5282'

	return (
		<div className='space-y-3'>
			<div className='space-y-1.5'>
				<Label className='text-muted-foreground text-xs'>Header Text</Label>
				<Input
					value={text}
					onChange={(e) => onChange({ text: e.target.value })}
					placeholder='Section title'
				/>
			</div>
			<div className='space-y-1.5'>
				<Label className='text-muted-foreground text-xs'>Color</Label>
				<ToggleGroup
					value={[activeColor]}
					onValueChange={(values) => {
						const last = values[values.length - 1]
						if (last) onChange({ color: last })
					}}
					variant='outline'
					size='sm'
				>
					{COLOR_PRESETS.map((c) => (
						<ToggleGroupItem key={c.value} value={c.value} title={c.label}>
							<span
								className='inline-block size-3 rounded-full'
								style={{ backgroundColor: c.value }}
							/>
						</ToggleGroupItem>
					))}
				</ToggleGroup>
			</div>
		</div>
	)
}
