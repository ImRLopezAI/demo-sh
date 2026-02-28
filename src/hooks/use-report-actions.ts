'use client'

import { $rpc, useMutation } from '@lib/rpc'
import { downloadBinaryPayload } from '@/lib/download-file'
import { toast } from 'sonner'
import * as React from 'react'

export function useReportActions(moduleId: string, entityId: string) {
	const generateMutation = useMutation(
		$rpc.hub.reporting.generateReport.mutationOptions(),
	)
	const previewMutation = useMutation(
		$rpc.hub.reporting.previewReport.mutationOptions(),
	)

	const handleDownload = React.useCallback(
		async (ids?: string[]) => {
			try {
				const file = await generateMutation.mutateAsync({
					moduleId: moduleId as Parameters<typeof generateMutation.mutateAsync>[0]['moduleId'],
					entityId,
					ids: ids?.length ? ids : undefined,
				})
				await downloadBinaryPayload(file, `${moduleId}-${entityId}.pdf`)
				toast.success('Report downloaded')
			} catch (error) {
				toast.error('Unable to download report', {
					description:
						error instanceof Error
							? error.message
							: 'Report generation failed',
				})
			}
		},
		[entityId, generateMutation, moduleId],
	)

	const handlePreview = React.useCallback(
		async (ids?: string[]) => {
			try {
				const file = await previewMutation.mutateAsync({
					moduleId: moduleId as Parameters<typeof previewMutation.mutateAsync>[0]['moduleId'],
					entityId,
					ids: ids?.length ? ids : undefined,
					previewOptions: { rowLimit: 50, sampleMode: 'HEAD' },
				})

				const payload = file as unknown
				let blob: Blob
				if (payload instanceof Blob) {
					blob = payload
				} else if (
					typeof payload === 'object' &&
					payload !== null &&
					'arrayBuffer' in payload &&
					typeof (payload as { arrayBuffer: () => unknown }).arrayBuffer === 'function'
				) {
					const ab = await (payload as { arrayBuffer: () => Promise<ArrayBuffer> }).arrayBuffer()
					blob = new Blob([ab], { type: 'application/pdf' })
				} else {
					throw new Error('Unexpected response format')
				}

				const url = URL.createObjectURL(blob)
				window.open(url, '_blank')
				setTimeout(() => URL.revokeObjectURL(url), 60_000)
			} catch (error) {
				toast.error('Unable to preview report', {
					description:
						error instanceof Error
							? error.message
							: 'Report preview failed',
				})
			}
		},
		[entityId, moduleId, previewMutation],
	)

	return {
		handleDownload,
		handlePreview,
		isPending: generateMutation.isPending || previewMutation.isPending,
	}
}
