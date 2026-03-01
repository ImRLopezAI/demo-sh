'use client'

import {
	Eye,
	Grid2X2,
	Redo2,
	Ruler,
	Save,
	Undo2,
	ZoomIn,
	ZoomOut,
} from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DESIGNER_TABS } from './constants'
import {
	historyAvailability,
	redoDesignerHistory,
	undoDesignerHistory,
	useReportDesignerStore,
} from './store'

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
	} = useReportDesignerStore(
		useShallow((state) => ({
			activeTab: state.activeTab,
			setActiveTab: state.setActiveTab,
			camera: state.camera,
			grid: state.grid,
			rulers: state.rulers,
			toggleGrid: state.toggleGrid,
			toggleRulers: state.toggleRulers,
		})),
	)

	const history = historyAvailability()

	return (
		<div className='rounded-md border border-slate-300/70 bg-white/70 p-2 shadow-sm backdrop-blur'>
			<div className='flex items-center justify-between gap-2'>
				<Tabs
					value={activeTab}
					onValueChange={(value) =>
						setActiveTab(value as (typeof DESIGNER_TABS)[number])
					}
				>
					<TabsList
						variant='line'
						className='border border-slate-300/70 bg-white/90'
					>
						{DESIGNER_TABS.map((tab) => (
							<TabsTrigger key={tab} value={tab}>
								{tab}
							</TabsTrigger>
						))}
					</TabsList>
				</Tabs>
				<div className='flex items-center gap-1'>
					<Button
						type='button'
						variant='outline'
						size='icon-sm'
						disabled={!history.canUndo}
						onClick={undoDesignerHistory}
						aria-label='Undo change'
					>
						<Undo2 className='size-3' />
					</Button>
					<Button
						type='button'
						variant='outline'
						size='icon-sm'
						disabled={!history.canRedo}
						onClick={redoDesignerHistory}
						aria-label='Redo change'
					>
						<Redo2 className='size-3' />
					</Button>
					<Button
						type='button'
						variant='outline'
						size='sm'
						onClick={toggleGrid}
					>
						<Grid2X2 className='size-3' />
						Grid {grid.show ? 'On' : 'Off'}
					</Button>
					<Button
						type='button'
						variant='outline'
						size='sm'
						onClick={toggleRulers}
					>
						<Ruler className='size-3' />
						Rulers {rulers.show ? 'On' : 'Off'}
					</Button>
					<Button type='button' variant='outline' size='sm' onClick={onPreview}>
						<Eye className='size-3' /> Preview
					</Button>
					<Button type='button' variant='default' size='sm' onClick={onSave}>
						<Save className='size-3' /> Save
					</Button>
				</div>
			</div>
			<div className='mt-2 flex items-center gap-3 rounded border border-slate-300/60 bg-white/70 px-2 py-1'>
				<Button
					type='button'
					variant='outline'
					size='icon-xs'
					onClick={onZoomOut}
					aria-label='Zoom out'
				>
					<ZoomOut className='size-3 text-slate-600' />
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
					className='w-44'
				/>
				<Button
					type='button'
					variant='outline'
					size='icon-xs'
					onClick={onZoomIn}
					aria-label='Zoom in'
				>
					<ZoomIn className='size-3 text-slate-600' />
				</Button>
				<Button type='button' variant='outline' size='xs' onClick={onZoomReset}>
					100%
				</Button>
				<Button type='button' variant='outline' size='xs' onClick={onZoomFit}>
					Fit
				</Button>
				<span className='font-mono text-[11px] text-slate-600'>
					{Math.round(camera.z * 100)}%
				</span>
			</div>
		</div>
	)
}
