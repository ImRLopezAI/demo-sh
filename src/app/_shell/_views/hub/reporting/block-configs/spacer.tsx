import { Label } from '@/components/ui/label'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

export function SpacerConfig({
	size,
	onChange,
}: {
	size: 'sm' | 'md' | 'lg'
	onChange: (patch: { size: 'sm' | 'md' | 'lg' }) => void
}) {
	return (
		<div className='space-y-1.5'>
			<Label className='text-muted-foreground text-xs'>Size</Label>
			<ToggleGroup
				value={[size]}
				onValueChange={(values) => {
					const last = values[values.length - 1]
					if (last) onChange({ size: last as 'sm' | 'md' | 'lg' })
				}}
				variant='outline'
				size='sm'
			>
				<ToggleGroupItem value='sm'>S</ToggleGroupItem>
				<ToggleGroupItem value='md'>M</ToggleGroupItem>
				<ToggleGroupItem value='lg'>L</ToggleGroupItem>
			</ToggleGroup>
		</div>
	)
}
