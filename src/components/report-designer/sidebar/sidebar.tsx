'use client'

import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { DesignerFieldItem } from '../types'
import { BandListPanel } from './band-list-panel'
import { FieldListPanel } from './field-list-panel'
import { ToolboxPanel } from './toolbox-panel'

export function DesignerSidebar({ fields }: { fields: DesignerFieldItem[] }) {
	return (
		<div className='h-full rounded-md border border-slate-300/70 bg-white/65 shadow-sm backdrop-blur'>
			<Tabs defaultValue='toolbox' className='h-full'>
				<TabsList
					variant='line'
					className='w-full justify-start border-slate-200 border-b p-2'
				>
					<TabsTrigger value='toolbox'>Toolbox</TabsTrigger>
					<TabsTrigger value='fields'>Dictionary</TabsTrigger>
					<TabsTrigger value='tree'>Tree</TabsTrigger>
				</TabsList>
				<ScrollArea className='h-[calc(100%-44px)]'>
					<div className='p-3'>
						<TabsContent value='toolbox'>
							<ToolboxPanel />
						</TabsContent>
						<TabsContent value='fields'>
							<FieldListPanel fields={fields} />
						</TabsContent>
						<TabsContent value='tree'>
							<BandListPanel />
						</TabsContent>
					</div>
				</ScrollArea>
			</Tabs>
		</div>
	)
}
