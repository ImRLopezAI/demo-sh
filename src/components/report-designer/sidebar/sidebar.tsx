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
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PropertyPanel } from '../property-panel/property-panel'
import type { DesignerFieldItem } from '../types'
import { BandListPanel } from './band-list-panel'
import { FieldListPanel } from './field-list-panel'
import { ToolboxPanel } from './toolbox-panel'

const SIDEBAR_TOOLS = [
	{ id: 'select', label: 'Select Tool', icon: MousePointer2 },
	{ id: 'toolbox', label: 'Toolbox', icon: Grid3X3 },
	{ id: 'dictionary', label: 'Dictionary', icon: Database },
	{ id: 'tree', label: 'Report Tree', icon: ListTree },
	{ id: 'style', label: 'Styles', icon: Brush },
	{ id: 'rules', label: 'Rules', icon: PencilRuler },
	{ id: 'variables', label: 'Variables', icon: CircleDollarSign },
] as const

export function DesignerSidebar({ fields }: { fields: DesignerFieldItem[] }) {
	return (
		<div className='grid h-full grid-cols-[36px_1fr] overflow-hidden border border-border bg-card'>
			<div className='flex flex-col items-center gap-1 border-border border-r bg-muted/40 p-1'>
				{SIDEBAR_TOOLS.map((tool) => (
					<Button
						key={tool.id}
						type='button'
						variant='ghost'
						size='icon-xs'
						aria-label={tool.label}
						className='text-muted-foreground hover:text-foreground'
					>
						<tool.icon className='size-3' />
					</Button>
				))}
				<Separator className='my-1' />
			</div>
			<Tabs defaultValue='properties' className='h-full gap-0'>
				<div className='min-h-0 flex-1 bg-background/80 p-2'>
					<TabsContent value='properties' className='h-full'>
						<div className='grid h-full grid-rows-[auto_1fr] gap-2'>
							<ToolboxPanel />
							<div className='min-h-0 overflow-hidden border border-border bg-background'>
								<PropertyPanel fields={fields} embedded />
							</div>
						</div>
					</TabsContent>
					<TabsContent value='fields'>
						<FieldListPanel fields={fields} />
					</TabsContent>
					<TabsContent value='tree'>
						<BandListPanel />
					</TabsContent>
				</div>
				<TabsList
					variant='line'
					className='h-10 w-full justify-start rounded-none border-border border-t bg-muted/25 p-1'
				>
					<TabsTrigger value='properties' className='px-2'>
						Properties
					</TabsTrigger>
					<TabsTrigger value='fields' className='px-2'>
						Dictionary
					</TabsTrigger>
					<TabsTrigger value='tree' className='px-2'>
						Tree
					</TabsTrigger>
				</TabsList>
			</Tabs>
		</div>
	)
}
