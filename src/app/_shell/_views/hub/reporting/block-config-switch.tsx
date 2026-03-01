import type { ReportBlock } from '@server/reporting/contracts'
import { DividerConfig } from './block-configs/divider-config'
import { HeadingConfig } from './block-configs/heading'
import { KeyValueConfig } from './block-configs/key-value'
import { KeyValueGroupConfig } from './block-configs/key-value-group'
import { ParagraphConfig } from './block-configs/paragraph'
import { RowConfig } from './block-configs/row'
import { SectionHeaderConfig } from './block-configs/section-header'
import { SpacerConfig } from './block-configs/spacer'
import { TableConfig } from './block-configs/table'
import type { BlockWithId } from './types'

export function BlockConfigSwitch({
	block,
	entityKey,
	onUpdate,
	extraValuePaths,
	datasetColumns,
}: {
	block: BlockWithId
	entityKey: string
	onUpdate: (patch: Partial<ReportBlock>) => void
	extraValuePaths?: Array<{ value: string; label: string }>
	datasetColumns?: Array<{ key: string; label: string }>
}) {
	switch (block.kind) {
		case 'heading':
			return (
				<HeadingConfig
					text={block.text}
					level={block.level}
					onChange={onUpdate}
				/>
			)
		case 'keyValue':
			return (
				<KeyValueConfig
					keyLabel={block.key}
					valuePath={block.valuePath}
					onChange={onUpdate}
					extraPaths={extraValuePaths}
				/>
			)
		case 'table':
			return (
				<TableConfig
					columns={block.columns}
					maxRows={block.maxRows}
					entityKey={entityKey}
					onChange={onUpdate}
					datasetColumns={datasetColumns}
				/>
			)
		case 'spacer':
			return <SpacerConfig size={block.size} onChange={onUpdate} />
		case 'paragraph':
			return (
				<ParagraphConfig
					text={block.text}
					align={block.align}
					bold={block.bold}
					onChange={onUpdate}
				/>
			)
		case 'row':
			return (
				<RowConfig
					columns={block.columns}
					onChange={onUpdate}
					entityKey={entityKey}
					extraValuePaths={extraValuePaths}
					datasetColumns={datasetColumns}
				/>
			)
		case 'sectionHeader':
			return (
				<SectionHeaderConfig
					text={block.text}
					color={block.color}
					onChange={onUpdate}
				/>
			)
		case 'keyValueGroup':
			return (
				<KeyValueGroupConfig
					pairs={block.pairs}
					align={block.align}
					onChange={onUpdate}
					extraPaths={extraValuePaths}
				/>
			)
		case 'divider':
			return (
				<DividerConfig
					color={block.color}
					thickness={block.thickness}
					onChange={onUpdate}
				/>
			)
	}
}
