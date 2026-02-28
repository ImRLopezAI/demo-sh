import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

export function ParagraphConfig({
	text,
	onChange,
}: {
	text: string
	onChange: (patch: { text: string }) => void
}) {
	return (
		<div className='space-y-1.5'>
			<Label className='text-xs text-muted-foreground'>Text</Label>
			<Textarea
				value={text}
				onChange={(e) => onChange({ text: e.target.value })}
				placeholder='Enter paragraph text...'
				rows={3}
			/>
		</div>
	)
}
