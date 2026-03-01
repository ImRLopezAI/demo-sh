import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import { REPORT_META_VALUE_PATHS } from '../constants'

export function KeyValueConfig({
	keyLabel,
	valuePath,
	onChange,
	extraPaths,
}: {
	keyLabel: string
	valuePath: string
	onChange: (patch: { key?: string; valuePath?: string }) => void
	extraPaths?: Array<{ value: string; label: string }>
}) {
	const hasDatasetPaths = extraPaths && extraPaths.length > 0

	return (
		<div className='grid grid-cols-2 gap-3'>
			<div className='space-y-1.5'>
				<Label className='text-muted-foreground text-xs'>Label</Label>
				<Input
					value={keyLabel}
					onChange={(e) => onChange({ key: e.target.value })}
					placeholder='Key label'
				/>
			</div>
			<div className='space-y-1.5'>
				<Label className='text-muted-foreground text-xs'>Value Path</Label>
				{hasDatasetPaths ? (
					<Select
						value={valuePath}
						onValueChange={(val) => {
							if (val) onChange({ valuePath: val })
						}}
					>
						<SelectTrigger>
							<SelectValue placeholder='Select field' />
						</SelectTrigger>
						<SelectContent>
							<SelectGroup>
								<SelectLabel>Dataset Fields</SelectLabel>
								{extraPaths.map((opt) => (
									<SelectItem key={opt.value} value={opt.value}>
										{opt.label}
									</SelectItem>
								))}
							</SelectGroup>
							<SelectGroup>
								<SelectLabel>Report Info</SelectLabel>
								{REPORT_META_VALUE_PATHS.map((opt) => (
									<SelectItem key={opt.value} value={opt.value}>
										{opt.label}
									</SelectItem>
								))}
							</SelectGroup>
						</SelectContent>
					</Select>
				) : (
					<p className='rounded-md border border-border/60 border-dashed px-3 py-2 text-[11px] text-muted-foreground'>
						Configure a dataset above to select fields.
					</p>
				)}
			</div>
		</div>
	)
}
