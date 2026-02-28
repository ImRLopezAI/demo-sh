import type { ReportBlock, ReportModuleId } from '@server/reporting/contracts'
import { FileText, Printer, Receipt } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface TemplateInfo {
	key: string
	name: string
	description: string
	pageSize: 'A4' | 'LETTER' | 'THERMAL'
	orientation: 'portrait' | 'landscape'
	blocks: ReportBlock[]
	icon: typeof FileText
}

const BUILT_IN_TEMPLATES: TemplateInfo[] = [
	{
		key: 'BLANK_EMPTY',
		name: 'Blank / Empty',
		description: 'Start from scratch with a single heading block.',
		pageSize: 'A4',
		orientation: 'portrait',
		blocks: [{ kind: 'heading', text: 'Report', level: 1 }],
		icon: FileText,
	},
	{
		key: 'A4_SUMMARY',
		name: 'A4 Summary',
		description:
			'Standard A4 report with heading, key-value metadata, and a data table.',
		pageSize: 'A4',
		orientation: 'portrait',
		blocks: [
			{ kind: 'heading', text: 'Summary Report', level: 1 },
			{ kind: 'spacer', size: 'sm' },
			{ kind: 'keyValue', key: 'Module', valuePath: 'moduleId' },
			{ kind: 'keyValue', key: 'Entity', valuePath: 'entityId' },
			{ kind: 'keyValue', key: 'Generated', valuePath: 'generatedAt' },
			{ kind: 'spacer', size: 'md' },
			{
				kind: 'table',
				columns: [
					{ key: '_id', label: 'ID' },
					{ key: 'status', label: 'Status' },
					{ key: '_updatedAt', label: 'Updated' },
				],
				maxRows: 60,
			},
		],
		icon: Printer,
	},
	{
		key: 'THERMAL_RECEIPT',
		name: 'Thermal Receipt',
		description:
			'Compact receipt format optimized for POS thermal printers.',
		pageSize: 'THERMAL',
		orientation: 'portrait',
		blocks: [
			{ kind: 'heading', text: 'Receipt', level: 2 },
			{ kind: 'keyValue', key: 'Receipt No', valuePath: 'summary.receiptNo' },
			{ kind: 'keyValue', key: 'Session', valuePath: 'summary.sessionNo' },
			{
				kind: 'keyValue',
				key: 'Payment',
				valuePath: 'summary.paymentMethod',
			},
			{ kind: 'spacer', size: 'sm' },
			{
				kind: 'table',
				columns: [
					{ key: 'description', label: 'Item' },
					{ key: 'quantity', label: 'Qty' },
					{ key: 'lineAmount', label: 'Total' },
				],
				maxRows: 120,
			},
			{ kind: 'spacer', size: 'sm' },
			{ kind: 'keyValue', key: 'Subtotal', valuePath: 'summary.subtotal' },
			{ kind: 'keyValue', key: 'Tax', valuePath: 'summary.taxAmount' },
			{
				kind: 'keyValue',
				key: 'Discount',
				valuePath: 'summary.discountAmount',
			},
			{ kind: 'keyValue', key: 'Total', valuePath: 'summary.totalAmount' },
		],
		icon: Receipt,
	},
]

export function TemplateGallery({
	moduleId,
	onSelect,
}: {
	moduleId: ReportModuleId
	onSelect: (template: {
		blocks: ReportBlock[]
		pageSize: 'A4' | 'LETTER' | 'THERMAL'
		orientation: 'portrait' | 'landscape'
		name: string
		key: string
	}) => void
}) {
	return (
		<div className='space-y-4'>
			<div>
				<h3 className='font-medium text-sm'>Built-in Templates</h3>
				<p className='text-muted-foreground text-xs'>
					Choose a starting template to quickly build your report.
				</p>
			</div>

			<div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
				{BUILT_IN_TEMPLATES.map((template) => {
					const isPromoted =
						template.key === 'THERMAL_RECEIPT' && moduleId === 'pos'

					return (
						<Card
							key={template.key}
							className={
								isPromoted
									? 'ring-2 ring-primary/30'
									: ''
							}
						>
							<CardHeader className='pb-2'>
								<div className='flex items-start justify-between gap-2'>
									<div className='flex items-center gap-2'>
										<template.icon
											className='size-5 text-muted-foreground'
											aria-hidden='true'
										/>
										<CardTitle className='text-sm'>
											{template.name}
										</CardTitle>
									</div>
									{isPromoted && (
										<Badge variant='default' className='text-[10px]'>
											Recommended
										</Badge>
									)}
								</div>
							</CardHeader>
							<CardContent className='space-y-3'>
								<p className='text-muted-foreground text-xs leading-relaxed'>
									{template.description}
								</p>
								<div className='flex items-center gap-2'>
									<Badge variant='outline' className='text-[10px]'>
										{template.pageSize}
									</Badge>
									<Badge variant='outline' className='text-[10px]'>
										{template.orientation}
									</Badge>
									<Badge variant='outline' className='text-[10px]'>
										{template.blocks.length} blocks
									</Badge>
								</div>
								<Button
									type='button'
									variant='outline'
									size='sm'
									onClick={() => onSelect(template)}
									className='w-full text-xs'
								>
									Use Template
								</Button>
							</CardContent>
						</Card>
					)
				})}
			</div>
		</div>
	)
}
