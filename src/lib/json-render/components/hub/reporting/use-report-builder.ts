import { $rpc, useMutation, useQuery, useQueryClient } from '@lib/rpc'
import type {
	BuiltInLayoutKey,
	DataSetDefinition,
	ReportBlock,
	ReportModuleId,
} from '@server/reporting/contracts'
import * as React from 'react'
import { toast } from 'sonner'
import { downloadBinaryPayload } from '@/lib/download-file'
import {
	ENTITY_OPTIONS,
	TABLE_RELATIONSHIPS,
	TABLE_TO_MODULE_ENTITY,
} from './constants'
import type { BlockWithId, FilterRow } from './types'

let blockIdCounter = 0
function nextBlockId(): string {
	blockIdCounter += 1
	return `block-${blockIdCounter}-${Date.now()}`
}

function blockToBlockWithId(block: ReportBlock): BlockWithId {
	return { ...block, _id: nextBlockId() }
}

function stripEphemeralIds(blocks: BlockWithId[]): ReportBlock[] {
	return blocks.map(({ _id, ...rest }) => rest as ReportBlock)
}

type LayoutItem = {
	id: string
	key: string | null
	name: string
	pageSize: 'A4' | 'LETTER' | 'THERMAL'
	orientation: 'portrait' | 'landscape'
	blockCount: number
	source: 'SYSTEM' | 'CUSTOM'
	moduleId?: string
	entityId?: string
	active?: boolean
	versionNo?: number
	isDefault?: boolean
}

export function useReportBuilder() {
	const queryClient = useQueryClient()

	const [moduleId, setModuleId] = React.useState<ReportModuleId>('pos')
	const [entityId, setEntityId] = React.useState('transactions')
	const [pageSize, setPageSize] = React.useState<'A4' | 'LETTER' | 'THERMAL'>(
		'A4',
	)
	const [orientation, setOrientation] = React.useState<
		'portrait' | 'landscape'
	>('portrait')
	const [layoutName, setLayoutName] = React.useState('pos-transactions-custom')
	const [rowLimit, setRowLimit] = React.useState(100)
	const [blocks, setBlocks] = React.useState<BlockWithId[]>([])
	const [filters, setFilters] = React.useState<FilterRow[]>([])
	const [selectedLayoutId, setSelectedLayoutId] = React.useState<string | null>(
		'A4_SUMMARY',
	)
	const [selectedLayoutSource, setSelectedLayoutSource] = React.useState<
		'SYSTEM' | 'CUSTOM' | null
	>(null)
	const [previewUrl, setPreviewUrl] = React.useState<string | null>(null)
	const [activeTab, setActiveTab] = React.useState('builder')
	const [dataSetDefinition, setDataSetDefinition] =
		React.useState<DataSetDefinition | null>(null)

	const availableTablesQuery = useQuery({
		...$rpc.hub.reporting.getAvailableTables.queryOptions({
			input: undefined,
		}),
		staleTime: 5 * 60 * 1000,
	})

	const availableTables = (availableTablesQuery.data ?? []) as Array<{
		table: string
		fields: string[]
	}>

	const layoutsQuery = useQuery({
		...$rpc.hub.reporting.listLayouts.queryOptions({
			input: {
				moduleId,
				entityId,
				includeSystem: true,
				includeInactive: false,
			},
		}),
	})

	const layoutItems = (layoutsQuery.data ?? []) as LayoutItem[]

	const selectedLayoutLookup = React.useMemo(() => {
		if (!selectedLayoutId) return null
		const layout = layoutItems.find((l) => l.id === selectedLayoutId)
		if (!layout) return null
		if (layout.source === 'CUSTOM') return { layoutId: layout.id }
		return {
			builtInLayout: (layout.key ?? 'A4_SUMMARY') as BuiltInLayoutKey,
		}
	}, [selectedLayoutId, layoutItems])

	const selectedLayoutQuery = useQuery({
		...$rpc.hub.reporting.getLayout.queryOptions({
			input: selectedLayoutLookup ?? { builtInLayout: 'A4_SUMMARY' },
		}),
		enabled: Boolean(selectedLayoutLookup),
	})

	const previewMutation = useMutation(
		$rpc.hub.reporting.previewReport.mutationOptions(),
	)
	const generateMutation = useMutation(
		$rpc.hub.reporting.generateReport.mutationOptions(),
	)
	const createLayoutMutation = useMutation(
		$rpc.hub.reporting.createLayout.mutationOptions(),
	)
	const saveLayoutVersionMutation = useMutation(
		$rpc.hub.reporting.saveLayoutVersion.mutationOptions(),
	)
	const setDefaultLayoutMutation = useMutation(
		$rpc.hub.reporting.setDefaultLayout.mutationOptions(),
	)

	const selectedLayout = React.useMemo(
		() => layoutItems.find((l) => l.id === selectedLayoutId) ?? null,
		[layoutItems, selectedLayoutId],
	)

	// Infer moduleId/entityId from dataset's primaryTable
	React.useEffect(() => {
		if (!dataSetDefinition?.primaryTable) return
		const mapping = TABLE_TO_MODULE_ENTITY[dataSetDefinition.primaryTable]
		if (mapping) {
			setModuleId(mapping.moduleId)
			setEntityId(mapping.entityId)
		}
	}, [dataSetDefinition?.primaryTable])

	React.useEffect(() => {
		const entities = ENTITY_OPTIONS[moduleId] ?? []
		if (!entities.includes(entityId)) {
			setEntityId(entities[0] ?? 'transactions')
		}
	}, [moduleId, entityId])

	React.useEffect(() => {
		setLayoutName(`${moduleId}-${entityId}-custom`)
	}, [moduleId, entityId])

	React.useEffect(() => {
		if (layoutItems.length === 0) return
		if (layoutItems.some((l) => l.id === selectedLayoutId)) return
		const defaultLayout =
			layoutItems.find((l) => l.isDefault) ??
			layoutItems.find((l) => l.key === 'A4_SUMMARY') ??
			layoutItems[0]
		if (defaultLayout) {
			setSelectedLayoutId(defaultLayout.id)
		}
	}, [layoutItems, selectedLayoutId])

	React.useEffect(() => {
		return () => {
			if (previewUrl) URL.revokeObjectURL(previewUrl)
		}
	}, [previewUrl])

	const entityKey = `${moduleId}.${entityId}`

	function datasetDirectFields() {
		return (
			dataSetDefinition?.fields.filter(
				(f): f is import('@server/reporting/contracts').DirectField =>
					!('type' in f),
			) ?? []
		)
	}

	function datasetAllColumns(): Array<{ key: string; label: string }> {
		if (!dataSetDefinition) return []
		const cols: Array<{ key: string; label: string }> = []
		for (const f of dataSetDefinition.fields) {
			if ('type' in f && f.type === 'related') {
				for (const sub of f.fields) {
					if (!('type' in sub)) {
						cols.push({
							key: `${f.name}.${sub.name}`,
							label: `${f.name}.${sub.name}`,
						})
					}
				}
			} else {
				cols.push({ key: f.name, label: f.label })
			}
		}
		return cols
	}

	function datasetHasManyColumns(): Array<{ key: string; label: string }> {
		if (!dataSetDefinition) return []
		const hasManyTables = (
			TABLE_RELATIONSHIPS[dataSetDefinition.primaryTable] ?? []
		)
			.filter((r) => r.relationType === 'has-many')
			.map((r) => r.relatedTable)
		const cols: Array<{ key: string; label: string }> = []
		for (const f of dataSetDefinition.fields) {
			if (
				'type' in f &&
				f.type === 'related' &&
				hasManyTables.includes(f.relatedModel)
			) {
				for (const sub of f.fields) {
					if (!('type' in sub)) {
						cols.push({
							key: `${f.name}.${sub.name}`,
							label: `${f.name}.${sub.name}`,
						})
					}
				}
			}
		}
		return cols
	}

	function addBlock(kind: ReportBlock['kind']) {
		let block: ReportBlock
		switch (kind) {
			case 'heading':
				block = { kind: 'heading', text: 'Report Title', level: 1 }
				break
			case 'keyValue': {
				const first = datasetDirectFields()[0]
				if (first) {
					block = {
						kind: 'keyValue',
						key: first.label,
						valuePath: `summary.${first.name}`,
					}
				} else {
					block = { kind: 'keyValue', key: '', valuePath: '' }
				}
				break
			}
			case 'table': {
				const hasManyDefault =
					dataSetDefinition?.type === 'single' ? datasetHasManyColumns() : []
				const cols =
					hasManyDefault.length > 0 ? hasManyDefault : datasetAllColumns()
				block = {
					kind: 'table',
					columns: cols.length > 0 ? cols.slice(0, 4) : [],
				}
				break
			}
			case 'spacer':
				block = { kind: 'spacer', size: 'md' }
				break
			case 'paragraph':
				block = { kind: 'paragraph', text: '' }
				break
			case 'row':
				block = {
					kind: 'row',
					columns: [
						{ width: 50, blocks: [] },
						{ width: 50, blocks: [] },
					],
				}
				break
			case 'sectionHeader':
				block = { kind: 'sectionHeader', text: 'Section', color: '#2c5282' }
				break
			case 'keyValueGroup':
				block = {
					kind: 'keyValueGroup',
					pairs: [{ key: '', valuePath: '' }],
					align: 'left',
				}
				break
			case 'divider':
				block = { kind: 'divider' }
				break
		}

		setBlocks((prev) => [...prev, blockToBlockWithId(block)])
	}

	function removeBlock(id: string) {
		setBlocks((prev) => prev.filter((b) => b._id !== id))
	}

	function moveBlock(fromIndex: number, toIndex: number) {
		setBlocks((prev) => {
			const next = [...prev]
			const [moved] = next.splice(fromIndex, 1)
			if (moved) next.splice(toIndex, 0, moved)
			return next
		})
	}

	function updateBlock(id: string, patch: Partial<ReportBlock>) {
		setBlocks((prev) =>
			prev.map((b) => (b._id === id ? ({ ...b, ...patch } as BlockWithId) : b)),
		)
	}

	function reorderBlocks(newBlocks: BlockWithId[]) {
		setBlocks(newBlocks)
	}

	function addFilter() {
		setFilters((prev) => [...prev, { id: nextBlockId(), field: '', value: '' }])
	}

	function removeFilter(id: string) {
		setFilters((prev) => prev.filter((f) => f.id !== id))
	}

	function updateFilter(id: string, patch: Partial<FilterRow>) {
		setFilters((prev) =>
			prev.map((f) => (f.id === id ? { ...f, ...patch } : f)),
		)
	}

	function loadTemplate(layout: {
		blocks: ReportBlock[]
		pageSize: 'A4' | 'LETTER' | 'THERMAL'
		orientation: 'portrait' | 'landscape'
		name: string
		key?: string
	}) {
		setBlocks(layout.blocks.map(blockToBlockWithId))
		setPageSize(layout.pageSize)
		setOrientation(layout.orientation)
		setActiveTab('builder')
	}

	function toDataSetPayload(): DataSetDefinition | undefined {
		if (!dataSetDefinition || !dataSetDefinition.primaryTable) return undefined
		return dataSetDefinition
	}

	function toLayoutPayload(): string {
		return JSON.stringify({
			key: 'A4_SUMMARY',
			name: layoutName || 'Custom Layout',
			pageSize,
			orientation,
			blocks: stripEphemeralIds(blocks),
		})
	}

	function toFilterPayload(): Record<string, string | number | boolean | null> {
		const out: Record<string, string | number | boolean | null> = {}
		for (const f of filters) {
			if (f.field) out[f.field] = f.value
		}
		return out
	}

	function selectedLayoutPayload() {
		if (!selectedLayout) return {}
		if (selectedLayout.source === 'CUSTOM')
			return { layoutId: selectedLayout.id }
		if (selectedLayout.key)
			return {
				builtInLayout: selectedLayout.key as BuiltInLayoutKey,
			}
		return {}
	}

	const invalidateReportingQueries = React.useCallback(async () => {
		await queryClient.invalidateQueries({
			queryKey: $rpc.hub.reporting.key(),
		})
	}, [queryClient])

	async function handlePreview() {
		try {
			const filterValues = toFilterPayload()
			const layoutDraft = blocks.length > 0 ? toLayoutPayload() : undefined
			const file = await previewMutation.mutateAsync({
				moduleId,
				entityId,
				...selectedLayoutPayload(),
				filters: filterValues,
				limit: rowLimit || undefined,
				layoutDraft,
				datasetDraft: toDataSetPayload(),
				previewOptions: {
					sampleMode: 'HEAD',
					page: 1,
				},
			})
			if (!(file instanceof Blob)) {
				throw new Error('Preview endpoint did not return a file payload')
			}
			const nextUrl = URL.createObjectURL(file)
			setPreviewUrl((previous) => {
				if (previous) URL.revokeObjectURL(previous)
				return nextUrl
			})
		} catch (error) {
			toast.error('Unable to render preview', {
				description:
					error instanceof Error
						? error.message
						: 'Please check inputs and try again',
			})
		}
	}

	async function handleDownload() {
		try {
			const filterValues = toFilterPayload()
			const file = await generateMutation.mutateAsync({
				moduleId,
				entityId,
				...selectedLayoutPayload(),
				filters: filterValues,
				limit: rowLimit || undefined,
			})
			await downloadBinaryPayload(file, `${moduleId}-${entityId}.pdf`)
			toast.success('Report downloaded')
		} catch (error) {
			toast.error('Unable to download report', {
				description:
					error instanceof Error
						? error.message
						: 'Please check inputs and try again',
			})
		}
	}

	async function handleCreate() {
		const name = layoutName.trim()
		if (!name) {
			toast.error('Layout name is required')
			return
		}
		try {
			const layoutDraft = blocks.length > 0 ? toLayoutPayload() : undefined
			const baseTemplate = (selectedLayoutQuery.data?.layout.key ??
				selectedLayout?.key ??
				'A4_SUMMARY') as BuiltInLayoutKey
			const created = await createLayoutMutation.mutateAsync({
				moduleId,
				entityId,
				name,
				baseTemplate,
				layoutDraft,
				dataSetDraft: toDataSetPayload(),
			})
			await invalidateReportingQueries()
			setSelectedLayoutId(created.layoutId)
			setSelectedLayoutSource('CUSTOM')
			toast.success('Custom layout created')
		} catch (error) {
			toast.error('Unable to create layout', {
				description:
					error instanceof Error
						? error.message
						: 'Please check your inputs and try again',
			})
		}
	}

	async function handleSave() {
		if (!selectedLayout || selectedLayout.source !== 'CUSTOM') {
			toast.error('Select a custom layout to save a new version')
			return
		}
		const layoutDraft = toLayoutPayload()
		if (!layoutDraft) {
			toast.error('Layout draft is required')
			return
		}
		try {
			const saved = await saveLayoutVersionMutation.mutateAsync({
				layoutId: selectedLayout.id,
				layoutDraft,
				dataSetDraft: toDataSetPayload(),
			})
			await invalidateReportingQueries()
			toast.success(`Layout version ${saved.versionNo} saved`)
		} catch (error) {
			toast.error('Unable to save layout version', {
				description:
					error instanceof Error
						? error.message
						: 'Please check your draft and try again',
			})
		}
	}

	async function handleSetDefault() {
		if (!selectedLayout) {
			toast.error('Select a layout first')
			return
		}
		try {
			if (selectedLayout.source === 'CUSTOM') {
				await setDefaultLayoutMutation.mutateAsync({
					moduleId,
					entityId,
					layoutId: selectedLayout.id,
				})
			} else if (selectedLayout.key) {
				await setDefaultLayoutMutation.mutateAsync({
					moduleId,
					entityId,
					builtInLayout: selectedLayout.key as BuiltInLayoutKey,
				})
			}
			await invalidateReportingQueries()
			toast.success('Default layout updated')
		} catch (error) {
			toast.error('Unable to set default layout', {
				description:
					error instanceof Error ? error.message : 'Please try again',
			})
		}
	}

	const loading = previewMutation.isPending || generateMutation.isPending
	const layoutMutationLoading =
		createLayoutMutation.isPending ||
		saveLayoutVersionMutation.isPending ||
		setDefaultLayoutMutation.isPending

	function clearDataSet() {
		setDataSetDefinition(null)
	}

	// When a saved layout is loaded that has a dataset, restore it
	React.useEffect(() => {
		const data = selectedLayoutQuery.data as
			| { datasetDefinition?: DataSetDefinition }
			| undefined
		if (!data) return
		if (data.datasetDefinition) {
			setDataSetDefinition(data.datasetDefinition)
		} else {
			setDataSetDefinition(null)
		}
	}, [selectedLayoutQuery.data])

	return {
		moduleId,
		setModuleId,
		entityId,
		setEntityId,
		pageSize,
		setPageSize,
		orientation,
		setOrientation,
		layoutName,
		setLayoutName,
		rowLimit,
		setRowLimit,
		blocks,
		filters,
		selectedLayoutId,
		setSelectedLayoutId,
		selectedLayoutSource,
		setSelectedLayoutSource,
		selectedLayout,
		previewUrl,
		activeTab,
		setActiveTab,
		entityKey,
		dataSetDefinition,
		setDataSetDefinition,
		clearDataSet,
		availableTables,

		layoutsQuery,
		layoutItems,
		selectedLayoutQuery,

		addBlock,
		removeBlock,
		moveBlock,
		updateBlock,
		reorderBlocks,
		addFilter,
		removeFilter,
		updateFilter,
		loadTemplate,

		handlePreview,
		handleDownload,
		handleCreate,
		handleSave,
		handleSetDefault,

		loading,
		layoutMutationLoading,
		previewMutation,
	}
}

export type ReportBuilderAPI = ReturnType<typeof useReportBuilder>
