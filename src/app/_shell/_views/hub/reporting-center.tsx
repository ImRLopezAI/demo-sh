import { $rpc, useMutation, useQuery, useQueryClient } from '@lib/rpc'
import { Download, Eye, Plus, RefreshCcw, Save, Star } from 'lucide-react'
import * as React from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { downloadBinaryPayload } from '@/lib/download-file'
import { PageHeader } from '../_shared/page-header'

const ENTITY_OPTIONS: Record<string, string[]> = {
	hub: ['operationTasks', 'notifications'],
	market: ['salesOrders', 'items', 'customers', 'carts'],
	insight: ['itemLedger', 'locations', 'valueEntries'],
	replenishment: ['purchaseOrders', 'vendors', 'transfers'],
	ledger: ['invoices', 'customerLedger', 'glEntries'],
	flow: ['bankAccounts', 'bankLedger', 'paymentJournal', 'glEntries'],
	payroll: ['payrollRuns', 'employees', 'employeeLedger'],
	pos: ['transactions', 'transactionLines', 'sessions', 'terminals'],
	trace: ['shipments', 'shipmentMethods'],
}

const MODULE_IDS = [
	'hub',
	'market',
	'insight',
	'replenishment',
	'ledger',
	'flow',
	'payroll',
	'pos',
	'trace',
] as const
type ModuleId = (typeof MODULE_IDS)[number]

type LayoutKey = 'BLANK_EMPTY' | 'A4_SUMMARY' | 'THERMAL_RECEIPT'

type LayoutItem = {
	id: string
	key: LayoutKey | null
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

function parseFilters(
	raw: string,
): Record<string, string | number | boolean | null> {
	const trimmed = raw.trim()
	if (!trimmed) return {}
	const parsed = JSON.parse(trimmed) as unknown
	if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
		throw new Error('Filters must be a JSON object')
	}
	const out: Record<string, string | number | boolean | null> = {}
	for (const [key, value] of Object.entries(parsed)) {
		if (
			typeof value === 'string' ||
			typeof value === 'number' ||
			typeof value === 'boolean' ||
			value === null
		) {
			out[key] = value
		}
	}
	return out
}

function normalizeJsonDraft(raw: string): string | undefined {
	const trimmed = raw.trim()
	if (!trimmed) return undefined
	const parsed = JSON.parse(trimmed) as unknown
	return JSON.stringify(parsed)
}

export default function ReportingCenter() {
	const queryClient = useQueryClient()
	const [moduleId, setModuleId] = React.useState<ModuleId>('pos')
	const [entityId, setEntityId] = React.useState('transactions')
	const [selectedLayoutId, setSelectedLayoutId] =
		React.useState<string>('A4_SUMMARY')
	const [rowLimit, setRowLimit] = React.useState('100')
	const [filtersInput, setFiltersInput] = React.useState('')
	const [layoutDraftInput, setLayoutDraftInput] = React.useState('')
	const [createLayoutName, setCreateLayoutName] = React.useState(
		'pos-transactions-custom',
	)
	const [previewUrl, setPreviewUrl] = React.useState<string | null>(null)
	const [draftSourceRef, setDraftSourceRef] = React.useState<string | null>(
		null,
	)

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

	const layoutItems = (layoutsQuery.data ?? []) as LayoutItem[]
	const selectedLayout = React.useMemo(
		() => layoutItems.find((layout) => layout.id === selectedLayoutId) ?? null,
		[layoutItems, selectedLayoutId],
	)

	const selectedLayoutLookup = React.useMemo(() => {
		if (!selectedLayout) return null
		if (selectedLayout.source === 'CUSTOM') {
			return {
				layoutId: selectedLayout.id,
			}
		}
		return {
			builtInLayout: selectedLayout.key ?? 'A4_SUMMARY',
		}
	}, [selectedLayout])

	const selectedLayoutQuery = useQuery({
		...$rpc.hub.reporting.getLayout.queryOptions({
			input: selectedLayoutLookup ?? { builtInLayout: 'A4_SUMMARY' },
		}),
		enabled: Boolean(selectedLayoutLookup),
	})

	React.useEffect(() => {
		const entities = ENTITY_OPTIONS[moduleId] ?? []
		if (!entities.includes(entityId)) {
			setEntityId(entities[0] ?? 'transactions')
		}
	}, [moduleId, entityId])

	React.useEffect(() => {
		setCreateLayoutName(`${moduleId}-${entityId}-custom`)
	}, [entityId, moduleId])

	React.useEffect(() => {
		if (layoutItems.length === 0) return
		if (layoutItems.some((layout) => layout.id === selectedLayoutId)) return
		const defaultLayout =
			layoutItems.find((layout) => layout.isDefault) ??
			layoutItems.find((layout) => layout.key === 'A4_SUMMARY') ??
			layoutItems[0]
		if (defaultLayout) {
			setSelectedLayoutId(defaultLayout.id)
		}
	}, [layoutItems, selectedLayoutId])

	const currentLayoutRef = selectedLayout
		? `${selectedLayout.source}:${selectedLayout.id}`
		: null
	React.useEffect(() => {
		if (!currentLayoutRef) return
		if (!selectedLayoutQuery.data?.layout) return
		if (draftSourceRef === currentLayoutRef) return
		setLayoutDraftInput(
			JSON.stringify(selectedLayoutQuery.data.layout, null, 2),
		)
		setDraftSourceRef(currentLayoutRef)
	}, [currentLayoutRef, draftSourceRef, selectedLayoutQuery.data?.layout])

	React.useEffect(() => {
		return () => {
			if (previewUrl) {
				URL.revokeObjectURL(previewUrl)
			}
		}
	}, [previewUrl])

	const invalidateReportingQueries = React.useCallback(async () => {
		await queryClient.invalidateQueries({
			queryKey: $rpc.hub.reporting.key(),
		})
	}, [queryClient])

	const selectedLayoutPayload = React.useMemo(() => {
		if (!selectedLayout) return {}
		if (selectedLayout.source === 'CUSTOM') {
			return { layoutId: selectedLayout.id }
		}
		if (selectedLayout.key) {
			return { builtInLayout: selectedLayout.key }
		}
		return {}
	}, [selectedLayout])

	const parsedDraft = React.useMemo(() => {
		try {
			const normalized = normalizeJsonDraft(layoutDraftInput)
			return { normalized, valid: true }
		} catch (error) {
			return {
				normalized: undefined,
				valid: false,
				error:
					error instanceof Error
						? error.message
						: 'Layout JSON draft is invalid',
			}
		}
	}, [layoutDraftInput])

	const loadedDraftHash = React.useMemo(() => {
		if (!selectedLayoutQuery.data?.layout) return null
		return JSON.stringify(selectedLayoutQuery.data.layout)
	}, [selectedLayoutQuery.data?.layout])

	const draftHash = React.useMemo(() => {
		if (!parsedDraft.normalized) return null
		return parsedDraft.normalized
	}, [parsedDraft.normalized])

	const isDraftDirty = Boolean(
		loadedDraftHash && draftHash && loadedDraftHash !== draftHash,
	)

	const handlePreview = React.useCallback(async () => {
		try {
			const filters = parseFilters(filtersInput)
			const limit = Math.max(1, Math.min(Number(rowLimit) || 100, 1000))
			const layoutDraft = normalizeJsonDraft(layoutDraftInput)
			const file = await previewMutation.mutateAsync({
				moduleId,
				entityId,
				...selectedLayoutPayload,
				filters,
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
	}, [
		entityId,
		filtersInput,
		layoutDraftInput,
		moduleId,
		previewMutation,
		rowLimit,
		selectedLayoutPayload,
	])

	const handleDownload = React.useCallback(async () => {
		try {
			const filters = parseFilters(filtersInput)
			const limit = Math.max(1, Math.min(Number(rowLimit) || 100, 2000))
			const file = await generateMutation.mutateAsync({
				moduleId,
				entityId,
				...selectedLayoutPayload,
				filters,
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
	}, [
		entityId,
		filtersInput,
		generateMutation,
		moduleId,
		rowLimit,
		selectedLayoutPayload,
	])

	const handleCreateLayout = React.useCallback(async () => {
		const name = createLayoutName.trim()
		if (!name) {
			toast.error('Layout name is required')
			return
		}

		try {
			const baseTemplate =
				selectedLayoutQuery.data?.layout.key ??
				selectedLayout?.key ??
				'A4_SUMMARY'
			const created = await createLayoutMutation.mutateAsync({
				moduleId,
				entityId,
				name,
				baseTemplate,
				layoutDraft: parsedDraft.normalized,
			})
			await invalidateReportingQueries()
			setSelectedLayoutId(created.layoutId)
			setDraftSourceRef(null)
			toast.success('Custom layout created')
		} catch (error) {
			toast.error('Unable to create layout', {
				description:
					error instanceof Error
						? error.message
						: 'Please check your inputs and try again',
			})
		}
	}, [
		createLayoutMutation,
		createLayoutName,
		entityId,
		invalidateReportingQueries,
		moduleId,
		parsedDraft.normalized,
		selectedLayout?.key,
		selectedLayoutQuery.data?.layout.key,
	])

	const handleSaveLayoutVersion = React.useCallback(async () => {
		if (!selectedLayout || selectedLayout.source !== 'CUSTOM') {
			toast.error('Select a custom layout to save a new version')
			return
		}
		if (!parsedDraft.normalized) {
			toast.error('Layout draft JSON is required')
			return
		}
		try {
			const saved = await saveLayoutVersionMutation.mutateAsync({
				layoutId: selectedLayout.id,
				layoutDraft: parsedDraft.normalized,
			})
			await invalidateReportingQueries()
			setDraftSourceRef(null)
			toast.success(`Layout version ${saved.versionNo} saved`)
		} catch (error) {
			toast.error('Unable to save layout version', {
				description:
					error instanceof Error
						? error.message
						: 'Please check your draft and try again',
			})
		}
	}, [
		invalidateReportingQueries,
		parsedDraft.normalized,
		saveLayoutVersionMutation,
		selectedLayout,
	])

	const handleSetDefaultLayout = React.useCallback(async () => {
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
					builtInLayout: selectedLayout.key,
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
	}, [
		entityId,
		invalidateReportingQueries,
		moduleId,
		selectedLayout,
		setDefaultLayoutMutation,
	])

	const loading = previewMutation.isPending || generateMutation.isPending
	const layoutMutationLoading =
		createLayoutMutation.isPending ||
		saveLayoutVersionMutation.isPending ||
		setDefaultLayoutMutation.isPending
	const entityOptions = ENTITY_OPTIONS[moduleId] ?? []

	return (
		<div className='space-y-8 pb-8'>
			<PageHeader
				title='Reporting Center'
				description='Generate and preview module/entity PDF reports.'
			/>

			<div className='grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]'>
				<Card>
					<CardHeader>
						<CardTitle>Report Settings</CardTitle>
						<CardDescription>
							Choose dataset and layout, then preview or download.
						</CardDescription>
					</CardHeader>
					<CardContent className='space-y-4'>
						<div className='space-y-2'>
							<Label htmlFor='module'>Module</Label>
							<Select
								value={moduleId}
								onValueChange={(nextValue) => {
									if (!nextValue) return
									if (MODULE_IDS.includes(nextValue as ModuleId)) {
										setModuleId(nextValue as ModuleId)
									}
								}}
							>
								<SelectTrigger id='module'>
									<SelectValue placeholder='Select module' />
								</SelectTrigger>
								<SelectContent>
									{MODULE_IDS.map((value) => (
										<SelectItem key={value} value={value}>
											{value}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className='space-y-2'>
							<Label htmlFor='entity'>Entity</Label>
							<Select
								value={entityId}
								onValueChange={(nextValue) => {
									if (!nextValue) return
									setEntityId(nextValue)
								}}
							>
								<SelectTrigger id='entity'>
									<SelectValue placeholder='Select entity' />
								</SelectTrigger>
								<SelectContent>
									{entityOptions.map((value) => (
										<SelectItem key={value} value={value}>
											{value}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className='space-y-2'>
							<Label htmlFor='layout'>Layout</Label>
							<Select
								value={selectedLayoutId}
								onValueChange={(nextValue) => {
									if (!nextValue) return
									setSelectedLayoutId(nextValue)
									setDraftSourceRef(null)
								}}
							>
								<SelectTrigger id='layout'>
									<SelectValue placeholder='Select layout' />
								</SelectTrigger>
								<SelectContent>
									{layoutItems.map((layout) => (
										<SelectItem key={layout.id} value={layout.id}>
											{layout.source === 'CUSTOM' ? 'Custom' : 'System'} ·{' '}
											{layout.name}
											{layout.isDefault ? ' (Default)' : ''}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className='flex flex-wrap items-center gap-2'>
							{selectedLayout ? (
								<>
									<Badge variant='outline'>{selectedLayout.source}</Badge>
									<Badge variant='outline'>
										{selectedLayout.pageSize}/{selectedLayout.orientation}
									</Badge>
									{selectedLayout.versionNo ? (
										<Badge variant='outline'>v{selectedLayout.versionNo}</Badge>
									) : null}
									{selectedLayout.isDefault ? (
										<Badge variant='success'>Default</Badge>
									) : null}
									{isDraftDirty ? (
										<Badge variant='warning'>Unsaved draft</Badge>
									) : null}
								</>
							) : null}
							{!parsedDraft.valid ? (
								<Badge variant='error'>Invalid JSON</Badge>
							) : null}
						</div>

						<div className='space-y-2'>
							<Label htmlFor='limit'>Row limit</Label>
							<Input
								id='limit'
								type='number'
								value={rowLimit}
								onChange={(event) => setRowLimit(event.target.value)}
								min={1}
								max={2000}
							/>
						</div>

						<div className='space-y-2'>
							<Label htmlFor='filters'>Filters (JSON)</Label>
							<Input
								id='filters'
								placeholder='{"status":"COMPLETED"}'
								value={filtersInput}
								onChange={(event) => setFiltersInput(event.target.value)}
							/>
						</div>

						<div className='space-y-2'>
							<Label htmlFor='layout-draft'>Layout Draft (JSON)</Label>
							<Textarea
								id='layout-draft'
								rows={10}
								value={layoutDraftInput}
								onChange={(event) => setLayoutDraftInput(event.target.value)}
								placeholder='{"key":"A4_SUMMARY","name":"Custom Layout","pageSize":"A4","orientation":"portrait","blocks":[]}'
							/>
							{!parsedDraft.valid ? (
								<p className='text-destructive text-xs'>{parsedDraft.error}</p>
							) : null}
						</div>

						<div className='flex flex-wrap gap-2'>
							<Button
								type='button'
								variant='outline'
								onClick={() => {
									void handlePreview()
								}}
								disabled={loading}
							>
								<Eye className='mr-2 size-4' aria-hidden='true' />
								Preview
							</Button>
							<Button
								type='button'
								onClick={() => {
									void handleDownload()
								}}
								disabled={loading}
							>
								<Download className='mr-2 size-4' aria-hidden='true' />
								Download
							</Button>
							<Button
								type='button'
								variant='outline'
								onClick={() => {
									void handleSetDefaultLayout()
								}}
								disabled={layoutMutationLoading || selectedLayout?.isDefault}
							>
								<Star className='mr-2 size-4' aria-hidden='true' />
								Set Default
							</Button>
						</div>

						<div className='space-y-2 rounded-md border border-border/60 bg-muted/20 p-3'>
							<Label htmlFor='new-layout-name'>Custom Layout Name</Label>
							<Input
								id='new-layout-name'
								value={createLayoutName}
								onChange={(event) => setCreateLayoutName(event.target.value)}
								placeholder='pos-transactions-custom'
							/>
							<div className='flex flex-wrap gap-2'>
								<Button
									type='button'
									variant='outline'
									onClick={() => {
										void handleCreateLayout()
									}}
									disabled={layoutMutationLoading || !parsedDraft.valid}
								>
									<Plus className='mr-2 size-4' aria-hidden='true' />
									Create Custom
								</Button>
								<Button
									type='button'
									variant='outline'
									onClick={() => {
										void handleSaveLayoutVersion()
									}}
									disabled={
										layoutMutationLoading ||
										selectedLayout?.source !== 'CUSTOM' ||
										!parsedDraft.valid
									}
								>
									<Save className='mr-2 size-4' aria-hidden='true' />
									Save Version
								</Button>
							</div>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<div className='flex items-center justify-between gap-2'>
							<div>
								<CardTitle>Preview</CardTitle>
								<CardDescription>
									UI preview before final report download.
								</CardDescription>
							</div>
							<Button
								type='button'
								variant='ghost'
								size='sm'
								onClick={() => {
									void handlePreview()
								}}
								disabled={loading || layoutsQuery.isFetching}
							>
								<RefreshCcw className='mr-2 size-4' aria-hidden='true' />
								Refresh
							</Button>
						</div>
					</CardHeader>
					<CardContent>
						{previewUrl ? (
							<iframe
								title='Report preview'
								src={previewUrl}
								className='h-[72dvh] w-full rounded-md border border-border/60'
							/>
						) : (
							<div className='flex h-[72dvh] items-center justify-center rounded-md border border-border/60 border-dashed text-muted-foreground text-sm'>
								Run Preview to render PDF output.
							</div>
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	)
}
