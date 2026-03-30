import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { SpecWorkbenchProps } from '@/lib/json-render/components/spec-workbench-helpers'
import { DesignerIntegration } from './reporting/designer-integration'
import { LayoutManager } from './reporting/layout-manager'
import { TemplateGallery } from './reporting/template-gallery'
import { useReportBuilder } from './reporting/use-report-builder'

interface ReportingCenterProps {
	specProps?: SpecWorkbenchProps
}

export default function ReportingCenter({
	specProps: _specProps,
}: ReportingCenterProps = {}) {
	const builder = useReportBuilder()

	return (
		<div className='flex h-full flex-col gap-0'>
			<Tabs
				value={builder.activeTab}
				onValueChange={builder.setActiveTab}
				className='flex flex-1 flex-col overflow-hidden'
			>
				<TabsList
					variant='line'
					className='shrink-0 border-border border-b bg-background px-1'
				>
					<TabsTrigger value='templates'>Templates</TabsTrigger>
					<TabsTrigger value='builder'>Designer</TabsTrigger>
					<TabsTrigger value='saved'>Saved Layouts</TabsTrigger>
				</TabsList>

				<TabsContent value='templates' className='flex-1 overflow-auto p-1'>
					<TemplateGallery
						moduleId={builder.moduleId}
						onSelect={builder.loadTemplate}
					/>
				</TabsContent>

				<TabsContent value='builder' className='flex-1 overflow-hidden p-0'>
					<DesignerIntegration builder={builder} />
				</TabsContent>

				<TabsContent value='saved' className='flex-1 overflow-auto p-1'>
					<LayoutManager
						layouts={builder.layoutItems}
						isLoading={builder.layoutsQuery.isFetching}
						onEdit={(layout) => {
							builder.setSelectedLayoutId(layout.id)
							builder.setSelectedLayoutSource(
								layout.source as 'SYSTEM' | 'CUSTOM',
							)
							builder.setLayoutName(layout.name)
							builder.setActiveTab('builder')
						}}
						onSetDefault={(layout) => {
							builder.setSelectedLayoutId(layout.id)
							builder.setSelectedLayoutSource(
								layout.source as 'SYSTEM' | 'CUSTOM',
							)
							void builder.handleSetDefault()
						}}
						onDuplicate={(layout) => {
							builder.setSelectedLayoutId(layout.id)
							builder.setLayoutName(`${layout.name}-copy`)
							builder.setActiveTab('builder')
						}}
						defaultLoading={builder.layoutMutationLoading}
					/>
				</TabsContent>
			</Tabs>
		</div>
	)
}
