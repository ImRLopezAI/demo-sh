'use client'

import type { ReportElement } from '@server/reporting/designer-contracts'
import type { DesignerFieldItem } from '../types'
import { ExpressionEditor } from './expression-editor'

export function DataTab({
	element,
	fields,
	onUpdate,
}: {
	element: ReportElement
	fields: DesignerFieldItem[]
	onUpdate: (patch: Partial<ReportElement>) => void
}) {
	return (
		<div className='space-y-2'>
			<ExpressionEditor
				value={element.expression ?? ''}
				onChange={(expression) => onUpdate({ expression })}
				fields={fields}
				placeholder='=Fields.documentNo'
			/>
			<ExpressionEditor
				value={element.visibility ?? ''}
				onChange={(visibility) => onUpdate({ visibility })}
				fields={fields}
				placeholder='=Fields.status == "Paid"'
			/>
		</div>
	)
}
