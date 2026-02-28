import { Plus, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
} from '@/components/ui/resizable'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PageHeader } from '../_shared/page-header'
import { BlockBuilder } from './reporting/block-builder'
import { FilterBuilder } from './reporting/filter-builder'
import { LayoutManager } from './reporting/layout-manager'
import { PreviewPanel } from './reporting/preview-panel'
import { ReportSettings } from './reporting/report-settings'
import { TemplateGallery } from './reporting/template-gallery'
import { useReportBuilder } from './reporting/use-report-builder'

export default function ReportingCenter() {
	const builder = useReportBuilder()

	return (
		<div className='flex h-full flex-col gap-4 pb-4'>
			<PageHeader
				title='Report Builder'
				description='Design, preview, and manage PDF report layouts.'
			/>

			<Tabs
				value={builder.activeTab}
				onValueChange={builder.setActiveTab}
				className='flex flex-1 flex-col overflow-hidden'
			>
				<TabsList variant='line' className='shrink-0'>
					<TabsTrigger value='templates'>Templates</TabsTrigger>
					<TabsTrigger value='builder'>Builder</TabsTrigger>
					<TabsTrigger value='saved'>Saved Layouts</TabsTrigger>
				</TabsList>

				<TabsContent value='templates' className='flex-1 overflow-auto p-1'>
					<TemplateGallery
						moduleId={builder.moduleId}
						onSelect={builder.loadTemplate}
					/>
				</TabsContent>

				<TabsContent
					value='builder'
					className='flex-1 overflow-hidden p-0'
				>
					<ResizablePanelGroup orientation='horizontal'>
						<ResizablePanel defaultSize={40} minSize={30}>
							<ScrollArea className='h-full'>
								<div className='space-y-6 p-4'>
									<ReportSettings
										moduleId={builder.moduleId}
										entityId={builder.entityId}
										pageSize={builder.pageSize}
										orientation={builder.orientation}
										rowLimit={builder.rowLimit}
										onModuleChange={builder.setModuleId}
										onEntityChange={builder.setEntityId}
										onPageSizeChange={builder.setPageSize}
										onOrientationChange={builder.setOrientation}
										onRowLimitChange={builder.setRowLimit}
									/>

									<div className='h-px bg-border/60' />

									<FilterBuilder
										filters={builder.filters}
										entityKey={builder.entityKey}
										onAdd={builder.addFilter}
										onRemove={builder.removeFilter}
										onUpdate={builder.updateFilter}
									/>

									<div className='h-px bg-border/60' />

									<BlockBuilder
										blocks={builder.blocks}
										entityKey={builder.entityKey}
										onAdd={builder.addBlock}
										onRemove={builder.removeBlock}
										onUpdate={builder.updateBlock}
										onReorder={builder.reorderBlocks}
									/>

									<div className='h-px bg-border/60' />

									<BuilderActions
										layoutName={builder.layoutName}
										onLayoutNameChange={builder.setLayoutName}
										onSave={() => {
											void builder.handleSave()
										}}
										onCreate={() => {
											void builder.handleCreate()
										}}
										canSave={
											builder.selectedLayout?.source === 'CUSTOM'
										}
										loading={builder.layoutMutationLoading}
									/>
								</div>
							</ScrollArea>
						</ResizablePanel>

						<ResizableHandle withHandle />

						<ResizablePanel defaultSize={60} minSize={30}>
							<PreviewPanel
								previewUrl={builder.previewUrl}
								loading={builder.loading}
								onRefresh={() => {
									void builder.handlePreview()
								}}
								onDownload={() => {
									void builder.handleDownload()
								}}
							/>
						</ResizablePanel>
					</ResizablePanelGroup>
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

function BuilderActions({
	layoutName,
	onLayoutNameChange,
	onSave,
	onCreate,
	canSave,
	loading,
}: {
	layoutName: string
	onLayoutNameChange: (value: string) => void
	onSave: () => void
	onCreate: () => void
	canSave: boolean
	loading: boolean
}) {
	return (
		<div className='space-y-3'>
			<Label className='font-medium text-sm'>Save Layout</Label>
			<div className='space-y-2'>
				<Input
					value={layoutName}
					onChange={(e) => onLayoutNameChange(e.target.value)}
					placeholder='Layout name'
					className='h-8 text-xs'
				/>
				<div className='flex gap-2'>
					{canSave && (
						<Button
							type='button'
							variant='outline'
							size='sm'
							onClick={onSave}
							disabled={loading}
							className='gap-1 text-xs'
						>
							<Save className='size-3' aria-hidden='true' />
							Save Version
						</Button>
					)}
					<Button
						type='button'
						variant='outline'
						size='sm'
						onClick={onCreate}
						disabled={loading}
						className='gap-1 text-xs'
					>
						<Plus className='size-3' aria-hidden='true' />
						Create New
					</Button>
				</div>
			</div>
		</div>
	)
}
