import type {
	ReportBand,
	ReportDefinition,
	ReportElement,
} from '@server/reporting/designer-contracts'
import { temporal } from 'zundo'
import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import {
	DEFAULT_GRID_SIZE,
	DESIGNER_KEYBOARD_STEP,
	type DESIGNER_TABS,
} from './constants'
import {
	cloneReport,
	createBand,
	createElement,
	ensureReport,
	snap,
} from './utils'

export interface DesignerStoreState {
	report: ReportDefinition
	selectedBandId: string | null
	selectedElementIds: string[]
	activeTab: (typeof DESIGNER_TABS)[number]
	interactionMode: 'select' | 'insert' | 'pan'
	camera: { x: number; y: number; z: number }
	grid: { size: number; show: boolean; snap: boolean }
	rulers: { show: boolean; unit: 'pt' | 'mm' | 'in' }
	showBandHeaders: boolean
	showElementOrder: boolean
	clipboard: ReportElement[] | null
	panelVisibility: {
		toolbox: boolean
		properties: boolean
		dictionary: boolean
		tree: boolean
	}
	isDirty: boolean
	lastPointer: { x: number; y: number }
	setReport: (report: ReportDefinition) => void
	markSaved: () => void
	setActiveTab: (tab: (typeof DESIGNER_TABS)[number]) => void
	setInteractionMode: (mode: 'select' | 'insert' | 'pan') => void
	setPointer: (x: number, y: number) => void
	setCamera: (camera: Partial<{ x: number; y: number; z: number }>) => void
	zoomToFit: () => void
	toggleGrid: () => void
	toggleGridSnap: () => void
	toggleRulers: () => void
	toggleBandHeaders: () => void
	toggleElementOrder: () => void
	setGridSize: (size: number) => void
	togglePanel: (panel: keyof DesignerStoreState['panelVisibility']) => void
	setUnit: (unit: 'pt' | 'mm' | 'in') => void
	addBand: (type: ReportBand['type']) => void
	removeBand: (bandId: string) => void
	updateBand: (bandId: string, patch: Partial<ReportBand>) => void
	reorderBands: (bandIds: string[]) => void
	resizeBand: (bandId: string, height: number) => void
	addElement: (bandId: string, element: ReportElement) => void
	addElementByKind: (
		bandId: string,
		kind: ReportElement['kind'],
		x: number,
		y: number,
	) => void
	addFieldElement: (
		bandId: string,
		fieldPath: string,
		x: number,
		y: number,
	) => void
	updateElement: (elementId: string, patch: Partial<ReportElement>) => void
	removeElements: (elementIds: string[]) => void
	moveElement: (
		elementId: string,
		targetBandId: string,
		x: number,
		y: number,
	) => void
	bringSelectedToFront: () => void
	sendSelectedToBack: () => void
	moveSelectedForward: () => void
	moveSelectedBackward: () => void
	nudgeSelected: (dx: number, dy: number) => void
	duplicateElements: (elementIds: string[]) => void
	selectBand: (bandId: string | null) => void
	selectElement: (elementId: string, additive?: boolean) => void
	setSelection: (elementIds: string[]) => void
	clearSelection: () => void
	selectAllInBand: (bandId: string) => void
	copy: () => void
	cut: () => void
	paste: (bandId: string) => void
}

function findElementLocation(
	report: ReportDefinition,
	elementId: string,
): {
	bandIndex: number
	elementIndex: number
} | null {
	for (let bandIndex = 0; bandIndex < report.bands.length; bandIndex += 1) {
		const band = report.bands[bandIndex]
		const elementIndex = band.elements.findIndex(
			(element) => element.id === elementId,
		)
		if (elementIndex >= 0) return { bandIndex, elementIndex }
	}
	return null
}

function withDirty(state: DesignerStoreState): void {
	state.isDirty = true
}

function moveSelectedElementsInBand(
	band: ReportBand,
	selectedIds: Set<string>,
	direction: 'front' | 'back' | 'forward' | 'backward',
): boolean {
	if (selectedIds.size === 0) return false
	const hasSelected = band.elements.some((element) =>
		selectedIds.has(element.id),
	)
	if (!hasSelected) return false

	if (direction === 'front') {
		const kept = band.elements.filter((element) => !selectedIds.has(element.id))
		const selected = band.elements.filter((element) =>
			selectedIds.has(element.id),
		)
		band.elements = [...kept, ...selected]
		return true
	}

	if (direction === 'back') {
		const selected = band.elements.filter((element) =>
			selectedIds.has(element.id),
		)
		const kept = band.elements.filter((element) => !selectedIds.has(element.id))
		band.elements = [...selected, ...kept]
		return true
	}

	if (direction === 'forward') {
		for (let index = band.elements.length - 2; index >= 0; index -= 1) {
			const current = band.elements[index]
			const next = band.elements[index + 1]
			if (!current || !next) continue
			if (selectedIds.has(current.id) && !selectedIds.has(next.id)) {
				band.elements[index] = next
				band.elements[index + 1] = current
			}
		}
		return true
	}

	for (let index = 1; index < band.elements.length; index += 1) {
		const current = band.elements[index]
		const previous = band.elements[index - 1]
		if (!current || !previous) continue
		if (selectedIds.has(current.id) && !selectedIds.has(previous.id)) {
			band.elements[index] = previous
			band.elements[index - 1] = current
		}
	}
	return true
}

const storeCreator = temporal(
	subscribeWithSelector(
		immer<DesignerStoreState>((set, get) => ({
			report: ensureReport(undefined),
			selectedBandId: null,
			selectedElementIds: [],
			activeTab: 'Home',
			interactionMode: 'select',
			camera: { x: 0, y: 0, z: 1 },
			grid: { size: DEFAULT_GRID_SIZE, show: true, snap: true },
			rulers: { show: true, unit: 'pt' },
			showBandHeaders: true,
			showElementOrder: false,
			clipboard: null,
			panelVisibility: {
				toolbox: true,
				properties: true,
				dictionary: true,
				tree: true,
			},
			isDirty: false,
			lastPointer: { x: 0, y: 0 },
			setReport: (report) =>
				set((state) => {
					state.report = ensureReport(cloneReport(report))
					state.selectedBandId = state.report.bands[0]?.id ?? null
					state.selectedElementIds = []
					state.isDirty = false
				}),
			markSaved: () =>
				set((state) => {
					state.isDirty = false
				}),
			setActiveTab: (tab) =>
				set((state) => {
					state.activeTab = tab
				}),
			setInteractionMode: (mode) =>
				set((state) => {
					state.interactionMode = mode
				}),
			setPointer: (x, y) =>
				set((state) => {
					state.lastPointer = { x, y }
				}),
			setCamera: (camera) =>
				set((state) => {
					state.camera = {
						...state.camera,
						...camera,
						z: Math.max(0.2, Math.min(4, camera.z ?? state.camera.z)),
					}
				}),
			zoomToFit: () =>
				set((state) => {
					state.camera = { x: 0, y: 0, z: 0.9 }
				}),
			toggleGrid: () =>
				set((state) => {
					state.grid.show = !state.grid.show
				}),
			toggleGridSnap: () =>
				set((state) => {
					state.grid.snap = !state.grid.snap
				}),
			toggleRulers: () =>
				set((state) => {
					state.rulers.show = !state.rulers.show
				}),
			toggleBandHeaders: () =>
				set((state) => {
					state.showBandHeaders = !state.showBandHeaders
				}),
			toggleElementOrder: () =>
				set((state) => {
					state.showElementOrder = !state.showElementOrder
				}),
			setGridSize: (size) =>
				set((state) => {
					state.grid.size = Math.max(2, Math.min(64, size))
				}),
			togglePanel: (panel) =>
				set((state) => {
					state.panelVisibility[panel] = !state.panelVisibility[panel]
				}),
			setUnit: (unit) =>
				set((state) => {
					state.rulers.unit = unit
				}),
			addBand: (type) =>
				set((state) => {
					state.report.bands.push(createBand(type))
					withDirty(state)
				}),
			removeBand: (bandId) =>
				set((state) => {
					state.report.bands = state.report.bands.filter(
						(band) => band.id !== bandId,
					)
					if (state.selectedBandId === bandId) {
						state.selectedBandId = state.report.bands[0]?.id ?? null
					}
					state.selectedElementIds = []
					withDirty(state)
				}),
			updateBand: (bandId, patch) =>
				set((state) => {
					const target = state.report.bands.find((band) => band.id === bandId)
					if (!target) return
					Object.assign(target, patch)
					withDirty(state)
				}),
			reorderBands: (bandIds) =>
				set((state) => {
					const order = new Map(
						state.report.bands.map((band) => [band.id, band]),
					)
					state.report.bands = bandIds
						.map((id) => order.get(id))
						.filter((band): band is ReportBand => Boolean(band))
					withDirty(state)
				}),
			resizeBand: (bandId, height) =>
				set((state) => {
					const band = state.report.bands.find((item) => item.id === bandId)
					if (!band) return
					band.height = Math.max(12, height)
					withDirty(state)
				}),
			addElement: (bandId, element) =>
				set((state) => {
					const band = state.report.bands.find((item) => item.id === bandId)
					if (!band) return
					band.elements.push(element)
					state.selectedBandId = bandId
					state.selectedElementIds = [element.id]
					withDirty(state)
				}),
			addElementByKind: (bandId, kind, x, y) =>
				set((state) => {
					const band = state.report.bands.find((item) => item.id === bandId)
					if (!band) return
					const element = createElement(kind)
					element.x = state.grid.snap ? snap(x, state.grid.size) : x
					element.y = state.grid.snap ? snap(y, state.grid.size) : y
					band.elements.push(element)
					state.selectedBandId = bandId
					state.selectedElementIds = [element.id]
					withDirty(state)
				}),
			addFieldElement: (bandId, fieldPath, x, y) =>
				set((state) => {
					const band = state.report.bands.find((item) => item.id === bandId)
					if (!band) return
					const element = createElement('textbox')
					element.staticText = undefined
					element.expression = `=Fields.${fieldPath}`
					element.x = state.grid.snap ? snap(x, state.grid.size) : x
					element.y = state.grid.snap ? snap(y, state.grid.size) : y
					band.elements.push(element)
					state.selectedElementIds = [element.id]
					state.selectedBandId = bandId
					withDirty(state)
				}),
			updateElement: (elementId, patch) =>
				set((state) => {
					const location = findElementLocation(state.report, elementId)
					if (!location) return
					const element =
						state.report.bands[location.bandIndex]?.elements[
							location.elementIndex
						]
					if (!element) return
					Object.assign(element, patch)
					withDirty(state)
				}),
			removeElements: (elementIds) =>
				set((state) => {
					const setIds = new Set(elementIds)
					for (const band of state.report.bands) {
						band.elements = band.elements.filter(
							(element) => !setIds.has(element.id),
						)
					}
					state.selectedElementIds = state.selectedElementIds.filter(
						(id) => !setIds.has(id),
					)
					withDirty(state)
				}),
			moveElement: (elementId, targetBandId, x, y) =>
				set((state) => {
					const location = findElementLocation(state.report, elementId)
					if (!location) return
					const sourceBand = state.report.bands[location.bandIndex]
					const element = sourceBand?.elements[location.elementIndex]
					if (!sourceBand || !element) return
					sourceBand.elements.splice(location.elementIndex, 1)
					const targetBand = state.report.bands.find(
						(item) => item.id === targetBandId,
					)
					if (!targetBand) return
					element.x = state.grid.snap ? snap(x, state.grid.size) : x
					element.y = state.grid.snap ? snap(y, state.grid.size) : y
					targetBand.elements.push(element)
					state.selectedElementIds = [element.id]
					state.selectedBandId = targetBandId
					withDirty(state)
				}),
			bringSelectedToFront: () =>
				set((state) => {
					if (state.selectedElementIds.length === 0) return
					const selectedIds = new Set(state.selectedElementIds)
					let changed = false
					for (const band of state.report.bands) {
						changed =
							moveSelectedElementsInBand(band, selectedIds, 'front') || changed
					}
					if (changed) withDirty(state)
				}),
			sendSelectedToBack: () =>
				set((state) => {
					if (state.selectedElementIds.length === 0) return
					const selectedIds = new Set(state.selectedElementIds)
					let changed = false
					for (const band of state.report.bands) {
						changed =
							moveSelectedElementsInBand(band, selectedIds, 'back') || changed
					}
					if (changed) withDirty(state)
				}),
			moveSelectedForward: () =>
				set((state) => {
					if (state.selectedElementIds.length === 0) return
					const selectedIds = new Set(state.selectedElementIds)
					let changed = false
					for (const band of state.report.bands) {
						changed =
							moveSelectedElementsInBand(band, selectedIds, 'forward') ||
							changed
					}
					if (changed) withDirty(state)
				}),
			moveSelectedBackward: () =>
				set((state) => {
					if (state.selectedElementIds.length === 0) return
					const selectedIds = new Set(state.selectedElementIds)
					let changed = false
					for (const band of state.report.bands) {
						changed =
							moveSelectedElementsInBand(band, selectedIds, 'backward') ||
							changed
					}
					if (changed) withDirty(state)
				}),
			nudgeSelected: (dx, dy) =>
				set((state) => {
					if (state.selectedElementIds.length === 0) return
					for (const elementId of state.selectedElementIds) {
						const location = findElementLocation(state.report, elementId)
						if (!location) continue
						const element =
							state.report.bands[location.bandIndex]?.elements[
								location.elementIndex
							]
						if (!element) continue
						element.x = Math.max(0, element.x + dx)
						element.y = Math.max(0, element.y + dy)
					}
					withDirty(state)
				}),
			duplicateElements: (elementIds) =>
				set((state) => {
					const nextIds: string[] = []
					for (const id of elementIds) {
						const location = findElementLocation(state.report, id)
						if (!location) continue
						const element =
							state.report.bands[location.bandIndex]?.elements[
								location.elementIndex
							]
						if (!element) continue
						const duplicate = JSON.parse(
							JSON.stringify(element),
						) as ReportElement
						duplicate.id = `el-${Math.random().toString(36).slice(2, 10)}`
						duplicate.x += DESIGNER_KEYBOARD_STEP
						duplicate.y += DESIGNER_KEYBOARD_STEP
						state.report.bands[location.bandIndex]?.elements.push(duplicate)
						nextIds.push(duplicate.id)
					}
					if (nextIds.length > 0) {
						state.selectedElementIds = nextIds
						withDirty(state)
					}
				}),
			selectBand: (bandId) =>
				set((state) => {
					state.selectedBandId = bandId
				}),
			selectElement: (elementId, additive) =>
				set((state) => {
					if (additive) {
						const set = new Set(state.selectedElementIds)
						if (set.has(elementId)) {
							set.delete(elementId)
						} else {
							set.add(elementId)
						}
						state.selectedElementIds = Array.from(set)
						return
					}
					state.selectedElementIds = [elementId]
				}),
			setSelection: (elementIds) =>
				set((state) => {
					state.selectedElementIds = elementIds
				}),
			clearSelection: () =>
				set((state) => {
					state.selectedElementIds = []
				}),
			selectAllInBand: (bandId) =>
				set((state) => {
					const band = state.report.bands.find((item) => item.id === bandId)
					if (!band) return
					state.selectedBandId = bandId
					state.selectedElementIds = band.elements.map((element) => element.id)
				}),
			copy: () =>
				set((state) => {
					const copied: ReportElement[] = []
					for (const id of state.selectedElementIds) {
						const location = findElementLocation(state.report, id)
						if (!location) continue
						const source =
							state.report.bands[location.bandIndex]?.elements[
								location.elementIndex
							]
						if (!source) continue
						copied.push(JSON.parse(JSON.stringify(source)) as ReportElement)
					}
					state.clipboard = copied.length > 0 ? copied : null
				}),
			cut: () => {
				get().copy()
				set((state) => {
					const setIds = new Set(state.selectedElementIds)
					for (const band of state.report.bands) {
						band.elements = band.elements.filter(
							(element) => !setIds.has(element.id),
						)
					}
					state.selectedElementIds = []
					withDirty(state)
				})
			},
			paste: (bandId) =>
				set((state) => {
					const band = state.report.bands.find((item) => item.id === bandId)
					if (!band || !state.clipboard || state.clipboard.length === 0) return
					const pasted = state.clipboard.map((element) => ({
						...JSON.parse(JSON.stringify(element)),
						id: `el-${Math.random().toString(36).slice(2, 10)}`,
						x: element.x + 12,
						y: element.y + 12,
					})) as ReportElement[]
					band.elements.push(...pasted)
					state.selectedElementIds = pasted.map((element) => element.id)
					state.selectedBandId = bandId
					withDirty(state)
				}),
		})),
	),
	{
		limit: 100,
		partialize: (state) => ({ report: state.report }),
	},
)

export const useReportDesignerStore = create<DesignerStoreState>()(
	storeCreator as never,
)

type TemporalControls = {
	undo: () => void
	redo: () => void
	clear: () => void
	pastStates?: unknown[]
	futureStates?: unknown[]
}

function temporalControls(): TemporalControls | null {
	const store = useReportDesignerStore as unknown as {
		temporal?: {
			getState: () => TemporalControls
		}
	}
	return store.temporal?.getState() ?? null
}

export function undoDesignerHistory(): void {
	temporalControls()?.undo()
}

export function redoDesignerHistory(): void {
	temporalControls()?.redo()
}

export function clearDesignerHistory(): void {
	temporalControls()?.clear()
}

export function historyAvailability(): { canUndo: boolean; canRedo: boolean } {
	const controls = temporalControls()
	return {
		canUndo: Boolean(controls?.pastStates?.length),
		canRedo: Boolean(controls?.futureStates?.length),
	}
}
