'use client'

import type {
	ReportBand,
	ReportElement,
} from '@server/reporting/designer-contracts'
import { useShallow } from 'zustand/react/shallow'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useReportDesignerStore } from '../store'
import type { DesignerFieldItem } from '../types'
import { BandProperties } from './band-properties'
import { DataTab } from './data-tab'
import { PositionTab } from './position-tab'
import { RulesTab } from './rules-tab'
import { StyleTab } from './style-tab'

function getSelection(
	report: { bands: ReportBand[] },
	selectedBandId: string | null,
	selectedElementIds: string[],
): { band: ReportBand | null; element: ReportElement | null } {
	const band = report.bands.find((item) => item.id === selectedBandId) ?? null
	const selectedId = selectedElementIds[0]
	if (!selectedId) return { band, element: null }
	for (const candidate of report.bands) {
		const element = candidate.elements.find((item) => item.id === selectedId)
		if (element) return { band: candidate, element }
	}
	return { band, element: null }
}

export function PropertyPanel({
	fields,
	embedded = false,
}: {
	fields: DesignerFieldItem[]
	embedded?: boolean
}) {
	const {
		report,
		rulers,
		selectedBandId,
		selectedElementIds,
		updateBand,
		updateElement,
	} = useReportDesignerStore(
		useShallow((state) => ({
			report: state.report,
			rulers: state.rulers,
			selectedBandId: state.selectedBandId,
			selectedElementIds: state.selectedElementIds,
			updateBand: state.updateBand,
			updateElement: state.updateElement,
		})),
	)

	const { band, element } = getSelection(
		report,
		selectedBandId,
		selectedElementIds,
	)

	return (
		<div
			className={
				embedded
					? 'h-full overflow-hidden bg-transparent'
					: 'h-full overflow-hidden border bg-[#f6f6f8]'
			}
			style={
				!embedded ? { borderColor: 'var(--designer-panel-border)' } : undefined
			}
		>
			<Tabs defaultValue='position' className='h-full gap-0'>
				<TabsList
					variant='line'
					className='w-full justify-start rounded-none border-b bg-[#eceef2] p-1'
					style={{ borderColor: 'var(--designer-panel-border)' }}
				>
					<TabsTrigger
						value='position'
						className='px-2 text-[12px] data-[state=active]:border-[#2e5f9f]'
					>
						Position
					</TabsTrigger>
					<TabsTrigger
						value='style'
						className='px-2 text-[12px] data-[state=active]:border-[#2e5f9f]'
					>
						Style
					</TabsTrigger>
					<TabsTrigger
						value='data'
						className='px-2 text-[12px] data-[state=active]:border-[#2e5f9f]'
					>
						Data
					</TabsTrigger>
					<TabsTrigger
						value='rules'
						className='px-2 text-[12px] data-[state=active]:border-[#2e5f9f]'
					>
						Rules
					</TabsTrigger>
				</TabsList>
				<ScrollArea
					className={
						embedded
							? 'h-[calc(100%-36px)] bg-[#f8f8f9]'
							: 'h-[calc(100%-36px)] bg-[#f6f6f8]'
					}
				>
					<div className='space-y-3 p-2.5 text-[11px]'>
						<div className='rounded-[3px] border border-[#d5d8df] bg-[#edf0f5] px-2 py-1 text-[#666f7a] text-[10px]'>
							{element
								? `Editing ${element.kind}`
								: band
									? `Editing ${band.type}`
									: 'No selection'}
						</div>
						{element ? (
							<>
								<TabsContent value='position'>
									<PositionTab
										element={element}
										unit={rulers.unit}
										onUpdate={(patch) => updateElement(element.id, patch)}
									/>
								</TabsContent>
								<TabsContent value='style'>
									<StyleTab
										element={element}
										onUpdate={(patch) => updateElement(element.id, patch)}
									/>
								</TabsContent>
								<TabsContent value='data'>
									<DataTab
										element={element}
										fields={fields}
										onUpdate={(patch) => updateElement(element.id, patch)}
									/>
								</TabsContent>
								<TabsContent value='rules'>
									<RulesTab
										element={element}
										onUpdate={(patch) => updateElement(element.id, patch)}
									/>
								</TabsContent>
							</>
						) : band ? (
							<BandProperties
								band={band}
								onUpdate={(patch) => updateBand(band.id, patch)}
							/>
						) : (
							<p className='rounded-sm border border-border border-dashed bg-background px-2 py-3 text-muted-foreground'>
								Select a band or element to edit properties.
							</p>
						)}
					</div>
				</ScrollArea>
			</Tabs>
		</div>
	)
}
