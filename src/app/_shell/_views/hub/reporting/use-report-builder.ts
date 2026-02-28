import type {
	BuiltInLayoutKey,
	ReportBlock,
	ReportModuleId,
} from '@server/reporting/contracts'
import { $rpc, useMutation, useQuery, useQueryClient } from '@lib/rpc'
import * as React from 'react'
import { toast } from 'sonner'
import { downloadBinaryPayload } from '@/lib/download-file'
import { ENTITY_OPTIONS, ENTITY_SUGGESTED_COLUMNS } from './constants'
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

	function addBlock(kind: ReportBlock['kind']) {
		const suggestedColumns = ENTITY_SUGGESTED_COLUMNS[entityKey] ?? [
			{ key: '_id', label: 'ID' },
			{ key: 'status', label: 'Status' },
			{ key: '_updatedAt', label: 'Updated' },
		]

		let block: ReportBlock
		switch (kind) {
			case 'heading':
				block = { kind: 'heading', text: 'Report Title', level: 1 }
				break
			case 'keyValue':
				block = { kind: 'keyValue', key: 'Module', valuePath: 'moduleId' }
				break
			case 'table':
				block = {
					kind: 'table',
					columns: suggestedColumns.slice(0, 4),
					maxRows: 60,
				}
				break
			case 'spacer':
				block = { kind: 'spacer', size: 'md' }
				break
			case 'paragraph':
				block = { kind: 'paragraph', text: '' }
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
			prev.map((b) =>
				b._id === id ? ({ ...b, ...patch } as BlockWithId) : b,
			),
		)
	}

	function reorderBlocks(newBlocks: BlockWithId[]) {
		setBlocks(newBlocks)
	}

	function addFilter() {
		setFilters((prev) => [
			...prev,
			{ id: nextBlockId(), field: '', value: '' },
		])
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
			const limit = Math.max(1, Math.min(rowLimit || 100, 1000))
			const layoutDraft = blocks.length > 0 ? toLayoutPayload() : undefined
			const file = await previewMutation.mutateAsync({
				moduleId,
				entityId,
				...selectedLayoutPayload(),
				filters: filterValues,
				limit,
				layoutDraft,
				previewOptions: {
					rowLimit: Math.min(limit, 100),
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
			const limit = Math.max(1, Math.min(rowLimit || 100, 2000))
			const file = await generateMutation.mutateAsync({
				moduleId,
				entityId,
				...selectedLayoutPayload(),
				filters: filterValues,
				limit,
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
