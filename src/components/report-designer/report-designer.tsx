'use client'

import { AlertTriangle } from 'lucide-react'
import * as React from 'react'
import { useShallow } from 'zustand/react/shallow'
import { cn } from '@/lib/utils'
import { DesignerCanvas } from './canvas/designer-canvas'
import { DEFAULT_THEME_VARS, DESIGNER_FONT_STACK } from './constants'
import { DesignerContextMenu } from './context-menu'
import { DesignerToolbar } from './designer-toolbar'
import { KeyboardHandler } from './keyboard-handler'
import { PropertyPanel } from './property-panel/property-panel'
import { DesignerSidebar } from './sidebar/sidebar'
import {
	clearDesignerHistory,
	historyAvailability,
	redoDesignerHistory,
	undoDesignerHistory,
	useReportDesignerStore,
} from './store'
import type { ReportDesignerProps, ReportDesignerRef } from './types'
import { ensureReport, extractFieldsFromSchema, pageDimensions } from './utils'

function clampZoom(value: number): number {
	return Math.max(0.2, Math.min(4, value))
}

function ReportDesignerRoot({
	children,
	className,
	theme,
}: {
	children: React.ReactNode
	className?: string
	theme: 'light' | 'dark'
}) {
	return (
		<div
			data-theme={theme}
			className={cn(
				'flex h-full min-h-[720px] flex-col overflow-hidden rounded-md border border-border bg-[var(--designer-bg)] text-[var(--designer-ink)] shadow-sm',
				className,
			)}
			style={{
				...(DEFAULT_THEME_VARS as React.CSSProperties),
				fontFamily: DESIGNER_FONT_STACK.body,
			}}
		>
			{children}
		</div>
	)
}

const ReportDesignerImpl = React.forwardRef<
	ReportDesignerRef,
	ReportDesignerProps
>(function ReportDesignerImpl(props, ref) {
	const {
		datasetSchemaJson,
		initialReport,
		onSave,
		onPreview,
		onDirtyChange,
		theme = 'light',
		className,
	} = props
	const {
		report,
		setReport,
		markSaved,
		isDirty,
		camera,
		setCamera,
		activeTab,
		lastPointer,
		rulers,
	} = useReportDesignerStore(
		useShallow((state) => ({
			report: state.report,
			setReport: state.setReport,
			markSaved: state.markSaved,
			isDirty: state.isDirty,
			camera: state.camera,
			setCamera: state.setCamera,
			activeTab: state.activeTab,
			lastPointer: state.lastPointer,
			rulers: state.rulers,
		})),
	)

	const [previewUrl, setPreviewUrl] = React.useState<string | null>(null)
	const [previewError, setPreviewError] = React.useState<string | null>(null)
	const fields = React.useMemo(
		() => extractFieldsFromSchema(datasetSchemaJson),
		[datasetSchemaJson],
	)

	React.useEffect(() => {
		setReport(ensureReport(initialReport))
		clearDesignerHistory()
	}, [initialReport, setReport])

	React.useEffect(() => {
		onDirtyChange?.(isDirty)
	}, [isDirty, onDirtyChange])

	React.useEffect(() => {
		if (!isDirty || typeof window === 'undefined') return
		function onBeforeUnload(event: BeforeUnloadEvent) {
			event.preventDefault()
			event.returnValue = ''
		}
		window.addEventListener('beforeunload', onBeforeUnload)
		return () => window.removeEventListener('beforeunload', onBeforeUnload)
	}, [isDirty])

	React.useImperativeHandle(
		ref,
		() => ({
			getReport: () => report,
			setReport,
			isDirty: () => isDirty,
			undo: undoDesignerHistory,
			redo: redoDesignerHistory,
		}),
		[isDirty, report, setReport],
	)

	React.useEffect(() => {
		return () => {
			if (previewUrl) URL.revokeObjectURL(previewUrl)
		}
	}, [previewUrl])

	const history = historyAvailability()
	const handleZoomIn = React.useCallback(() => {
		setCamera({ z: clampZoom(camera.z + 0.1) })
	}, [camera.z, setCamera])
	const handleZoomOut = React.useCallback(() => {
		setCamera({ z: clampZoom(camera.z - 0.1) })
	}, [camera.z, setCamera])
	const handleZoomReset = React.useCallback(() => {
		setCamera({ x: 0, y: 0, z: 1 })
	}, [setCamera])
	const handleZoomFit = React.useCallback(() => {
		const page = pageDimensions(report)
		if (typeof window === 'undefined') {
			setCamera({ z: 0.9, x: 0, y: 0 })
			return
		}
		// Estimate usable canvas width after shell chrome + side panels.
		const availableWidth = Math.max(320, window.innerWidth - 900)
		const availableHeight = Math.max(280, window.innerHeight - 280)
		const nextZoom = clampZoom(
			Math.min(availableWidth / page.width, availableHeight / page.height),
		)
		setCamera({ z: nextZoom, x: 0, y: 0 })
	}, [report, setCamera])

	return (
		<ReportDesignerRoot className={className} theme={theme}>
			<KeyboardHandler />
			<DesignerToolbar
				onSave={() => {
					void Promise.resolve(onSave(report)).then(() => {
						markSaved()
					})
				}}
				onPreview={() => {
					setPreviewError(null)
					void onPreview(report)
						.then((url) => {
							setPreviewUrl((previous) => {
								if (previous?.startsWith('blob:')) URL.revokeObjectURL(previous)
								return url
							})
						})
						.catch((error: unknown) => {
							setPreviewError(
								error instanceof Error
									? error.message
									: 'Unable to render preview',
							)
						})
				}}
				onZoomChange={(nextZoom) => setCamera({ z: nextZoom })}
				onZoomIn={handleZoomIn}
				onZoomOut={handleZoomOut}
				onZoomReset={handleZoomReset}
				onZoomFit={handleZoomFit}
			/>
			<div className='flex items-center gap-2 border-border border-b bg-amber-50/80 px-3 py-1 text-[11px] text-amber-950'>
				<AlertTriangle className='size-3.5 text-amber-700' />
				<span className='truncate'>
					Designer mode uses sample data and local draft state until you save.
				</span>
			</div>
			<div className='grid min-h-0 flex-1 grid-cols-[300px_1fr_320px] gap-2 p-2'>
				<DesignerSidebar fields={fields} />
				<DesignerContextMenu>
					<div className='relative h-full min-h-0'>
						{activeTab === 'Preview' && previewUrl ? (
							<iframe
								title='Report preview'
								src={previewUrl}
								className='h-full w-full rounded-sm border border-border bg-background'
							/>
						) : (
							<DesignerCanvas />
						)}
						{previewError ? (
							<p className='absolute right-3 bottom-3 rounded-sm border border-destructive/30 bg-destructive/10 px-2 py-1 text-[11px] text-destructive'>
								{previewError}
							</p>
						) : null}
					</div>
				</DesignerContextMenu>
				<PropertyPanel fields={fields} />
			</div>
			<div className='flex items-center justify-between border-black/30 border-t bg-[var(--designer-status)] px-2 py-1 text-[10px] text-slate-100'>
				<div className='flex items-center gap-3'>
					<span>
						Coords: {Math.round(lastPointer.x)}, {Math.round(lastPointer.y)}
					</span>
					<span>Unit: {rulers.unit}</span>
					<span>Zoom: {Math.round(camera.z * 100)}%</span>
				</div>
				<div className='flex items-center gap-2'>
					<span>Undo: {history.canUndo ? 'yes' : 'no'}</span>
					<span>Redo: {history.canRedo ? 'yes' : 'no'}</span>
					<span>{isDirty ? 'Unsaved changes' : 'Saved'}</span>
				</div>
			</div>
		</ReportDesignerRoot>
	)
})

export const ReportDesigner = Object.assign(ReportDesignerImpl, {
	Root: ReportDesignerRoot,
	Sidebar: DesignerSidebar,
	Canvas: DesignerCanvas,
	Properties: PropertyPanel,
})
