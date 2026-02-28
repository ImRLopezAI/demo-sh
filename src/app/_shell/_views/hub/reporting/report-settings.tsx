import {
	REPORT_MODULE_IDS,
	type ReportModuleId,
} from '@server/reporting/contracts'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import { ENTITY_LABELS, ENTITY_OPTIONS, MODULE_LABELS } from './constants'

export function ReportSettings({
	moduleId,
	entityId,
	pageSize,
	orientation,
	rowLimit,
	onModuleChange,
	onEntityChange,
	onPageSizeChange,
	onOrientationChange,
	onRowLimitChange,
}: {
	moduleId: ReportModuleId
	entityId: string
	pageSize: 'A4' | 'LETTER' | 'THERMAL'
	orientation: 'portrait' | 'landscape'
	rowLimit: number
	onModuleChange: (value: ReportModuleId) => void
	onEntityChange: (value: string) => void
	onPageSizeChange: (value: 'A4' | 'LETTER' | 'THERMAL') => void
	onOrientationChange: (value: 'portrait' | 'landscape') => void
	onRowLimitChange: (value: number) => void
}) {
	const entityOptions = ENTITY_OPTIONS[moduleId] ?? []

	return (
		<div className='space-y-3'>
			<Label className='font-medium text-sm'>Report Settings</Label>

			<div className='grid grid-cols-2 gap-3'>
				<div className='space-y-1.5'>
					<Label className='text-xs text-muted-foreground'>Module</Label>
					<Select
						value={moduleId}
						onValueChange={(val) => {
							if (val && REPORT_MODULE_IDS.includes(val as ReportModuleId)) {
								onModuleChange(val as ReportModuleId)
							}
						}}
					>
						<SelectTrigger className='h-8 text-xs'>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{REPORT_MODULE_IDS.map((id) => (
								<SelectItem key={id} value={id}>
									{MODULE_LABELS[id]}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				<div className='space-y-1.5'>
					<Label className='text-xs text-muted-foreground'>Entity</Label>
					<Select
						value={entityId}
						onValueChange={(val) => {
							if (val) onEntityChange(val)
						}}
					>
						<SelectTrigger className='h-8 text-xs'>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{entityOptions.map((id) => (
								<SelectItem key={id} value={id}>
									{ENTITY_LABELS[id] ?? id}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			</div>

			<div className='grid grid-cols-3 gap-3'>
				<div className='space-y-1.5'>
					<Label className='text-xs text-muted-foreground'>Page Size</Label>
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
					<Label className='text-xs text-muted-foreground'>Orientation</Label>
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

				<div className='space-y-1.5'>
					<Label className='text-xs text-muted-foreground'>Row Limit</Label>
					<Input
						type='number'
						value={rowLimit}
						onChange={(e) => onRowLimitChange(Number(e.target.value) || 100)}
						min={1}
						max={2000}
						className='h-8 text-xs'
					/>
				</div>
			</div>
		</div>
	)
}
