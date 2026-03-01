import type { ReportDataSet, ReportLayout } from './contracts'
import type { ReportDefinition } from './designer-contracts'
import { buildReportFilename } from './filename'
import { renderDocumentStream } from './render-document'

function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
	return new Promise((resolve, reject) => {
		const chunks: Buffer[] = []
		stream.on('data', (chunk: Buffer) => chunks.push(chunk))
		stream.on('end', () => resolve(Buffer.concat(chunks)))
		stream.on('error', reject)
	})
}

export async function renderReportFile(params: {
	layout: ReportLayout | ReportDefinition
	dataSet: ReportDataSet
	filenameSuffix?: string
}): Promise<File> {
	const { layout, dataSet, filenameSuffix } = params
	const doc = renderDocumentStream(layout, dataSet)
	const buffer = await streamToBuffer(doc)
	const filename = buildReportFilename({
		moduleId: dataSet.moduleId,
		entityId: dataSet.entityId,
		suffix: filenameSuffix,
		extension: 'pdf',
	})

	return new File([new Uint8Array(buffer)], filename, {
		type: 'application/pdf',
	})
}
