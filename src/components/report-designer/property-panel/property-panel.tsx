'use client'

import type {
	ReportBand,
	ReportElement,
} from '@server/reporting/designer-contracts'
import { useShallow } from 'zustand/react/shallow'
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

export function PropertyPanel({ fields }: { fields: DesignerFieldItem[] }) {
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
		<div className='h-full rounded-md border border-slate-300/70 bg-white/65 shadow-sm backdrop-blur'>
			<Tabs defaultValue='position' className='h-full'>
				<TabsList
					variant='line'
					className='w-full justify-start border-slate-200 border-b p-2'
				>
					<TabsTrigger value='position'>Position</TabsTrigger>
					<TabsTrigger value='style'>Style</TabsTrigger>
					<TabsTrigger value='data'>Data</TabsTrigger>
					<TabsTrigger value='rules'>Rules</TabsTrigger>
				</TabsList>
				<div className='space-y-3 p-3 text-[11px]'>
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
						<p className='rounded border border-slate-300 border-dashed px-2 py-3 text-slate-500'>
							Select a band or element to edit properties.
						</p>
					)}
				</div>
			</Tabs>
		</div>
	)
}
