import {
	Document,
	Page,
	type PageProps,
	StyleSheet,
	Text,
	View,
} from '@react-pdf/renderer'
import type { ReportDataSet, ReportLayout } from './contracts'

const styles = StyleSheet.create({
	page: {
		paddingTop: 24,
		paddingBottom: 24,
		paddingHorizontal: 24,
		fontSize: 10,
		fontFamily: 'Helvetica',
	},
	heading1: { fontSize: 18, fontWeight: 700, marginBottom: 8 },
	heading2: { fontSize: 14, fontWeight: 700, marginBottom: 6 },
	heading3: { fontSize: 12, fontWeight: 700, marginBottom: 4 },
	paragraph: { marginBottom: 6, lineHeight: 1.35 },
	keyValueRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginBottom: 4,
		gap: 8,
	},
	keyValueKey: { fontWeight: 700, flexGrow: 1 },
	keyValueValue: { textAlign: 'right', flexShrink: 1 },
	table: {
		borderWidth: 1,
		borderColor: '#d6d6d6',
		marginBottom: 8,
	},
	tableHeaderRow: {
		flexDirection: 'row',
		borderBottomWidth: 1,
		borderBottomColor: '#d6d6d6',
		backgroundColor: '#f8f8f8',
	},
	tableRow: {
		flexDirection: 'row',
		borderBottomWidth: 1,
		borderBottomColor: '#ededed',
	},
	tableCellHeader: {
		flex: 1,
		paddingHorizontal: 4,
		paddingVertical: 3,
		fontSize: 9,
		fontWeight: 700,
	},
	tableCell: {
		flex: 1,
		paddingHorizontal: 4,
		paddingVertical: 3,
		fontSize: 9,
	},
})

function resolvePath(root: Record<string, unknown>, path: string): unknown {
	const keys = path.split('.').filter(Boolean)
	let cursor: unknown = root
	for (const key of keys) {
		if (typeof cursor !== 'object' || cursor === null) return undefined
		cursor = (cursor as Record<string, unknown>)[key]
	}
	return cursor
}

function formatValue(value: unknown): string {
	if (value === null || value === undefined) return ''
	if (typeof value === 'number') return value.toFixed(2)
	if (value instanceof Date) return value.toISOString()
	return String(value)
}

function resolvePageSize(layout: ReportLayout): PageProps['size'] {
	if (layout.pageSize === 'THERMAL') {
		return { width: 226.77, height: 1200 }
	}
	if (layout.pageSize === 'LETTER') {
		return 'LETTER'
	}
	return 'A4'
}

export function ReportDocument({
	layout,
	dataSet,
}: {
	layout: ReportLayout
	dataSet: ReportDataSet
}) {
	const root: Record<string, unknown> = {
		moduleId: dataSet.moduleId,
		entityId: dataSet.entityId,
		title: dataSet.title,
		generatedAt: dataSet.generatedAt,
		summary: dataSet.summary ?? {},
	}

	return (
		<Document title={dataSet.title} author='Uplink'>
			<Page
				size={resolvePageSize(layout)}
				orientation={layout.orientation}
				style={styles.page}
			>
				{layout.blocks.map((block, index) => {
					if (block.kind === 'heading') {
						const headingStyle =
							block.level === 1
								? styles.heading1
								: block.level === 2
									? styles.heading2
									: styles.heading3
						return (
							<Text key={`block-${index}-${block.kind}`} style={headingStyle}>
								{block.text}
							</Text>
						)
					}

					if (block.kind === 'paragraph') {
						return (
							<Text
								key={`block-${index}-${block.kind}`}
								style={styles.paragraph}
							>
								{block.text}
							</Text>
						)
					}

					if (block.kind === 'spacer') {
						const height =
							block.size === 'sm' ? 6 : block.size === 'md' ? 12 : 18
						return (
							<View key={`block-${index}-${block.kind}`} style={{ height }} />
						)
					}

					if (block.kind === 'keyValue') {
						const value = resolvePath(root, block.valuePath)
						return (
							<View
								key={`block-${index}-${block.kind}`}
								style={styles.keyValueRow}
							>
								<Text style={styles.keyValueKey}>{block.key}</Text>
								<Text style={styles.keyValueValue}>{formatValue(value)}</Text>
							</View>
						)
					}

					const rows = dataSet.rows.slice(
						0,
						block.maxRows ?? dataSet.rows.length,
					)
					return (
						<View key={`block-${index}-${block.kind}`} style={styles.table}>
							<View style={styles.tableHeaderRow}>
								{block.columns.map((column) => (
									<Text key={column.key} style={styles.tableCellHeader}>
										{column.label}
									</Text>
								))}
							</View>
							{rows.map((row, rowIndex) => (
								<View key={`row-${rowIndex}`} style={styles.tableRow}>
									{block.columns.map((column) => (
										<Text
											key={`${column.key}-${rowIndex}`}
											style={styles.tableCell}
										>
											{formatValue(row[column.key])}
										</Text>
									))}
								</View>
							))}
						</View>
					)
				})}
			</Page>
		</Document>
	)
}
