import type { ReportModuleId } from './contracts'

const SAFE_CHAR_PATTERN = /[^a-zA-Z0-9._-]/g

function sanitizeSegment(value: string): string {
	const normalized = value.trim().replace(/\s+/g, '-')
	const stripped = normalized.replace(SAFE_CHAR_PATTERN, '')
	return stripped.length > 0 ? stripped : 'report'
}

export function buildReportFilename(params: {
	moduleId: ReportModuleId
	entityId: string
	suffix?: string
	extension?: 'pdf'
}): string {
	const now = new Date().toISOString().replace(/[:]/g, '-')
	const moduleId = sanitizeSegment(params.moduleId)
	const entityId = sanitizeSegment(params.entityId)
	const suffix = params.suffix ? `-${sanitizeSegment(params.suffix)}` : ''
	const extension = params.extension ?? 'pdf'
	return `${moduleId}-${entityId}${suffix}-${now}.${extension}`
}
