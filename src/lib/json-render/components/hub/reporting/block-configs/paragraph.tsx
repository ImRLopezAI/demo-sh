import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

export function ParagraphConfig({
	text,
	align,
	bold,
	onChange,
}: {
	text: string
	align?: 'left' | 'center' | 'right'
	bold?: boolean
	onChange: (patch: {
		text?: string
		align?: 'left' | 'center' | 'right'
		bold?: boolean
	}) => void
}) {
	const activeAlign = align ?? 'left'

	return (
		<div className='space-y-3'>
			<div className='space-y-1.5'>
				<Label className='text-muted-foreground text-xs'>Text</Label>
				<Textarea
					value={text}
					onChange={(e) => onChange({ text: e.target.value })}
					placeholder='Enter paragraph text... Use {{path}} for template values'
					rows={3}
				/>
			</div>
			<div className='flex items-center gap-4'>
				<div className='space-y-1.5'>
					<Label className='text-muted-foreground text-xs'>Alignment</Label>
					<ToggleGroup
						value={[activeAlign]}
						onValueChange={(values) => {
							const last = values[values.length - 1]
							if (last === 'left' || last === 'center' || last === 'right')
								onChange({ align: last })
						}}
						variant='outline'
						size='sm'
					>
						<ToggleGroupItem value='left'>Left</ToggleGroupItem>
						<ToggleGroupItem value='center'>Center</ToggleGroupItem>
						<ToggleGroupItem value='right'>Right</ToggleGroupItem>
					</ToggleGroup>
				</div>
				<div className='flex items-center gap-2 pt-4'>
					<Checkbox
						id='paragraph-bold'
						checked={bold ?? false}
						onCheckedChange={(checked) => onChange({ bold: checked === true })}
					/>
					<Label htmlFor='paragraph-bold' className='text-xs'>
						Bold
					</Label>
				</div>
			</div>
		</div>
	)
}
