import { Label } from '@/components/ui/label'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

const COLOR_PRESETS = [
	{ value: '#d6d6d6', label: 'Light' },
	{ value: '#a0a0a0', label: 'Medium' },
	{ value: '#4a5568', label: 'Dark' },
	{ value: '#2c5282', label: 'Blue' },
] as const

const THICKNESS_OPTIONS = [
	{ value: '0.5', label: 'Thin' },
	{ value: '1', label: 'Medium' },
	{ value: '2', label: 'Thick' },
] as const

export function DividerConfig({
	color,
	thickness,
	onChange,
}: {
	color?: string
	thickness?: number
	onChange: (patch: { color?: string; thickness?: number }) => void
}) {
	const activeColor = color ?? '#d6d6d6'
	const activeThickness = String(thickness ?? 1)

	return (
		<div className='space-y-3'>
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
								className='inline-block h-0.5 w-4 rounded'
								style={{ backgroundColor: c.value }}
							/>
						</ToggleGroupItem>
					))}
				</ToggleGroup>
			</div>
			<div className='space-y-1.5'>
				<Label className='text-muted-foreground text-xs'>Thickness</Label>
				<ToggleGroup
					value={[activeThickness]}
					onValueChange={(values) => {
						const last = values[values.length - 1]
						if (last) onChange({ thickness: Number(last) })
					}}
					variant='outline'
					size='sm'
				>
					{THICKNESS_OPTIONS.map((t) => (
						<ToggleGroupItem key={t.value} value={t.value}>
							{t.label}
						</ToggleGroupItem>
					))}
				</ToggleGroup>
			</div>
		</div>
	)
}
