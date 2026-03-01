'use client'

import {
	AlignHorizontalDistributeCenter,
	Barcode,
	ClipboardPaste,
	Copy,
	Eye,
	FileText,
	Grid2X2,
	ImageIcon,
	LayoutPanelTop,
	MousePointer2,
	MoveHorizontal,
	Paintbrush2,
	PencilRuler,
	Plus,
	Redo2,
	Rows3,
	Ruler,
	Save,
	Scissors,
	Type,
	Undo2,
	ZoomIn,
	ZoomOut,
} from 'lucide-react'
import type * as React from 'react'
import { useShallow } from 'zustand/react/shallow'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Slider } from '@/components/ui/slider'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DESIGNER_TABS } from './constants'
import {
	historyAvailability,
	redoDesignerHistory,
	undoDesignerHistory,
	useReportDesignerStore,
} from './store'

function RibbonAction({
	label,
	icon: Icon,
	onClick,
	disabled,
}: {
	label: string
	icon: React.ComponentType<{ className?: string }>
	onClick?: () => void
	disabled?: boolean
}) {
	return (
		<Button
			type='button'
			variant='ghost'
			size='sm'
			disabled={disabled}
			onClick={onClick}
			className='h-12 min-w-[58px] flex-col gap-0.5 rounded-sm px-1 text-[10px]'
		>
			<Icon className='size-3.5' />
			<span className='leading-none'>{label}</span>
		</Button>
	)
}

function RibbonGroup({
	title,
	children,
}: {
	title: string
	children: React.ReactNode
}) {
	return (
		<div className='flex min-h-[72px] flex-col justify-between gap-1'>
			<div className='flex items-start gap-1'>{children}</div>
			<span className='px-1 text-[10px] text-muted-foreground'>{title}</span>
		</div>
	)
}

export function DesignerToolbar({
	onSave,
	onPreview,
	onZoomChange,
	onZoomFit,
	onZoomReset,
	onZoomIn,
	onZoomOut,
}: {
	onSave: () => void
	onPreview: () => void
	onZoomChange: (nextZoom: number) => void
	onZoomFit: () => void
	onZoomReset: () => void
	onZoomIn: () => void
	onZoomOut: () => void
}) {
	const {
		activeTab,
		setActiveTab,
		camera,
		grid,
		rulers,
		toggleGrid,
		toggleRulers,
		copy,
		cut,
		paste,
		selectedBandId,
		addElementByKind,
	} = useReportDesignerStore(
		useShallow((state) => ({
			activeTab: state.activeTab,
			setActiveTab: state.setActiveTab,
			camera: state.camera,
			grid: state.grid,
			rulers: state.rulers,
			toggleGrid: state.toggleGrid,
			toggleRulers: state.toggleRulers,
			copy: state.copy,
			cut: state.cut,
			paste: state.paste,
			selectedBandId: state.selectedBandId,
			addElementByKind: state.addElementByKind,
		})),
	)

	const history = historyAvailability()

	const canInsert = Boolean(selectedBandId)
	function quickInsert(
		kind: 'textbox' | 'image' | 'shape' | 'line' | 'barcode',
	): void {
		if (!selectedBandId) return
		addElementByKind(selectedBandId, kind, 18, 12)
	}

	return (
		<div className='overflow-hidden border border-border bg-[var(--designer-ribbon)]'>
			<div className='flex items-center gap-1 border-border border-b bg-background px-1 py-1'>
				<Button
					type='button'
					variant='default'
					size='sm'
					className='h-7 rounded-sm rounded-b-none bg-primary px-3 text-primary-foreground'
				>
					File
				</Button>
				<Tabs
					value={activeTab}
					onValueChange={(value) =>
						setActiveTab(value as (typeof DESIGNER_TABS)[number])
					}
				>
					<TabsList
						variant='line'
						className='h-auto border-0 bg-transparent p-0 text-muted-foreground'
					>
						{DESIGNER_TABS.map((tab) => (
							<TabsTrigger
								key={tab}
								value={tab}
								className='rounded-none border-transparent px-3 py-1.5 text-[12px] data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground'
							>
								{tab}
							</TabsTrigger>
						))}
					</TabsList>
				</Tabs>
				<div className='ml-auto flex items-center gap-1'>
					<Button type='button' variant='outline' size='sm' onClick={onPreview}>
						<Eye className='size-3' />
						Preview
					</Button>
					<Button type='button' variant='default' size='sm' onClick={onSave}>
						<Save className='size-3' />
						Save
					</Button>
				</div>
			</div>

			<div className='flex items-start gap-2 overflow-x-auto border-border border-b bg-background px-2 py-2'>
				<RibbonGroup title='Main'>
					<RibbonAction label='Save' icon={FileText} onClick={onSave} />
					<RibbonAction
						label='Undo'
						icon={Undo2}
						onClick={undoDesignerHistory}
						disabled={!history.canUndo}
					/>
					<RibbonAction
						label='Redo'
						icon={Redo2}
						onClick={redoDesignerHistory}
						disabled={!history.canRedo}
					/>
				</RibbonGroup>
				<Separator orientation='vertical' />

				<RibbonGroup title='Clipboard'>
					<RibbonAction label='Copy' icon={Copy} onClick={copy} />
					<RibbonAction label='Cut' icon={Scissors} onClick={cut} />
					<RibbonAction
						label='Paste'
						icon={ClipboardPaste}
						disabled={!selectedBandId}
						onClick={() => {
							if (!selectedBandId) return
							paste(selectedBandId)
						}}
					/>
				</RibbonGroup>
				<Separator orientation='vertical' />

				<RibbonGroup title='Insert'>
					<RibbonAction
						label='Text'
						icon={Type}
						disabled={!canInsert}
						onClick={() => quickInsert('textbox')}
					/>
					<RibbonAction
						label='Image'
						icon={ImageIcon}
						disabled={!canInsert}
						onClick={() => quickInsert('image')}
					/>
					<RibbonAction
						label='Line'
						icon={MoveHorizontal}
						disabled={!canInsert}
						onClick={() => quickInsert('line')}
					/>
					<RibbonAction
						label='Barcode'
						icon={Barcode}
						disabled={!canInsert}
						onClick={() => quickInsert('barcode')}
					/>
					<RibbonAction
						label='Shape'
						icon={AlignHorizontalDistributeCenter}
						disabled={!canInsert}
						onClick={() => quickInsert('shape')}
					/>
				</RibbonGroup>
				<Separator orientation='vertical' />

				<RibbonGroup title='Layout'>
					<RibbonAction label='Select' icon={MousePointer2} />
					<RibbonAction label='Grid' icon={Grid2X2} onClick={toggleGrid} />
					<RibbonAction label='Rulers' icon={Ruler} onClick={toggleRulers} />
					<RibbonAction label='Page' icon={LayoutPanelTop} />
					<RibbonAction label='Bands' icon={Rows3} />
					<RibbonAction label='Style' icon={Paintbrush2} />
					<RibbonAction label='Guide' icon={PencilRuler} />
				</RibbonGroup>

				<div className='ml-auto flex min-h-[72px] flex-col justify-between rounded-sm border border-border bg-muted/25 px-2 py-1 text-[10px]'>
					<div className='grid grid-cols-2 gap-x-3 gap-y-0.5 text-muted-foreground'>
						<span>Grid</span>
						<span className='text-right text-foreground'>
							{grid.show ? 'On' : 'Off'}
						</span>
						<span>Rulers</span>
						<span className='text-right text-foreground'>
							{rulers.show ? 'On' : 'Off'}
						</span>
						<span>Selection</span>
						<span className='text-right text-foreground'>
							{selectedBandId ? 'Band' : 'None'}
						</span>
					</div>
				</div>
			</div>

			<div className='flex items-center gap-2 bg-muted/30 px-2 py-1.5'>
				<Button
					type='button'
					variant='outline'
					size='icon-xs'
					onClick={onZoomOut}
					aria-label='Zoom out'
				>
					<ZoomOut className='size-3 text-muted-foreground' />
				</Button>
				<Slider
					value={[camera.z * 100]}
					max={300}
					min={30}
					step={5}
					onValueChange={(value) => {
						const numeric = Array.isArray(value) ? value[0] : value
						onZoomChange((numeric ?? 100) / 100)
					}}
					className='w-72 [&_[data-slot=slider-range]]:bg-foreground/70 [&_[data-slot=slider-thumb]]:border-border [&_[data-slot=slider-thumb]]:bg-background'
				/>
				<Button
					type='button'
					variant='outline'
					size='icon-xs'
					onClick={onZoomIn}
					aria-label='Zoom in'
				>
					<ZoomIn className='size-3 text-muted-foreground' />
				</Button>
				<Button type='button' variant='outline' size='xs' onClick={onZoomReset}>
					100%
				</Button>
				<Button type='button' variant='outline' size='xs' onClick={onZoomFit}>
					Fit
				</Button>
				<Button
					type='button'
					variant='outline'
					size='icon-xs'
					aria-label='Additional zoom options'
				>
					<Plus className='size-3 text-muted-foreground' />
				</Button>
				<span className='ml-auto font-mono text-[10px] text-muted-foreground'>
					{Math.round(camera.z * 100)}%
				</span>
			</div>
		</div>
	)
}
