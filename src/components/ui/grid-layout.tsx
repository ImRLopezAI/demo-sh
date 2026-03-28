'use client'

import { mergeProps } from '@base-ui/react/merge-props'
import { useRender } from '@base-ui/react/use-render'
import * as React from 'react'
import {
	type Layout,
	type LayoutItem,
	type ResponsiveLayouts,
	GridLayout as RGLGridLayoutBase,
	ResponsiveGridLayout as RGLResponsiveGridLayoutBase,
	useContainerWidth,
} from 'react-grid-layout'
import { cn } from '@/lib/utils'

const RGLGridLayout = RGLGridLayoutBase as unknown as React.ComponentType<any>
const RGLResponsiveGridLayout =
	RGLResponsiveGridLayoutBase as unknown as React.ComponentType<any>

// ============================================================================
// Types
// ============================================================================

export type GridBreakpoint = 'lg' | 'md' | 'sm' | 'xs' | 'xxs'
export type GridLayoutItem = LayoutItem

export interface GridConfig {
	cols?: number
	rowHeight?: number
	margin?: readonly [number, number]
	containerPadding?: readonly [number, number] | null
}

export interface DragConfig {
	enabled?: boolean
	handle?: string
}

export interface ResizeConfig {
	enabled?: boolean
	handles?: Array<'s' | 'w' | 'e' | 'n' | 'sw' | 'nw' | 'se' | 'ne'>
}

export interface GridLayoutState {
	layouts: Record<GridBreakpoint, GridLayoutItem[]>
	breakpoint: GridBreakpoint
	isEditing: boolean
}

type GridLayoutDispatchAction =
	| Partial<GridLayoutState>
	| ((prev: GridLayoutState) => Partial<GridLayoutState>)

interface GridLayoutStore {
	subscribe: (callback: () => void) => () => void
	getState: () => GridLayoutState
	setState: (action: GridLayoutDispatchAction) => void
	reset: () => void
	notify: () => void
	batch: (fn: () => void) => void
}

export interface GridStyleConfig {
	placeholderColor?: string
	placeholderBorderColor?: string
}

export type GridStorageType = 'localStorage' | 'sessionStorage'

export interface GridPersistenceConfig {
	key?: string
	storage?: GridStorageType
}

// ============================================================================
// Constants
// ============================================================================

export const DEFAULT_BREAKPOINTS: Record<GridBreakpoint, number> = {
	lg: 1280,
	md: 992,
	sm: 767,
	xs: 480,
	xxs: 0,
}

export const DEFAULT_COLS: Record<GridBreakpoint, number> = {
	lg: 12,
	md: 10,
	sm: 6,
	xs: 4,
	xxs: 2,
}

const GRID_BREAKPOINTS: GridBreakpoint[] = ['lg', 'md', 'sm', 'xs', 'xxs']

const DEFAULT_GRID_CONFIG: GridConfig = {
	cols: 12,
	rowHeight: 150,
	margin: [16, 16],
	containerPadding: [0, 0],
}

const DEFAULT_DRAG_CONFIG: DragConfig = {
	enabled: true,
}

const DEFAULT_RESIZE_CONFIG: ResizeConfig = {
	enabled: true,
}

const getStorage = (storageType?: GridStorageType) => {
	if (typeof window === 'undefined') return null
	return storageType === 'sessionStorage'
		? window.sessionStorage
		: window.localStorage
}

const readPersistedState = (
	config: ResolvedGridPersistenceConfig,
): {
	layouts: GridLayoutState['layouts']
	breakpoint: GridBreakpoint | undefined
} | null => {
	const storage = getStorage(config.storage)
	if (!storage) return null
	const key = config.key
	if (!key) return null

	const raw = storage.getItem(key)
	if (!raw) return null

	try {
		const parsed = JSON.parse(raw) as Partial<GridLayoutState>
		if (!parsed || typeof parsed !== 'object') return null
		if (!parsed.layouts || typeof parsed.layouts !== 'object') return null

		return {
			layouts: parsed.layouts as GridLayoutState['layouts'],
			breakpoint: parsed.breakpoint,
		}
	} catch {
		return null
	}
}

const writePersistedState = (
	config: ResolvedGridPersistenceConfig,
	state: Pick<GridLayoutState, 'layouts' | 'breakpoint'>,
) => {
	const storage = getStorage(config.storage)
	if (!storage) return
	const key = config.key
	if (!key) return

	try {
		storage.setItem(key, JSON.stringify(state))
	} catch {
		return
	}
}

const buildGridStyle = (styleConfig?: GridStyleConfig) => {
	if (!styleConfig?.placeholderColor && !styleConfig?.placeholderBorderColor) {
		return undefined
	}

	return {
		...(styleConfig.placeholderColor
			? { ['--grid-placeholder' as const]: styleConfig.placeholderColor }
			: {}),
		...(styleConfig.placeholderBorderColor
			? {
					['--grid-placeholder-border' as const]:
						styleConfig.placeholderBorderColor,
				}
			: {}),
	} as React.CSSProperties
}

type ResolvedGridPersistenceConfig = {
	key: string
	storage?: GridStorageType
}

const hashString = (value: string) => {
	let hash = 5381
	for (let i = 0; i < value.length; i += 1) {
		hash = (hash * 33) ^ value.charCodeAt(i)
	}
	return (hash >>> 0).toString(36)
}

const stableStringify = (value: unknown, seen = new Set<unknown>()): string => {
	if (value === null) return 'null'

	const valueType = typeof value
	if (valueType === 'number' || valueType === 'boolean') {
		return String(value)
	}
	if (valueType === 'string') {
		return JSON.stringify(value)
	}
	if (valueType === 'undefined' || valueType === 'function') {
		return 'null'
	}

	if (Array.isArray(value)) {
		return `[${value.map((item) => stableStringify(item, seen)).join(',')}]`
	}

	if (valueType === 'object') {
		if (seen.has(value)) return 'null'
		seen.add(value)

		const entries = Object.entries(value as Record<string, unknown>)
			.filter(([, entryValue]) => {
				const entryType = typeof entryValue
				return entryType !== 'undefined' && entryType !== 'function'
			})
			.sort(([left], [right]) => left.localeCompare(right))

		const body = entries
			.map(
				([key, entryValue]) =>
					`${JSON.stringify(key)}:${stableStringify(entryValue, seen)}`,
			)
			.join(',')

		seen.delete(value)
		return `{${body}}`
	}

	return 'null'
}

const buildStorageKeyFromConfig = (config: CreateGridProps) => {
	const signature = stableStringify({
		initialLayouts: config.initialLayouts,
		gridConfig: config.gridConfig,
		breakpoints: config.breakpoints,
		cols: config.cols,
		initialBreakpoint: config.initialBreakpoint,
	})

	return `grid:${hashString(signature)}`
}

const resolvePersistenceConfig = (
	config: CreateGridProps,
): ResolvedGridPersistenceConfig | undefined => {
	if (config.persistence === false) return undefined
	const persistence = config.persistence
	const key =
		persistence?.key ?? config.storageKey ?? buildStorageKeyFromConfig(config)

	return {
		key,
		storage: persistence?.storage ?? config.storage,
	}
}

const resolveDragProps = (dragConfig: DragConfig, isEditing?: boolean) => {
	const enabled = dragConfig.enabled ?? DEFAULT_DRAG_CONFIG.enabled
	return {
		isDraggable: enabled && (isEditing ?? true),
		draggableHandle: dragConfig.handle,
	}
}

const resolveResizeProps = (
	resizeConfig: ResizeConfig,
	isEditing?: boolean,
) => {
	const enabled = resizeConfig.enabled ?? DEFAULT_RESIZE_CONFIG.enabled
	const isResizable = enabled && (isEditing ?? true)
	return {
		isResizable,
		resizeHandles: isResizable ? resizeConfig.handles : [],
	}
}

type GridLayoutsInput = Partial<Record<GridBreakpoint, GridLayoutItem[]>>

const scaleLayoutItem = (
	item: GridLayoutItem,
	scale: number,
	cols: number,
): GridLayoutItem => {
	const scaledWidth = Math.max(1, Math.round(item.w * scale))
	const width = Math.min(cols, scaledWidth)
	const scaledX = Math.round(item.x * scale)
	const x = Math.max(0, Math.min(scaledX, cols - width))
	const minW =
		item.minW !== undefined
			? Math.min(width, Math.max(1, Math.round(item.minW * scale)))
			: undefined
	const maxW =
		item.maxW !== undefined
			? Math.min(cols, Math.max(width, Math.round(item.maxW * scale)))
			: undefined

	return {
		...item,
		x,
		w: width,
		...(minW !== undefined ? { minW } : {}),
		...(maxW !== undefined ? { maxW } : {}),
	}
}

const resolveBaseLayout = (
	layouts: GridLayoutsInput,
): { breakpoint: GridBreakpoint; layout: GridLayoutItem[] } => {
	for (const breakpoint of GRID_BREAKPOINTS) {
		const layout = layouts[breakpoint]
		if (layout && layout.length > 0) {
			return { breakpoint, layout }
		}
	}

	return { breakpoint: 'lg', layout: layouts.lg ?? [] }
}

const normalizeLayouts = (
	layouts: GridLayoutsInput | undefined,
	cols: Record<GridBreakpoint, number>,
): Record<GridBreakpoint, GridLayoutItem[]> => {
	const resolvedLayouts = layouts ?? {}
	const baseLayoutResult = resolveBaseLayout(resolvedLayouts)
	const baseBreakpoint: GridBreakpoint = baseLayoutResult.breakpoint
	const baseLayout = baseLayoutResult.layout
	const baseCols = cols[baseBreakpoint] ?? DEFAULT_COLS[baseBreakpoint]

	const normalized = {} as Record<GridBreakpoint, GridLayoutItem[]>

	for (const breakpoint of GRID_BREAKPOINTS) {
		const explicit = resolvedLayouts[breakpoint]
		if (explicit && explicit.length > 0) {
			normalized[breakpoint] = explicit
			continue
		}

		if (!baseLayout.length) {
			normalized[breakpoint] = []
			continue
		}

		if (breakpoint === baseBreakpoint) {
			normalized[breakpoint] = baseLayout
			continue
		}

		const targetCols = cols[breakpoint] ?? DEFAULT_COLS[breakpoint]
		const scale = targetCols / baseCols
		normalized[breakpoint] = baseLayout.map((item) =>
			scaleLayoutItem(item, scale, targetCols),
		)
	}

	return normalized
}

// ============================================================================
// Context
// ============================================================================

interface GridLayoutContextValue {
	state: GridLayoutState
	dispatch: (action: GridLayoutDispatchAction) => void
	gridConfig: GridConfig
	dragConfig: DragConfig
	resizeConfig: ResizeConfig
	setLayout: (breakpoint: GridBreakpoint, layout: GridLayoutItem[]) => void
	setBreakpoint: (breakpoint: GridBreakpoint) => void
	setEditing: (isEditing: boolean) => void
	updateItem: (itemId: string, updates: Partial<GridLayoutItem>) => void
	addItem: (item: GridLayoutItem) => void
	removeItem: (itemId: string) => void
}

const GridLayoutContext = React.createContext<
	GridLayoutContextValue | undefined
>(undefined)

export function useGridLayoutContext() {
	const context = React.useContext(GridLayoutContext)
	if (!context) {
		throw new Error(
			'useGridLayoutContext must be used within a GridLayout.Provider',
		)
	}
	return context
}

function useGridLayoutStore<T>(
	store: GridLayoutStore,
	selector: (state: GridLayoutState) => T,
): T {
	const getSnapshot = React.useCallback(
		() => selector(store.getState()),
		[store, selector],
	)

	return React.useSyncExternalStore(store.subscribe, getSnapshot, getSnapshot)
}

// ============================================================================
// useGridLayout Hook (standalone usage)
// ============================================================================

export interface UseGridLayoutOptions {
	initialLayouts?: GridLayoutsInput
	initialBreakpoint?: GridBreakpoint
	initialEditing?: boolean
	cols?: Record<GridBreakpoint, number>
}

export function useGridLayout(options: UseGridLayoutOptions = {}) {
	const {
		initialLayouts = { lg: [], md: [], sm: [], xs: [], xxs: [] },
		initialBreakpoint = 'lg',
		initialEditing = false,
		cols = DEFAULT_COLS,
	} = options

	const initialStateRef = React.useRef<GridLayoutState | null>(null)
	if (!initialStateRef.current) {
		initialStateRef.current = {
			layouts: normalizeLayouts(initialLayouts, cols),
			breakpoint: initialBreakpoint,
			isEditing: initialEditing,
		}
	}

	const stateRef = React.useRef<GridLayoutState>(initialStateRef.current)
	const listenersRef = React.useRef<Set<() => void>>(new Set())

	const store = React.useMemo<GridLayoutStore>(() => {
		let isBatching = false
		let pendingNotification = false

		const notify = () => {
			for (const listener of listenersRef.current) {
				listener()
			}
		}

		const scheduleNotify = () => {
			if (isBatching) {
				pendingNotification = true
				return
			}
			if (pendingNotification) return
			pendingNotification = true
			queueMicrotask(() => {
				pendingNotification = false
				notify()
			})
		}

		return {
			subscribe: (callback) => {
				listenersRef.current.add(callback)
				return () => listenersRef.current.delete(callback)
			},
			getState: () => stateRef.current,
			setState: (action) => {
				const prev = stateRef.current
				const updates = typeof action === 'function' ? action(prev) : action
				if (!updates || Object.keys(updates).length === 0) return
				let changed = false
				for (const key of Object.keys(updates) as Array<
					keyof GridLayoutState
				>) {
					if (!Object.is(prev[key], updates[key])) {
						changed = true
						break
					}
				}
				if (!changed) return
				stateRef.current = { ...prev, ...updates }
				scheduleNotify()
			},
			reset: () => {
				stateRef.current = initialStateRef.current as GridLayoutState
				scheduleNotify()
			},
			notify: scheduleNotify,
			batch: (fn) => {
				if (isBatching) {
					fn()
					return
				}
				isBatching = true
				try {
					fn()
				} finally {
					isBatching = false
					if (pendingNotification) {
						pendingNotification = false
						notify()
					}
				}
			},
		}
	}, [])

	const breakpoint = useGridLayoutStore(store, (state) => state.breakpoint)
	const isEditing = useGridLayoutStore(store, (state) => state.isEditing)
	const state = React.useMemo<GridLayoutState>(
		() => ({
			layouts: store.getState().layouts,
			breakpoint,
			isEditing,
		}),
		[store, breakpoint, isEditing],
	)

	const dispatch = React.useCallback(
		(action: GridLayoutDispatchAction) => {
			store.setState(action)
		},
		[store],
	)

	const reset = React.useCallback(() => {
		store.reset()
	}, [store])

	const proxyRef = React.useRef<GridLayoutState | null>(null)
	if (!proxyRef.current) {
		proxyRef.current = new Proxy({} as GridLayoutState, {
			get(_target, prop) {
				if (typeof prop === 'symbol') return undefined
				return store.getState()[prop as keyof GridLayoutState]
			},
			set(_target, prop, value) {
				if (typeof prop === 'symbol') return false
				store.setState({ [prop]: value } as Partial<GridLayoutState>)
				return true
			},
			has(_target, prop) {
				if (typeof prop === 'symbol') return false
				return prop in store.getState()
			},
			ownKeys() {
				return Reflect.ownKeys(store.getState())
			},
			getOwnPropertyDescriptor(_target, prop) {
				if (typeof prop === 'symbol') return undefined
				if (prop in store.getState()) {
					return {
						enumerable: true,
						configurable: true,
						value: store.getState()[prop as keyof GridLayoutState],
					}
				}
				return undefined
			},
		})
	}
	const proxy = proxyRef.current

	const setLayout = React.useCallback(
		(breakpoint: GridBreakpoint, layout: GridLayoutItem[]) => {
			store.setState((prev: GridLayoutState) => ({
				layouts: { ...prev.layouts, [breakpoint]: layout },
			}))
		},
		[store],
	)

	const setBreakpoint = React.useCallback(
		(breakpoint: GridBreakpoint) => store.setState({ breakpoint }),
		[store],
	)

	const setEditing = React.useCallback(
		(isEditing: boolean) => store.setState({ isEditing }),
		[store],
	)

	const updateItem = React.useCallback(
		(itemId: string, updates: Partial<GridLayoutItem>) => {
			store.setState((prev: GridLayoutState) => {
				const layout = prev.layouts[prev.breakpoint]
				const index = layout.findIndex((item) => item.i === itemId)
				if (index === -1) return {}
				return {
					layouts: {
						...prev.layouts,
						[prev.breakpoint]: [
							...layout.slice(0, index),
							{ ...layout[index], ...updates },
							...layout.slice(index + 1),
						],
					},
				}
			})
		},
		[store],
	)

	const addItem = React.useCallback(
		(item: GridLayoutItem) => {
			store.setState((prev: GridLayoutState) => ({
				layouts: {
					...prev.layouts,
					[prev.breakpoint]: [...prev.layouts[prev.breakpoint], item],
				},
			}))
		},
		[store],
	)

	const removeItem = React.useCallback(
		(itemId: string) => {
			store.setState((prev: GridLayoutState) => {
				const newLayouts = { ...prev.layouts }
				for (const bp of Object.keys(newLayouts) as GridBreakpoint[]) {
					newLayouts[bp] = newLayouts[bp].filter((item) => item.i !== itemId)
				}
				return { layouts: newLayouts }
			})
		},
		[store],
	)

	const currentLayout = React.useMemo(
		() => store.getState().layouts[breakpoint],
		[store, breakpoint],
	)

	return {
		state,
		proxy,
		dispatch,
		reset,
		setLayout,
		setBreakpoint,
		setEditing,
		updateItem,
		addItem,
		removeItem,
		currentLayout,
		store,
		getState: store.getState,
	}
}

export type GridLayoutHook = ReturnType<typeof useGridLayout>

// ============================================================================
// Factory Hook (useCreateGrid pattern like useCreateForm)
// ============================================================================

interface CreateGridProps {
	initialLayouts?: GridLayoutsInput
	initialBreakpoint?: GridBreakpoint
	initialEditing?: boolean
	gridConfig?: Partial<GridConfig>
	dragConfig?: DragConfig
	resizeConfig?: ResizeConfig
	styleConfig?: GridStyleConfig
	persistence?: GridPersistenceConfig | false
	storageKey?: string
	storage?: GridStorageType
	breakpoints?: Record<GridBreakpoint, number>
	cols?: Record<GridBreakpoint, number>
	onLayoutChange?: (layout: Layout, allLayouts: ResponsiveLayouts) => void
	onBreakpointChange?: (breakpoint: string, cols: number) => void
}

interface GridProviderProps extends useRender.ComponentProps<'div'> {}

interface GridContainerProps extends useRender.ComponentProps<'div'> {}

interface GridItemProps extends useRender.ComponentProps<'div'> {}

interface GridComponentStatics {
	Container: (props: GridContainerProps) => React.ReactElement
	Item: (props: GridItemProps) => React.ReactElement
}

type GridComponent = ((props: GridProviderProps) => React.ReactElement | null) &
	GridComponentStatics

export function useCreateGrid(
	factory: () => CreateGridProps,
	deps: React.DependencyList = [],
) {
	const config = React.useMemo(factory, deps)
	const breakpoints = config.breakpoints ?? DEFAULT_BREAKPOINTS
	const cols = config.cols ?? DEFAULT_COLS

	const gridHook = useGridLayout({
		initialLayouts: config.initialLayouts,
		initialBreakpoint: config.initialBreakpoint,
		initialEditing: config.initialEditing,
		cols,
	})

	const mergedGridConfig = React.useMemo(
		() =>
			createLazyProxy(DEFAULT_GRID_CONFIG, {
				cols: () => config.gridConfig?.cols ?? DEFAULT_GRID_CONFIG.cols,
				rowHeight: () =>
					config.gridConfig?.rowHeight ?? DEFAULT_GRID_CONFIG.rowHeight,
				margin: () => config.gridConfig?.margin ?? DEFAULT_GRID_CONFIG.margin,
				containerPadding: () =>
					config.gridConfig?.containerPadding ??
					DEFAULT_GRID_CONFIG.containerPadding,
			}),
		[config.gridConfig],
	)

	const dragConfig = React.useMemo<DragConfig>(
		() => ({ ...config.dragConfig }),
		[config.dragConfig],
	)

	const resizeConfig = React.useMemo<ResizeConfig>(
		() => ({ ...config.resizeConfig }),
		[config.resizeConfig],
	)

	const persistenceConfig = React.useMemo(
		() => resolvePersistenceConfig(config),
		[config],
	)
	const hasHydratedRef = React.useRef(false)
	const skipWriteRef = React.useRef(false)

	const gridHookRef = React.useRef(gridHook)
	const gridConfigRef = React.useRef(mergedGridConfig)
	const dragConfigRef = React.useRef(dragConfig)
	const resizeConfigRef = React.useRef(resizeConfig)
	const styleConfigRef = React.useRef(config.styleConfig)
	const breakpointsRef = React.useRef(breakpoints)
	const colsRef = React.useRef(cols)
	const callbacksRef = React.useRef({
		onLayoutChange: config.onLayoutChange,
		onBreakpointChange: config.onBreakpointChange,
	})

	gridHookRef.current = gridHook
	gridConfigRef.current = mergedGridConfig
	dragConfigRef.current = dragConfig
	resizeConfigRef.current = resizeConfig
	styleConfigRef.current = config.styleConfig
	breakpointsRef.current = breakpoints
	colsRef.current = cols
	callbacksRef.current = {
		onLayoutChange: config.onLayoutChange,
		onBreakpointChange: config.onBreakpointChange,
	}

	React.useEffect(() => {
		if (!persistenceConfig) return

		hasHydratedRef.current = false
		skipWriteRef.current = false

		const persisted = readPersistedState(persistenceConfig)
		if (persisted) {
			skipWriteRef.current = true
			gridHook.dispatch((prev: GridLayoutState) => ({
				layouts: { ...prev.layouts, ...persisted.layouts },
				breakpoint: persisted.breakpoint ?? prev.breakpoint,
			}))
		}

		hasHydratedRef.current = true
	}, [persistenceConfig, gridHook.dispatch])

	React.useEffect(() => {
		if (!persistenceConfig) return

		const handleWrite = () => {
			if (!hasHydratedRef.current) return
			if (skipWriteRef.current) {
				skipWriteRef.current = false
				return
			}
			const nextState = gridHook.store.getState()
			writePersistedState(persistenceConfig, {
				layouts: nextState.layouts,
				breakpoint: nextState.breakpoint,
			})
		}

		const unsubscribe = gridHook.store.subscribe(handleWrite)
		return unsubscribe
	}, [persistenceConfig, gridHook.store])

	const GridComponentImpl = React.useMemo(() => {
		const Component: GridComponent = ({
			render,
			children,
			className,
			...props
		}) => {
			const { containerRef, width, mounted } = useContainerWidth({
				measureBeforeMount: true,
			})

			const currentGridHook = gridHookRef.current
			const currentGridConfig = gridConfigRef.current
			const currentDragConfig = dragConfigRef.current
			const currentResizeConfig = resizeConfigRef.current
			const currentStyleConfig = styleConfigRef.current
			const currentBreakpoints = breakpointsRef.current
			const currentCols = colsRef.current
			const gridStore = currentGridHook.store
			const layouts = useGridLayoutStore(gridStore, (state) => state.layouts)
			const isEditing = useGridLayoutStore(
				gridStore,
				(state) => state.isEditing,
			)
			const { isDraggable, draggableHandle } = resolveDragProps(
				currentDragConfig,
				isEditing,
			)
			const { isResizable, resizeHandles } = resolveResizeProps(
				currentResizeConfig,
				isEditing,
			)

			const handleLayoutChange = React.useCallback(
				(layout: Layout, allLayouts: ResponsiveLayouts) => {
					gridHookRef.current.dispatch((prev: GridLayoutState) => {
						const nextLayouts = { ...prev.layouts }
						for (const [bp, layoutItems] of Object.entries(allLayouts)) {
							if (!layoutItems) continue
							nextLayouts[bp as GridBreakpoint] = [
								...(layoutItems as LayoutItem[]),
							]
						}
						return { layouts: nextLayouts }
					})
					callbacksRef.current.onLayoutChange?.(layout, allLayouts)
				},
				[],
			)

			const handleBreakpointChange = React.useCallback(
				(bp: string, currentColsValue: number) => {
					gridHookRef.current.setBreakpoint(bp as GridBreakpoint)
					callbacksRef.current.onBreakpointChange?.(bp, currentColsValue)
				},
				[],
			)

			const contextValue: GridLayoutContextValue = {
				state: { ...currentGridHook.state, layouts },
				dispatch: currentGridHook.dispatch,
				gridConfig: currentGridConfig,
				dragConfig: currentDragConfig,
				resizeConfig: currentResizeConfig,
				setLayout: currentGridHook.setLayout,
				setBreakpoint: currentGridHook.setBreakpoint,
				setEditing: currentGridHook.setEditing,
				updateItem: currentGridHook.updateItem,
				addItem: currentGridHook.addItem,
				removeItem: currentGridHook.removeItem,
			}

			const gridContent =
				mounted && width > 0 ? (
					<RGLResponsiveGridLayout
						className='react-grid-layout'
						width={width}
						layouts={layouts as unknown as ResponsiveLayouts}
						breakpoints={currentBreakpoints}
						cols={currentCols}
						rowHeight={currentGridConfig.rowHeight}
						margin={currentGridConfig.margin}
						containerPadding={currentGridConfig.containerPadding}
						isDraggable={isDraggable}
						draggableHandle={draggableHandle}
						isResizable={isResizable}
						resizeHandles={resizeHandles}
						onLayoutChange={handleLayoutChange}
						onBreakpointChange={handleBreakpointChange}
					>
						{children}
					</RGLResponsiveGridLayout>
				) : null

			const rendered = useRender({
				defaultTagName: 'div',
				render,
				ref: containerRef,
				props: mergeProps<'div'>(
					{
						className: cn('w-full', className),
						style: buildGridStyle(currentStyleConfig),
						children: gridContent,
					},
					props,
				),
			})

			return (
				<GridLayoutContext.Provider value={contextValue}>
					{rendered}
				</GridLayoutContext.Provider>
			)
		}

		Component.Container = GridContainer
		Component.Item = GridItem

		return Component
	}, [])

	return [GridComponentImpl, gridHook] as const
}

// ============================================================================
// Sub-components using useRender
// ============================================================================

function GridContainer({
	render,
	children,
	className,
	...props
}: GridContainerProps) {
	return useRender({
		defaultTagName: 'div',
		render,
		props: mergeProps<'div'>(
			{
				className: cn('react-grid-layout', className),
			},
			props,
		),
	})
}

function GridItem({ render, className, ...props }: GridItemProps) {
	useGridLayoutContext()

	return useRender({
		defaultTagName: 'div',
		render,
		props: mergeProps<'div'>(
			{
				className: cn('h-full w-full', className),
			},
			props,
		),
	})
}

// ============================================================================
// Raw Components (for direct usage without factory)
// ============================================================================

export interface GridLayoutProps {
	layout: GridLayoutItem[]
	width: number
	gridConfig?: Partial<GridConfig>
	dragConfig?: DragConfig
	resizeConfig?: ResizeConfig
	styleConfig?: GridStyleConfig
	onLayoutChange?: (layout: Layout) => void
	onDragStop?: (layout: Layout) => void
	onResizeStop?: (layout: Layout) => void
	className?: string
	children?: React.ReactNode
}

export function GridLayout({
	layout,
	width,
	gridConfig = {},
	dragConfig = {},
	resizeConfig = {},
	styleConfig,
	onLayoutChange,
	onDragStop,
	onResizeStop,
	className,
	children,
}: GridLayoutProps) {
	const config = { ...DEFAULT_GRID_CONFIG, ...gridConfig }
	const { isDraggable, draggableHandle } = resolveDragProps(dragConfig)
	const { isResizable, resizeHandles } = resolveResizeProps(resizeConfig)
	const gridStyle = buildGridStyle(styleConfig)

	return (
		<RGLGridLayout
			className={cn('react-grid-layout', className)}
			style={gridStyle}
			layout={layout}
			width={width}
			cols={config.cols}
			rowHeight={config.rowHeight}
			margin={config.margin}
			containerPadding={config.containerPadding}
			isDraggable={isDraggable}
			draggableHandle={draggableHandle}
			isResizable={isResizable}
			resizeHandles={resizeHandles}
			onLayoutChange={onLayoutChange}
			onDragStop={onDragStop}
			onResizeStop={onResizeStop}
		>
			{children}
		</RGLGridLayout>
	)
}

export interface ResponsiveGridLayoutProps {
	layouts: Record<GridBreakpoint, GridLayoutItem[]>
	width: number
	breakpoints?: Record<GridBreakpoint, number>
	cols?: Record<GridBreakpoint, number>
	rowHeight?: number
	margin?: readonly [number, number]
	containerPadding?: readonly [number, number] | null
	dragConfig?: DragConfig
	resizeConfig?: ResizeConfig
	styleConfig?: GridStyleConfig
	onLayoutChange?: (layout: Layout, allLayouts: ResponsiveLayouts) => void
	onBreakpointChange?: (breakpoint: string, cols: number) => void
	onDragStop?: (layout: Layout) => void
	onResizeStop?: (layout: Layout) => void
	className?: string
	children?: React.ReactNode
}

export function ResponsiveGridLayout({
	layouts,
	width,
	breakpoints = DEFAULT_BREAKPOINTS,
	cols = DEFAULT_COLS,
	rowHeight = 150,
	margin = [16, 16],
	containerPadding = [0, 0],
	dragConfig = {},
	resizeConfig = {},
	styleConfig,
	onLayoutChange,
	onBreakpointChange,
	onDragStop,
	onResizeStop,
	className,
	children,
}: ResponsiveGridLayoutProps) {
	const { isDraggable, draggableHandle } = resolveDragProps(dragConfig)
	const { isResizable, resizeHandles } = resolveResizeProps(resizeConfig)
	const gridStyle = buildGridStyle(styleConfig)

	return (
		<RGLResponsiveGridLayout
			className={cn('react-grid-layout', className)}
			style={gridStyle}
			layouts={layouts as unknown as ResponsiveLayouts}
			width={width}
			breakpoints={breakpoints}
			cols={cols}
			rowHeight={rowHeight}
			margin={margin}
			containerPadding={containerPadding}
			isDraggable={isDraggable}
			draggableHandle={draggableHandle}
			isResizable={isResizable}
			resizeHandles={resizeHandles}
			onLayoutChange={onLayoutChange}
			onBreakpointChange={onBreakpointChange}
			onDragStop={onDragStop}
			onResizeStop={onResizeStop}
		>
			{children}
		</RGLResponsiveGridLayout>
	)
}

// ============================================================================
// Exports
// ============================================================================

export type { Layout, LayoutItem, ResponsiveLayouts }
export { useContainerWidth }

export interface LazyProxyOptions {
	/** If true, invalidates cache when target properties change */
	trackDependencies?: boolean
}

export function createLazyProxy<T extends object>(
	target: T,
	computedGetters: Partial<Record<keyof T, () => unknown>>,
	options: LazyProxyOptions = {},
): T & { invalidateCache: (key?: keyof T) => void } {
	const cache = new Map<keyof T, unknown>()
	const { trackDependencies = false } = options

	let targetVersion = 0
	let lastSeenVersion = -1

	const invalidateCache = (key?: keyof T) => {
		if (key !== undefined) {
			cache.delete(key)
		} else {
			cache.clear()
		}
	}

	const bumpVersion = () => {
		targetVersion++
	}

	const invalidateIfStale = () => {
		if (targetVersion !== lastSeenVersion) {
			cache.clear()
			lastSeenVersion = targetVersion
		}
	}

	const proxy = new Proxy(target, {
		get(obj, prop) {
			if (prop === 'invalidateCache') return invalidateCache
			if (prop === '_bumpVersion') return bumpVersion
			if (typeof prop === 'symbol') return Reflect.get(obj, prop)

			const key = prop as keyof T
			if (key in computedGetters) {
				if (trackDependencies) {
					invalidateIfStale()
				}
				if (!cache.has(key)) {
					cache.set(key, computedGetters[key]?.())
				}
				return cache.get(key)
			}
			return Reflect.get(obj, prop)
		},
		set(obj, prop, value) {
			const result = Reflect.set(obj, prop, value)
			if (trackDependencies && result) {
				targetVersion++
			}
			return result
		},
		has(obj, prop) {
			if (prop === 'invalidateCache') return true
			return Reflect.has(obj, prop)
		},
		ownKeys(obj) {
			return Reflect.ownKeys(obj)
		},
		getOwnPropertyDescriptor(obj, prop) {
			return Reflect.getOwnPropertyDescriptor(obj, prop)
		},
	})

	return proxy as T & { invalidateCache: (key?: keyof T) => void }
}

export function createObservableData<T extends object>(
	data: T,
	onMutate: (prop: keyof T, newValue: T[keyof T], oldValue: T[keyof T]) => void,
): T {
	const clone = { ...data }

	return new Proxy(clone, {
		set(target, prop, value) {
			if (typeof prop === 'symbol') return false
			const key = prop as keyof T
			const oldValue = target[key]
			if (oldValue !== value) {
				target[key] = value
				onMutate(key, value, oldValue)
			}
			return true
		},
		get(target, prop) {
			return Reflect.get(target, prop)
		},
		has(target, prop) {
			return Reflect.has(target, prop)
		},
		ownKeys(target) {
			return Reflect.ownKeys(target)
		},
		getOwnPropertyDescriptor(target, prop) {
			return Reflect.getOwnPropertyDescriptor(target, prop)
		},
	})
}
