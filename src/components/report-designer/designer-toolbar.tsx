'use client'

import {
	AlignHorizontalDistributeCenter,
	Barcode,
	ClipboardPaste,
	Columns3,
	Copy,
	Eye,
	FileText,
	FileUp,
	Gauge,
	Globe,
	Grid2X2,
	ImageIcon,
	ImagePlus,
	LayoutGrid,
	LayoutPanelTop,
	LayoutTemplate,
	Link2,
	Lock,
	MousePointer2,
	MoveHorizontal,
	NotebookTabs,
	Paintbrush2,
	PencilRuler,
	Plus,
	Redo2,
	Rows3,
	Ruler,
	Save,
	Scissors,
	Settings2,
	SlidersHorizontal,
	SquareStack,
	TableProperties,
	Type,
	Undo2,
	Wrench,
	ZoomIn,
	ZoomOut,
} from 'lucide-react'
import * as React from 'react'
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

type RibbonActionDef = {
	label: string
	icon: React.ComponentType<{ className?: string }>
	onClick?: () => void
	disabled?: boolean
}

type RibbonGroupDef = {
	title: string
	actions: RibbonActionDef[]
}

function RibbonActionButton({
	label,
	icon: Icon,
	onClick,
	disabled,
}: RibbonActionDef) {
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

function RibbonGroup({ group }: { group: RibbonGroupDef }) {
	return (
		<div className='flex min-h-[72px] flex-col justify-between gap-1'>
			<div className='flex items-start gap-1'>
				{group.actions.map((action) => (
					<RibbonActionButton
						key={`${group.title}-${action.label}`}
						label={action.label}
						icon={action.icon}
						onClick={action.onClick}
						disabled={action.disabled}
					/>
				))}
			</div>
			<span className='px-1 text-[10px] text-muted-foreground'>
				{group.title}
			</span>
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
	const noop = React.useCallback(() => {}, [])

	function quickInsert(
		kind: 'textbox' | 'image' | 'shape' | 'line' | 'barcode',
	): void {
		if (!selectedBandId) return
		addElementByKind(selectedBandId, kind, 18, 12)
	}

	const groups = React.useMemo(() => {
		const home: RibbonGroupDef[] = [
			{
				title: 'Main',
				actions: [
					{ label: 'Save', icon: FileText, onClick: onSave },
					{
						label: 'Undo',
						icon: Undo2,
						onClick: undoDesignerHistory,
						disabled: !history.canUndo,
					},
					{
						label: 'Redo',
						icon: Redo2,
						onClick: redoDesignerHistory,
						disabled: !history.canRedo,
					},
				],
			},
			{
				title: 'Clipboard',
				actions: [
					{ label: 'Copy', icon: Copy, onClick: copy },
					{ label: 'Cut', icon: Scissors, onClick: cut },
					{
						label: 'Paste',
						icon: ClipboardPaste,
						disabled: !selectedBandId,
						onClick: () => {
							if (!selectedBandId) return
							paste(selectedBandId)
						},
					},
				],
			},
			{
				title: 'Insert',
				actions: [
					{
						label: 'Text',
						icon: Type,
						disabled: !canInsert,
						onClick: () => quickInsert('textbox'),
					},
					{
						label: 'Image',
						icon: ImageIcon,
						disabled: !canInsert,
						onClick: () => quickInsert('image'),
					},
					{
						label: 'Line',
						icon: MoveHorizontal,
						disabled: !canInsert,
						onClick: () => quickInsert('line'),
					},
					{
						label: 'Barcode',
						icon: Barcode,
						disabled: !canInsert,
						onClick: () => quickInsert('barcode'),
					},
					{
						label: 'Shape',
						icon: AlignHorizontalDistributeCenter,
						disabled: !canInsert,
						onClick: () => quickInsert('shape'),
					},
				],
			},
			{
				title: 'Layout',
				actions: [
					{ label: 'Select', icon: MousePointer2, onClick: noop },
					{ label: 'Grid', icon: Grid2X2, onClick: toggleGrid },
					{ label: 'Rulers', icon: Ruler, onClick: toggleRulers },
					{ label: 'Page', icon: LayoutPanelTop, onClick: noop },
					{ label: 'Bands', icon: Rows3, onClick: noop },
					{ label: 'Style', icon: Paintbrush2, onClick: noop },
					{ label: 'Guide', icon: PencilRuler, onClick: noop },
				],
			},
		]

		const insert: RibbonGroupDef[] = [
			{
				title: 'New Item',
				actions: [
					{ label: 'Page', icon: LayoutPanelTop, onClick: noop },
					{ label: 'Dashboard', icon: LayoutGrid, onClick: noop },
					{ label: 'Bands', icon: Rows3, onClick: noop },
					{ label: 'Cross', icon: TableProperties, onClick: noop },
				],
			},
			{
				title: 'Categories',
				actions: [
					{ label: 'Component', icon: SquareStack, onClick: noop },
					{
						label: 'Shape',
						icon: AlignHorizontalDistributeCenter,
						onClick: noop,
					},
					{ label: 'Chart', icon: Columns3, onClick: noop },
					{ label: 'Gauge', icon: Gauge, onClick: noop },
					{ label: 'Map', icon: Globe, onClick: noop },
				],
			},
			{
				title: 'Components',
				actions: [
					{ label: 'Header', icon: NotebookTabs, onClick: noop },
					{ label: 'Footer', icon: LayoutTemplate, onClick: noop },
					{ label: 'Data', icon: TableProperties, onClick: noop },
					{ label: 'Text', icon: Type, onClick: noop },
					{ label: 'Image', icon: ImagePlus, onClick: noop },
					{ label: 'Toolbox', icon: Wrench, onClick: noop },
				],
			},
		]

		const report: RibbonGroupDef[] = [
			{
				title: 'Report Setup',
				actions: [
					{ label: 'Setup', icon: Settings2, onClick: noop },
					{ label: 'Preview', icon: Eye, onClick: onPreview },
					{ label: 'Export', icon: FileUp, onClick: noop },
					{ label: 'Global', icon: Globe, onClick: noop },
					{ label: 'Properties', icon: SlidersHorizontal, onClick: noop },
				],
			},
		]

		const page: RibbonGroupDef[] = [
			{
				title: 'Page Setup',
				actions: [
					{ label: 'Margins', icon: TableProperties, onClick: noop },
					{ label: 'Orientation', icon: LayoutPanelTop, onClick: noop },
					{ label: 'Size', icon: LayoutTemplate, onClick: noop },
					{ label: 'Columns', icon: Columns3, onClick: noop },
					{ label: 'Watermark', icon: Paintbrush2, onClick: noop },
				],
			},
			{
				title: 'View Options',
				actions: [
					{
						label: grid.show ? 'Grid On' : 'Grid Off',
						icon: Grid2X2,
						onClick: toggleGrid,
					},
					{ label: 'Align Grid', icon: MoveHorizontal, onClick: noop },
					{
						label: rulers.show ? 'Rulers On' : 'Rulers Off',
						icon: Ruler,
						onClick: toggleRulers,
					},
					{ label: 'Order', icon: Rows3, onClick: noop },
				],
			},
		]

		const layout: RibbonGroupDef[] = [
			{
				title: 'Arrange',
				actions: [
					{ label: 'Align Grid', icon: Grid2X2, onClick: noop },
					{ label: 'Bring Front', icon: SquareStack, onClick: noop },
					{ label: 'Send Back', icon: LayoutGrid, onClick: noop },
					{ label: 'Move Fwd', icon: MoveHorizontal, onClick: noop },
					{ label: 'Move Back', icon: MoveHorizontal, onClick: noop },
				],
			},
			{
				title: 'Design',
				actions: [
					{ label: 'Size', icon: SlidersHorizontal, onClick: noop },
					{ label: 'Lock', icon: Lock, onClick: noop },
					{ label: 'Link', icon: Link2, onClick: noop },
				],
			},
		]

		const preview: RibbonGroupDef[] = [
			{
				title: 'Preview',
				actions: [
					{ label: 'Preview', icon: Eye, onClick: onPreview },
					{ label: 'Save', icon: Save, onClick: onSave },
					{ label: 'Grid', icon: Grid2X2, onClick: toggleGrid },
					{ label: 'Rulers', icon: Ruler, onClick: toggleRulers },
				],
			},
		]

		if (activeTab === 'Insert') return insert
		if (activeTab === 'Report') return report
		if (activeTab === 'Page') return page
		if (activeTab === 'Layout') return layout
		if (activeTab === 'Preview') return preview
		return home
	}, [
		activeTab,
		canInsert,
		copy,
		cut,
		grid.show,
		history.canRedo,
		history.canUndo,
		noop,
		onPreview,
		onSave,
		paste,
		quickInsert,
		rulers.show,
		selectedBandId,
		toggleGrid,
		toggleRulers,
	])

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
					onValueChange={(value) => {
						const next = value as (typeof DESIGNER_TABS)[number]
						setActiveTab(next)
						if (next === 'Preview') onPreview()
					}}
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
				{groups.map((group, index) => (
					<React.Fragment key={group.title}>
						<RibbonGroup group={group} />
						{index < groups.length - 1 ? (
							<Separator orientation='vertical' />
						) : null}
					</React.Fragment>
				))}

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
