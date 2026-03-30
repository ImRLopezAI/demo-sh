import { Label } from '@/components/ui/label'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'

export function ReportSettings({
	pageSize,
	orientation,
	onPageSizeChange,
	onOrientationChange,
}: {
	pageSize: 'A4' | 'LETTER' | 'THERMAL'
	orientation: 'portrait' | 'landscape'
	onPageSizeChange: (value: 'A4' | 'LETTER' | 'THERMAL') => void
	onOrientationChange: (value: 'portrait' | 'landscape') => void
}) {
	return (
		<div className='space-y-3'>
			<Label className='font-medium text-sm'>Report Settings</Label>

			<div className='grid grid-cols-2 gap-3'>
				<div className='space-y-1.5'>
					<Label className='text-muted-foreground text-xs'>Page Size</Label>
					<Select
						value={pageSize}
						onValueChange={(val) => {
							if (val) onPageSizeChange(val as 'A4' | 'LETTER' | 'THERMAL')
						}}
					>
						<SelectTrigger className='h-8 text-xs'>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value='A4'>A4</SelectItem>
							<SelectItem value='LETTER'>Letter</SelectItem>
							<SelectItem value='THERMAL'>Thermal</SelectItem>
						</SelectContent>
					</Select>
				</div>

				<div className='space-y-1.5'>
					<Label className='text-muted-foreground text-xs'>Orientation</Label>
					<Select
						value={orientation}
						onValueChange={(val) => {
							if (val) onOrientationChange(val as 'portrait' | 'landscape')
						}}
					>
						<SelectTrigger className='h-8 text-xs'>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value='portrait'>Portrait</SelectItem>
							<SelectItem value='landscape'>Landscape</SelectItem>
						</SelectContent>
					</Select>
				</div>
			</div>
		</div>
	)
}
