'use client'

import {
	Barcode,
	ChevronDown,
	ImageIcon,
	Minus,
	Plus,
	RectangleHorizontal,
	Type,
} from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { BAND_LABELS } from '../constants'
import { ToolboxDraggable } from '../dnd/toolbox-draggable'
import { DESIGNER_ELEMENT_DEFINITIONS } from '../elements/registry'
import { useReportDesignerStore } from '../store'

const ICON_BY_KIND = {
	textbox: Type,
	image: ImageIcon,
	shape: RectangleHorizontal,
	line: Minus,
	barcode: Barcode,
} as const

const BAND_INSERT_ORDER = [
	'reportHeader',
	'pageHeader',
	'groupHeader',
	'detail',
	'groupFooter',
	'pageFooter',
	'reportFooter',
] as const

export function ToolboxPanel() {
	const { selectedBandId, addElementByKind, addBand } = useReportDesignerStore(
		useShallow((state) => ({
			selectedBandId: state.selectedBandId,
			addElementByKind: state.addElementByKind,
			addBand: state.addBand,
		})),
	)

	return (
		<div className='space-y-2'>
			<div className='flex items-center justify-between border-border border-b pb-1'>
				<h3 className='font-semibold text-[11px] text-muted-foreground uppercase tracking-[0.16em]'>
					Toolbox
				</h3>
				{selectedBandId ? (
					<span className='text-[10px] text-muted-foreground'>
						Band selected
					</span>
				) : null}
			</div>
			<div className='flex items-center gap-1'>
				<Button type='button' variant='outline' size='sm'>
					New
					<ChevronDown className='size-3' />
				</Button>
				<Button type='button' variant='outline' size='sm'>
					Actions
					<ChevronDown className='size-3' />
				</Button>
			</div>
			<Input
				placeholder='Search toolbox…'
				aria-label='Search toolbox'
				className='h-7 text-[11px]'
			/>
			<div className='space-y-1'>
				<p className='text-[10px] text-muted-foreground uppercase tracking-[0.16em]'>
					Bands
				</p>
				<div className='grid grid-cols-2 gap-1'>
					{BAND_INSERT_ORDER.map((type) => (
						<Button
							key={type}
							type='button'
							variant='outline'
							size='xs'
							onClick={() => addBand(type)}
						>
							+ {BAND_LABELS[type]}
						</Button>
					))}
				</div>
			</div>
			<div className='grid gap-1.5'>
				{DESIGNER_ELEMENT_DEFINITIONS.map((item) => {
					const Icon = ICON_BY_KIND[item.kind]
					return (
						<div key={item.kind} className='flex items-center gap-1.5'>
							<ToolboxDraggable
								kind={item.kind}
								label={item.label}
								className='flex-1'
							/>
							<Button
								type='button'
								variant='outline'
								size='icon-xs'
								disabled={!selectedBandId}
								aria-label={`Insert ${item.label}`}
								onClick={() => {
									if (!selectedBandId) return
									addElementByKind(selectedBandId, item.kind, 16, 12)
								}}
							>
								<Plus className='size-3' />
							</Button>
							<Icon className='size-3 text-muted-foreground' />
						</div>
					)
				})}
			</div>
		</div>
	)
}
