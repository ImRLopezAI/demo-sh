import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import { VALUE_PATH_OPTIONS } from '../constants'

export function KeyValueConfig({
	keyLabel,
	valuePath,
	onChange,
}: {
	keyLabel: string
	valuePath: string
	onChange: (patch: { key?: string; valuePath?: string }) => void
}) {
	return (
		<div className='grid grid-cols-2 gap-3'>
			<div className='space-y-1.5'>
				<Label className='text-xs text-muted-foreground'>Label</Label>
				<Input
					value={keyLabel}
					onChange={(e) => onChange({ key: e.target.value })}
					placeholder='Key label'
				/>
			</div>
			<div className='space-y-1.5'>
				<Label className='text-xs text-muted-foreground'>Value Path</Label>
				<Select
					value={valuePath}
					onValueChange={(val) => {
						if (val) onChange({ valuePath: val })
					}}
				>
					<SelectTrigger>
						<SelectValue placeholder='Select path' />
					</SelectTrigger>
					<SelectContent>
						{VALUE_PATH_OPTIONS.map((opt) => (
							<SelectItem key={opt.value} value={opt.value}>
								{opt.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
		</div>
	)
}
