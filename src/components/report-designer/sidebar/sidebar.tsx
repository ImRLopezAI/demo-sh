'use client'

import {
	Brush,
	CircleDollarSign,
	Database,
	Grid3X3,
	ListTree,
	MousePointer2,
	PencilRuler,
} from 'lucide-react'
import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PropertyPanel } from '../property-panel/property-panel'
import type { DesignerFieldItem } from '../types'
import { BandListPanel } from './band-list-panel'
import { FieldListPanel } from './field-list-panel'
import { ToolboxPanel } from './toolbox-panel'

const SIDEBAR_TOOLS = [
	{
		id: 'select',
		label: 'Select Tool',
		icon: MousePointer2,
		targetTab: 'properties',
	},
	{
		id: 'toolbox',
		label: 'Toolbox',
		icon: Grid3X3,
		targetTab: 'properties',
	},
	{
		id: 'dictionary',
		label: 'Dictionary',
		icon: Database,
		targetTab: 'dictionary',
	},
	{ id: 'tree', label: 'Report Tree', icon: ListTree, targetTab: 'tree' },
	{ id: 'style', label: 'Styles', icon: Brush, targetTab: 'properties' },
	{ id: 'rules', label: 'Rules', icon: PencilRuler, targetTab: 'properties' },
	{
		id: 'variables',
		label: 'Variables',
		icon: CircleDollarSign,
		targetTab: 'dictionary',
	},
] as const

export function DesignerSidebar({ fields }: { fields: DesignerFieldItem[] }) {
	const [panelTab, setPanelTab] = React.useState<
		'properties' | 'dictionary' | 'tree'
	>('properties')
	const [activeToolId, setActiveToolId] = React.useState<string>('toolbox')

	return (
		<div
			className='grid h-full grid-cols-[44px_1fr] overflow-hidden border bg-[#f3f4f6]'
			style={{ borderColor: 'var(--designer-panel-border)' }}
		>
			<div
				className='flex flex-col items-center gap-1.5 border-r bg-[#eceef2] p-1'
				style={{ borderColor: 'var(--designer-panel-border)' }}
			>
				{SIDEBAR_TOOLS.map((tool) => (
					<Button
						key={tool.id}
						type='button'
						variant='ghost'
						size='icon-xs'
						aria-label={tool.label}
						onClick={() => {
							setActiveToolId(tool.id)
							setPanelTab(tool.targetTab)
						}}
						className={`h-8 w-8 rounded-[3px] text-[#646c77] hover:bg-[#dbe1ec] hover:text-[#32363d] ${
							activeToolId === tool.id
								? 'bg-[#d5dde9] text-[#2a3038]'
								: undefined
						}`}
					>
						<tool.icon className='size-4.5' />
					</Button>
				))}
				<Separator className='my-1 bg-[#d6d9df]' />
			</div>
			<Tabs
				value={panelTab}
				onValueChange={(v) => {
					const next = v as typeof panelTab
					setPanelTab(next)
					if (next === 'properties') setActiveToolId('toolbox')
					if (next === 'dictionary') setActiveToolId('dictionary')
					if (next === 'tree') setActiveToolId('tree')
				}}
				className='h-full gap-0'
			>
				<div className='min-h-0 flex-1 bg-[#f8f8f9] p-2'>
					<TabsContent value='properties' className='h-full'>
						<div className='grid h-full grid-rows-[auto_1fr] gap-2'>
							<ToolboxPanel />
							<div
								className='min-h-0 overflow-hidden border bg-[#f5f5f7]'
								style={{ borderColor: 'var(--designer-panel-border)' }}
							>
								<PropertyPanel fields={fields} embedded />
							</div>
						</div>
					</TabsContent>
					<TabsContent value='dictionary' className='h-full'>
						<FieldListPanel fields={fields} />
					</TabsContent>
					<TabsContent value='tree' className='h-full'>
						<BandListPanel />
					</TabsContent>
				</div>
				<TabsList
					variant='line'
					className='h-10 w-full justify-start rounded-none border-t bg-[#eceef2] p-1'
					style={{ borderColor: 'var(--designer-panel-border)' }}
				>
					<TabsTrigger
						value='properties'
						className='px-2 text-[13px] data-[state=active]:border-[#2e5f9f]'
					>
						Properties
					</TabsTrigger>
					<TabsTrigger
						value='dictionary'
						className='px-2 text-[13px] data-[state=active]:border-[#2e5f9f]'
					>
						Dictionary
					</TabsTrigger>
					<TabsTrigger
						value='tree'
						className='px-2 text-[13px] data-[state=active]:border-[#2e5f9f]'
					>
						Report Tree
					</TabsTrigger>
				</TabsList>
			</Tabs>
		</div>
	)
}
