import { renderToBuffer } from '@react-pdf/renderer'
import type { ReportDataSet, ReportLayout } from './contracts'
import { buildReportFilename } from './filename'
import { ReportDocument } from './render-document'

export async function renderReportFile(params: {
	layout: ReportLayout
	dataSet: ReportDataSet
	filenameSuffix?: string
}): Promise<File> {
	const { layout, dataSet, filenameSuffix } = params
	const document = <ReportDocument layout={layout} dataSet={dataSet} />
	const buffer = await renderToBuffer(document)
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
