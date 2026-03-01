'use client'

import type { ReportBand } from '@server/reporting/designer-contracts'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

export function BandProperties({
	band,
	onUpdate,
}: {
	band: ReportBand
	onUpdate: (patch: Partial<ReportBand>) => void
}) {
	return (
		<div className='space-y-2'>
			<div className='space-y-1'>
				<Label className='text-[11px] text-muted-foreground'>Band height</Label>
				<Input
					type='number'
					name='band-height'
					autoComplete='off'
					aria-label='Band height'
					value={band.height}
					onChange={(event) =>
						onUpdate({ height: Number(event.target.value || 0) })
					}
					className='h-7 text-[11px]'
				/>
			</div>
			<div className='flex items-center justify-between text-[11px] text-muted-foreground'>
				<span>Can grow</span>
				<Switch
					checked={band.canGrow}
					onCheckedChange={(next) => onUpdate({ canGrow: next })}
				/>
			</div>
			<div className='flex items-center justify-between text-[11px] text-muted-foreground'>
				<span>Keep together</span>
				<Switch
					checked={Boolean(band.keepTogether)}
					onCheckedChange={(next) => onUpdate({ keepTogether: next })}
				/>
			</div>
			<div className='space-y-1'>
				<Label className='text-[11px] text-muted-foreground'>
					Group expression
				</Label>
				<Input
					name='group-expression'
					autoComplete='off'
					aria-label='Group expression'
					value={band.groupExpression ?? ''}
					onChange={(event) =>
						onUpdate({ groupExpression: event.target.value })
					}
					placeholder='=Fields.category'
					className='h-7 font-mono text-[11px]'
				/>
			</div>
		</div>
	)
}
