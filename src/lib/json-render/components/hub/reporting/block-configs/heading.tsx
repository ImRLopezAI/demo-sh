import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

export function HeadingConfig({
	text,
	level,
	onChange,
}: {
	text: string
	level: 1 | 2 | 3
	onChange: (patch: { text?: string; level?: 1 | 2 | 3 }) => void
}) {
	return (
		<div className='space-y-3'>
			<div className='space-y-1.5'>
				<Label className='text-muted-foreground text-xs'>Heading Text</Label>
				<Input
					value={text}
					onChange={(e) => onChange({ text: e.target.value })}
					placeholder='Enter heading text...'
				/>
			</div>
			<div className='space-y-1.5'>
				<Label className='text-muted-foreground text-xs'>Level</Label>
				<ToggleGroup
					value={[String(level)]}
					onValueChange={(values) => {
						const last = values[values.length - 1]
						if (last) onChange({ level: Number(last) as 1 | 2 | 3 })
					}}
					variant='outline'
					size='sm'
				>
					<ToggleGroupItem value='1'>H1</ToggleGroupItem>
					<ToggleGroupItem value='2'>H2</ToggleGroupItem>
					<ToggleGroupItem value='3'>H3</ToggleGroupItem>
				</ToggleGroup>
			</div>
		</div>
	)
}
