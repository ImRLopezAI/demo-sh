'use client'

import * as React from 'react'
import { useShallow } from 'zustand/react/shallow'
import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
} from '@/components/ui/resizable'
import { cn } from '@/lib/utils'
import { DesignerCanvas } from './canvas/designer-canvas'
import {
	DARK_THEME_VARS,
	DEFAULT_THEME_VARS,
	DESIGNER_FONT_STACK,
} from './constants'
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
				'flex h-full min-h-[740px] flex-col overflow-hidden border bg-[var(--designer-bg)] text-[var(--designer-ink)] shadow-none',
				className,
			)}
				style={{
					...((theme === 'dark'
						? DARK_THEME_VARS
						: DEFAULT_THEME_VARS) as React.CSSProperties),
				fontFamily: DESIGNER_FONT_STACK.body,
				borderColor: 'var(--designer-panel-border)',
				colorScheme: 'light',
				'--background': '#f6f6f8',
				'--foreground': '#2f343b',
				'--card': '#ffffff',
				'--card-foreground': '#2f343b',
				'--popover': '#ffffff',
				'--popover-foreground': '#2f343b',
				'--primary': '#3564a4',
				'--primary-foreground': '#ffffff',
				'--secondary': '#eceef2',
				'--secondary-foreground': '#2f343b',
				'--muted': '#eceef2',
				'--muted-foreground': '#68707d',
				'--accent': '#e9eef6',
				'--accent-foreground': '#2f343b',
				'--destructive': '#b34040',
				'--destructive-foreground': '#ffffff',
				'--border': '#cfd3db',
					'--input': '#cfd3db',
					'--ring': '#3564a4',
					'--radius': '4px',
				} as React.CSSProperties}
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
			<div className='min-h-0 flex-1 px-2 py-2'>
				<ResizablePanelGroup
					orientation='horizontal'
					className='h-full border'
					style={{
						borderColor: 'var(--designer-panel-border)',
					}}
				>
					<ResizablePanel defaultSize={24} minSize={18}>
						<div className='h-full p-1.5'>
							<DesignerSidebar fields={fields} />
						</div>
					</ResizablePanel>
					<ResizableHandle withHandle />
					<ResizablePanel defaultSize={76} minSize={52}>
						<div className='h-full p-1.5'>
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
						</div>
					</ResizablePanel>
				</ResizablePanelGroup>
			</div>
			<div
				className='flex items-center justify-between border-t px-2 py-1 text-[11px]'
				style={{
					borderColor: 'var(--designer-ribbon-border)',
					background: 'var(--designer-status-bg)',
					color: 'var(--designer-status-ink)',
				}}
			>
				<div className='flex items-center gap-3'>
					<span>Hundredths of Inch</span>
					<span>Check for Issues</span>
					<span>Page1</span>
					<span>
						X:{Math.round(lastPointer.x).toString().padStart(2, '0')} Y:
						{Math.round(lastPointer.y).toString().padStart(2, '0')}
					</span>
					<span>{rulers.unit}</span>
				</div>
				<div className='flex items-center gap-2'>
					<span>{history.canUndo ? 'Undo' : 'Undo -'}</span>
					<span>{history.canRedo ? 'Redo' : 'Redo -'}</span>
					<span>{isDirty ? 'Unsaved' : 'Saved'}</span>
					<span>{Math.round(camera.z * 100)}%</span>
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
