'use client'

import { $rpc, useMutation, useQuery, useQueryClient } from '@lib/rpc'
import type { ReportDefinition } from '@server/reporting/designer-contracts'
import * as React from 'react'
import { toast } from 'sonner'
import { ReportDesigner } from '@/components/report-designer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { ReportBuilderAPI } from './use-report-builder'

function readSelectedLayoutInfo(builder: ReportBuilderAPI): {
	layoutId?: string
	layoutName: string
	source: 'SYSTEM' | 'CUSTOM' | null
} {
	if (!builder.selectedLayout) {
		return {
			layoutName: builder.layoutName,
			source: null,
		}
	}
	if (builder.selectedLayout.source === 'CUSTOM') {
		return {
			layoutId: builder.selectedLayout.id,
			layoutName: builder.selectedLayout.name,
			source: 'CUSTOM',
		}
	}
	return {
		layoutName: builder.selectedLayout.name,
		source: 'SYSTEM',
	}
}

export function DesignerIntegration({
	builder,
}: {
	builder: ReportBuilderAPI
}) {
	const queryClient = useQueryClient()
	const selection = readSelectedLayoutInfo(builder)
	const datasetSchemaQuery = useQuery({
		...$rpc.hub.reporting.getDatasetSchema.queryOptions({
			input: {
				moduleId: builder.moduleId,
				entityId: builder.entityId,
				layoutId: selection.layoutId,
			},
		}),
	})
	const datasetSampleQuery = useQuery({
		...$rpc.hub.reporting.getDatasetSample.queryOptions({
			input: {
				moduleId: builder.moduleId,
				entityId: builder.entityId,
				layoutId: selection.layoutId,
				limit: 25,
			},
		}),
	})
	const loadReportQuery = useQuery({
		...$rpc.hub.reporting.loadReport.queryOptions({
			input: {
				layoutId: selection.layoutId ?? '',
			},
		}),
		enabled: Boolean(selection.layoutId),
	})
	const templatesQuery = useQuery({
		...$rpc.hub.reporting.listDesignerTemplates.queryOptions({
			input: undefined,
		}),
	})

	const saveMutation = useMutation(
		$rpc.hub.reporting.saveReport.mutationOptions(),
	)
	const previewMutation = useMutation(
		$rpc.hub.reporting.previewDesignerReport.mutationOptions(),
	)
	const exportMutation = useMutation(
		$rpc.hub.reporting.exportReport.mutationOptions(),
	)

	const [workingName, setWorkingName] = React.useState(builder.layoutName)

	React.useEffect(() => {
		setWorkingName(selection.layoutName || builder.layoutName)
	}, [builder.layoutName, selection.layoutName])

	const activeTemplate = React.useMemo(() => {
		if (loadReportQuery.data?.reportDefinition)
			return loadReportQuery.data.reportDefinition
		const templateAliasByLegacyLayout: Record<string, string> = {
			DOC_SALES_INVOICE: 'INVOICE',
			DOC_SALES_ORDER: 'PURCHASE_ORDER',
			THERMAL_RECEIPT: 'POS_RECEIPT_THERMAL',
			DOC_POS_RECEIPT: 'POS_RECEIPT_THERMAL',
			A4_SUMMARY: 'SALES_SUMMARY',
		}
		const mappedKey =
			templateAliasByLegacyLayout[builder.selectedLayout?.key ?? '']
		if (mappedKey) {
			const mapped = templatesQuery.data?.find(
				(template) => template.key === mappedKey,
			)
			if (mapped?.reportDefinition) {
				return mapped.reportDefinition as ReportDefinition
			}
		}
		return templatesQuery.data?.[0]?.reportDefinition as
			| ReportDefinition
			| undefined
	}, [
		builder.selectedLayout?.key,
		loadReportQuery.data?.reportDefinition,
		templatesQuery.data,
	])

	const datasetSchemaJson = (datasetSchemaQuery.data ?? {
		type: 'object',
		properties: {
			Fields: { type: 'object', properties: {} },
			Summary: { type: 'object', properties: {} },
		},
	}) as Record<string, unknown>

	return (
		<div className='flex h-full min-h-0 flex-col gap-2 p-2'>
			<div className='grid grid-cols-[1fr_auto_auto] items-end gap-2 rounded-md border border-slate-300/70 bg-white/70 p-2'>
				<div className='space-y-1'>
					<Label className='text-[11px] text-slate-600'>
						Designer Layout Name
					</Label>
					<Input
						value={workingName}
						onChange={(event) => {
							setWorkingName(event.target.value)
							builder.setLayoutName(event.target.value)
						}}
						placeholder='Visual report layout name'
						className='h-8 text-[12px]'
					/>
				</div>
				<Button
					type='button'
					variant='outline'
					onClick={() => {
						if (!activeTemplate) return
						void saveMutation
							.mutateAsync({
								moduleId: builder.moduleId,
								entityId: builder.entityId,
								name: workingName.trim() || 'Visual report',
								reportDefinition: activeTemplate,
								datasetSchemaJson,
								datasetSchemaVersion: builder.entityKey,
							})
							.then(async (result) => {
								builder.setSelectedLayoutId(result.layoutId)
								builder.setSelectedLayoutSource('CUSTOM')
								await queryClient.invalidateQueries({
									queryKey: $rpc.hub.reporting.key(),
								})
								toast.success('Designer layout created')
							})
							.catch((error: unknown) => {
								toast.error('Unable to create designer layout', {
									description:
										error instanceof Error ? error.message : 'Please try again',
								})
							})
					}}
					disabled={saveMutation.isPending || !activeTemplate}
				>
					Create Custom
				</Button>
				<Button
					type='button'
					variant='outline'
					onClick={() => {
						if (!selection.layoutId) return
						void exportMutation
							.mutateAsync({
								moduleId: builder.moduleId,
								entityId: builder.entityId,
								layoutId: selection.layoutId,
								limit: 200,
							})
							.then((file) => {
								if (!(file instanceof Blob)) return
								const url = URL.createObjectURL(file)
								window.open(url, '_blank', 'noopener,noreferrer')
								setTimeout(() => URL.revokeObjectURL(url), 20_000)
							})
							.catch((error: unknown) => {
								toast.error('Export failed', {
									description:
										error instanceof Error ? error.message : 'Please try again',
								})
							})
					}}
					disabled={exportMutation.isPending || !selection.layoutId}
				>
					Export PDF
				</Button>
			</div>
			{activeTemplate ? (
				<ReportDesigner
					datasetSchemaJson={datasetSchemaJson}
					datasetSchemaVersion={builder.entityKey}
					sampleData={datasetSampleQuery.data?.rows ?? []}
					initialReport={activeTemplate}
					onSave={async (report) => {
						const payload = {
							layoutId: selection.layoutId,
							moduleId: builder.moduleId,
							entityId: builder.entityId,
							name: workingName.trim() || report.name,
							reportDefinitionDraft: JSON.stringify(report),
							datasetSchemaJson,
							datasetSchemaVersion: builder.entityKey,
						}
						const result = await saveMutation.mutateAsync(payload)
						builder.setSelectedLayoutId(result.layoutId)
						builder.setSelectedLayoutSource('CUSTOM')
						await queryClient.invalidateQueries({
							queryKey: $rpc.hub.reporting.key(),
						})
						toast.success('Designer report saved')
					}}
					onPreview={async (report) => {
						const file = await previewMutation.mutateAsync({
							moduleId: builder.moduleId,
							entityId: builder.entityId,
							layoutId: selection.layoutId,
							reportDefinitionDraft: JSON.stringify(report),
							limit: 120,
						})
						if (!(file instanceof Blob)) {
							throw new Error('Preview endpoint did not return a PDF')
						}
						return URL.createObjectURL(file)
					}}
					onDirtyChange={(dirty) => {
						if (dirty) builder.setLayoutName(workingName)
					}}
				/>
			) : (
				<div className='flex h-full items-center justify-center rounded-md border border-slate-300 border-dashed bg-white/80'>
					<p className='text-slate-500 text-sm'>
						No designer template available.
					</p>
				</div>
			)}
		</div>
	)
}
