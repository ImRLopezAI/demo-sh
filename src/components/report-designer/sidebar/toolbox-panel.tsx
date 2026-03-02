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
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
			<div className='flex items-center justify-between border-[#d2d6de] border-b pb-1'>
				<h3 className='font-semibold text-[#5f6672] text-[12px] uppercase tracking-[0.16em]'>
					Toolbox
				</h3>
				{selectedBandId ? (
					<span className='text-[#7f8793] text-[11px]'>Band selected</span>
				) : null}
			</div>
			<div className='flex items-center gap-1'>
				<DropdownMenu>
					<DropdownMenuTrigger
						render={
							<Button
								type='button'
								variant='outline'
								size='sm'
								className='h-8 border-[#cfd4dc] bg-white text-[#434954] text-[12px]'
							>
								New
								<ChevronDown className='size-3' />
							</Button>
						}
					/>
					<DropdownMenuContent align='start'>
						{BAND_INSERT_ORDER.map((type) => (
							<DropdownMenuItem key={type} onClick={() => addBand(type)}>
								{BAND_LABELS[type]}
							</DropdownMenuItem>
						))}
					</DropdownMenuContent>
				</DropdownMenu>
				<DropdownMenu>
					<DropdownMenuTrigger
						render={
							<Button
								type='button'
								variant='outline'
								size='sm'
								className='h-8 border-[#cfd4dc] bg-white text-[#434954] text-[12px]'
							>
								Actions
								<ChevronDown className='size-3' />
							</Button>
						}
					/>
					<DropdownMenuContent align='start'>
						{DESIGNER_ELEMENT_DEFINITIONS.map((item) => (
							<DropdownMenuItem
								key={item.kind}
								disabled={!selectedBandId}
								onClick={() => {
									if (!selectedBandId) return
									addElementByKind(selectedBandId, item.kind, 16, 12)
								}}
							>
								Insert {item.label}
							</DropdownMenuItem>
						))}
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
			<Input
				placeholder='Search toolbox…'
				aria-label='Search toolbox'
				className='h-8 border-[#cfd4dc] bg-white text-[12px]'
			/>
			<div className='space-y-1'>
				<p className='text-[#68707c] text-[11px] uppercase tracking-[0.16em]'>
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
							className='h-7 border-[#d0d4dc] bg-[#fefefe] text-[11px]'
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
								className='h-7 w-7 border-[#d0d4dc] bg-white'
								onClick={() => {
									if (!selectedBandId) return
									addElementByKind(selectedBandId, item.kind, 16, 12)
								}}
							>
								<Plus className='size-3' />
							</Button>
							<Icon className='size-3 text-[#747c88]' />
						</div>
					)
				})}
			</div>
		</div>
	)
}
