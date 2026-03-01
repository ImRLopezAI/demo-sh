'use client'

import type { ReportBand } from '@server/reporting/designer-contracts'
import * as React from 'react'
import { useShallow } from 'zustand/react/shallow'
import { cn } from '@/lib/utils'
import { useReportDesignerStore } from '../store'
import { snap } from '../utils'
import { MiniMap } from './mini-map'
import { PageSurface } from './page-surface'

type DragState =
	| {
			type: 'move'
			elementId: string
			bandId: string
			startX: number
			startY: number
			elementX: number
			elementY: number
	  }
	| {
			type: 'resize-element'
			elementId: string
			handle: 'nw' | 'ne' | 'sw' | 'se'
			startX: number
			startY: number
			x: number
			y: number
			width: number
			height: number
	  }
	| {
			type: 'resize-band'
			bandId: string
			startY: number
			height: number
	  }
	| {
			type: 'pan'
			startX: number
			startY: number
			cameraX: number
			cameraY: number
	  }
	| null

export function DesignerCanvas() {
	const {
		report,
		camera,
		grid,
		rulers,
		showBandHeaders,
		showElementOrder,
		selectedBandId,
		selectedElementIds,
		setPointer,
		setCamera,
		selectBand,
		selectElement,
		addElementByKind,
		addFieldElement,
		updateElement,
		resizeBand,
	} = useReportDesignerStore(
		useShallow((state) => ({
			report: state.report,
			camera: state.camera,
			grid: state.grid,
			rulers: state.rulers,
			showBandHeaders: state.showBandHeaders,
			showElementOrder: state.showElementOrder,
			selectedBandId: state.selectedBandId,
			selectedElementIds: state.selectedElementIds,
			setPointer: state.setPointer,
			setCamera: state.setCamera,
			selectBand: state.selectBand,
			selectElement: state.selectElement,
			addElementByKind: state.addElementByKind,
			addFieldElement: state.addFieldElement,
			updateElement: state.updateElement,
			resizeBand: state.resizeBand,
		})),
	)

	const [guides, setGuides] = React.useState<{
		vertical: number[]
		horizontal: number[]
	}>({
		vertical: [],
		horizontal: [],
	})
	const [isSpacePanning, setIsSpacePanning] = React.useState(false)
	const [isPanning, setIsPanning] = React.useState(false)
	const canvasRef = React.useRef<HTMLDivElement | null>(null)
	const dragRef = React.useRef<DragState>(null)

	React.useEffect(() => {
		function isEditableTarget(target: EventTarget | null): boolean {
			if (!(target instanceof HTMLElement)) return false
			const tag = target.tagName.toLowerCase()
			return (
				tag === 'input' ||
				tag === 'textarea' ||
				target.isContentEditable ||
				tag === 'select'
			)
		}

		function onKeyDown(event: KeyboardEvent) {
			if (event.code !== 'Space') return
			if (isEditableTarget(event.target)) return
			event.preventDefault()
			setIsSpacePanning(true)
		}

		function onKeyUp(event: KeyboardEvent) {
			if (event.code !== 'Space') return
			setIsSpacePanning(false)
		}

		function onBlur() {
			setIsSpacePanning(false)
		}

		window.addEventListener('keydown', onKeyDown)
		window.addEventListener('keyup', onKeyUp)
		window.addEventListener('blur', onBlur)
		return () => {
			window.removeEventListener('keydown', onKeyDown)
			window.removeEventListener('keyup', onKeyUp)
			window.removeEventListener('blur', onBlur)
		}
	}, [])

	const selectedElement = React.useMemo(() => {
		const selected = selectedElementIds[0]
		if (!selected) return null
		for (const band of report.bands) {
			const found = band.elements.find((element) => element.id === selected)
			if (found) return found
		}
		return null
	}, [report.bands, selectedElementIds])

	const selectedBand = React.useMemo(
		() => report.bands.find((band) => band.id === selectedBandId) ?? null,
		[report.bands, selectedBandId],
	)

	const onDrop = React.useCallback(
		(params: {
			bandId: string
			x: number
			y: number
			elementKind?: string
			fieldPath?: string
		}) => {
			if (params.fieldPath) {
				addFieldElement(params.bandId, params.fieldPath, params.x, params.y)
				return
			}
			if (params.elementKind) {
				addElementByKind(
					params.bandId,
					params.elementKind as
						| 'textbox'
						| 'image'
						| 'shape'
						| 'line'
						| 'barcode',
					params.x,
					params.y,
				)
			}
		},
		[addElementByKind, addFieldElement],
	)

	const onElementPointerDown = React.useCallback(
		(elementId: string, event: React.PointerEvent<HTMLButtonElement>) => {
			const targetBand = report.bands.find((band) =>
				band.elements.some((element) => element.id === elementId),
			)
			const element = targetBand?.elements.find((item) => item.id === elementId)
			if (!targetBand || !element) return
			dragRef.current = {
				type: 'move',
				elementId,
				bandId: targetBand.id,
				startX: event.clientX,
				startY: event.clientY,
				elementX: element.x,
				elementY: element.y,
			}
			event.currentTarget.setPointerCapture(event.pointerId)
		},
		[report.bands],
	)

	const onResizeElementStart = React.useCallback(
		(
			handle: 'nw' | 'ne' | 'sw' | 'se',
			event: React.PointerEvent<HTMLButtonElement>,
		) => {
			if (!selectedElement) return
			dragRef.current = {
				type: 'resize-element',
				elementId: selectedElement.id,
				handle,
				startX: event.clientX,
				startY: event.clientY,
				x: selectedElement.x,
				y: selectedElement.y,
				width: selectedElement.width,
				height: selectedElement.height,
			}
		},
		[selectedElement],
	)

	const onResizeBandStart = React.useCallback(
		(band: ReportBand, event: React.PointerEvent<HTMLButtonElement>) => {
			dragRef.current = {
				type: 'resize-band',
				bandId: band.id,
				startY: event.clientY,
				height: band.height,
			}
		},
		[],
	)

	React.useEffect(() => {
		function clearGuides() {
			setGuides({ vertical: [], horizontal: [] })
		}

		function handlePointerMove(event: PointerEvent) {
			const active = dragRef.current
			if (!active) return
			if (active.type === 'pan') {
				setCamera({
					x: active.cameraX + (event.clientX - active.startX),
					y: active.cameraY + (event.clientY - active.startY),
				})
				return
			}
			setPointer(event.clientX, event.clientY)
			if (active.type === 'move') {
				const deltaX = event.clientX - active.startX
				const deltaY = event.clientY - active.startY
				const baseX = active.elementX + deltaX
				const baseY = active.elementY + deltaY
				const nextX = grid.snap ? snap(baseX, grid.size) : baseX
				const nextY = grid.snap ? snap(baseY, grid.size) : baseY
				updateElement(active.elementId, {
					x: Math.max(0, nextX),
					y: Math.max(0, nextY),
				})

				const band = report.bands.find((item) => item.id === active.bandId)
				if (band) {
					const alignedVertical: number[] = []
					const alignedHorizontal: number[] = []
					for (const candidate of band.elements) {
						if (candidate.id === active.elementId) continue
						if (Math.abs(candidate.x - nextX) <= 3)
							alignedVertical.push(candidate.x)
						if (Math.abs(candidate.y - nextY) <= 3)
							alignedHorizontal.push(candidate.y)
					}
					setGuides({
						vertical: alignedVertical,
						horizontal: alignedHorizontal,
					})
				}
			}
			if (active.type === 'resize-element') {
				const deltaX = event.clientX - active.startX
				const deltaY = event.clientY - active.startY
				const nextPatch: Partial<{
					x: number
					y: number
					width: number
					height: number
				}> = {}
				if (active.handle === 'se' || active.handle === 'ne') {
					nextPatch.width = Math.max(16, active.width + deltaX)
				}
				if (active.handle === 'sw' || active.handle === 'nw') {
					nextPatch.width = Math.max(16, active.width - deltaX)
					nextPatch.x = Math.max(0, active.x + deltaX)
				}
				if (active.handle === 'se' || active.handle === 'sw') {
					nextPatch.height = Math.max(12, active.height + deltaY)
				}
				if (active.handle === 'ne' || active.handle === 'nw') {
					nextPatch.height = Math.max(12, active.height - deltaY)
					nextPatch.y = Math.max(0, active.y + deltaY)
				}
				updateElement(active.elementId, nextPatch)
			}
			if (active.type === 'resize-band') {
				resizeBand(
					active.bandId,
					Math.max(24, active.height + (event.clientY - active.startY)),
				)
			}
		}

		function handlePointerUp() {
			dragRef.current = null
			setIsPanning(false)
			clearGuides()
		}

		window.addEventListener('pointermove', handlePointerMove)
		window.addEventListener('pointerup', handlePointerUp)
		return () => {
			window.removeEventListener('pointermove', handlePointerMove)
			window.removeEventListener('pointerup', handlePointerUp)
		}
	}, [
		grid.size,
		grid.snap,
		report.bands,
		resizeBand,
		setCamera,
		setPointer,
		updateElement,
	])

	return (
		<div
			ref={canvasRef}
			className={cn(
				'relative h-full overflow-auto rounded-sm border border-border bg-muted/35 p-3',
				isPanning ? 'cursor-grabbing select-none' : undefined,
				isSpacePanning ? 'cursor-grab' : undefined,
			)}
			onPointerDownCapture={(event) => {
				const shouldStartPan =
					event.button === 1 || (isSpacePanning && event.button === 0)
				if (!shouldStartPan) return
				event.preventDefault()
				event.stopPropagation()
				dragRef.current = {
					type: 'pan',
					startX: event.clientX,
					startY: event.clientY,
					cameraX: camera.x,
					cameraY: camera.y,
				}
				setIsPanning(true)
			}}
			onWheel={(event) => {
				if (event.ctrlKey || event.metaKey) {
					event.preventDefault()
					const nextZoom = Math.max(
						0.2,
						Math.min(4, camera.z + -event.deltaY / 500),
					)
					if (nextZoom === camera.z) return
					const rect = event.currentTarget.getBoundingClientRect()
					const localX =
						event.clientX - rect.left + event.currentTarget.scrollLeft - 16
					const localY =
						event.clientY - rect.top + event.currentTarget.scrollTop - 16
					const worldX = (localX - camera.x) / camera.z
					const worldY = (localY - camera.y) / camera.z
					setCamera({
						z: nextZoom,
						x: localX - worldX * nextZoom,
						y: localY - worldY * nextZoom,
					})
					return
				}
				setCamera({
					x: camera.x - event.deltaX * 0.9,
					y: camera.y - event.deltaY * 0.9,
				})
			}}
		>
			<div
				className='origin-top-left'
				style={{
					transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.z})`,
				}}
			>
				<PageSurface
					report={report}
					zoom={camera.z}
					rulers={rulers}
					grid={{ show: grid.show, size: grid.size }}
					showBandHeaders={showBandHeaders}
					showElementOrder={showElementOrder}
					selectedBandId={selectedBandId}
					selectedElementIds={selectedElementIds}
					selectedElement={selectedElement}
					guides={guides}
					onDrop={onDrop}
					onSelectBand={selectBand}
					onSelectElement={selectElement}
					onElementPointerDown={onElementPointerDown}
					onResizeElementStart={onResizeElementStart}
					onResizeBandStart={onResizeBandStart}
				/>
			</div>
			<MiniMap
				report={report}
				camera={camera}
				onJump={(x, y) => {
					setCamera({ x: -x / 2, y: -y / 2 })
				}}
			/>
			{selectedBand ? (
				<div className='absolute bottom-3 left-3 rounded-sm border border-border bg-background/95 px-2 py-1 text-[10px] text-muted-foreground shadow-xs'>
					Selected band: <strong>{selectedBand.type}</strong> ·{' '}
					{selectedElementIds.length} selected
				</div>
			) : null}
		</div>
	)
}
