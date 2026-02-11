import * as React from 'react'
import { Button } from '@/components/ui/button'
import { useCreateForm } from '@/components/ui/form'
import {
	MapControls,
	MapMarker,
	MarkerContent,
	MarkerPopup,
	Map as UplinkMap,
} from '@/components/ui/map'
import { RecordDialog } from '../../_shared/record-dialog'
import { useEntityMutations, useEntityRecord } from '../../_shared/use-entity'

type LocationFormValues = {
	code: string
	name: string
	type: 'WAREHOUSE' | 'STORE' | 'DISTRIBUTION_CENTER'
	address: string
	city: string
	country: string
	latitude?: number
	longitude?: number
	active: boolean
}

const AMERICAS_COORDINATE_BOUNDS = {
	latitude: { min: -56, max: 72 },
	longitude: { min: -170, max: -34 },
} as const

const DEFAULT_COORDINATES = {
	latitude: 40.7128,
	longitude: -74.006,
}

function toCoordinate(value: unknown): number | undefined {
	if (typeof value === 'number' && Number.isFinite(value)) return value
	if (typeof value === 'string') {
		const parsed = Number.parseFloat(value)
		return Number.isFinite(parsed) ? parsed : undefined
	}
	return undefined
}

function clampCoordinate(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value))
}

function toAmericanLatitude(value: unknown): number | undefined {
	const coordinate = toCoordinate(value)
	if (coordinate === undefined) return undefined
	return clampCoordinate(
		coordinate,
		AMERICAS_COORDINATE_BOUNDS.latitude.min,
		AMERICAS_COORDINATE_BOUNDS.latitude.max,
	)
}

function toAmericanLongitude(value: unknown): number | undefined {
	const coordinate = toCoordinate(value)
	if (coordinate === undefined) return undefined
	return clampCoordinate(
		coordinate,
		AMERICAS_COORDINATE_BOUNDS.longitude.min,
		AMERICAS_COORDINATE_BOUNDS.longitude.max,
	)
}

function parseCoordinateInput(
	input: string,
	bounds: { min: number; max: number },
): number | undefined {
	const trimmed = input.trim()
	if (!trimmed) return undefined
	const parsed = Number.parseFloat(trimmed)
	if (!Number.isFinite(parsed)) return undefined
	return clampCoordinate(parsed, bounds.min, bounds.max)
}

export function LocationCard({
	locationId,
	open,
	onOpenChange,
}: {
	locationId: string | null
	open: boolean
	onOpenChange: (open: boolean) => void
}) {
	const { data: record, isLoading } = useEntityRecord(
		'insight',
		'locations',
		locationId,
		{ enabled: open },
	)

	const { update } = useEntityMutations('insight', 'locations')

	const [Form, form] = useCreateForm<LocationFormValues>(
		() => ({
			defaultValues: {
				code: '',
				name: '',
				type: 'WAREHOUSE',
				address: '',
				city: '',
				country: '',
				latitude: undefined,
				longitude: undefined,
				active: true,
			},
			onSubmit: async (data) => {
				if (!locationId) return
				await update.mutateAsync({ id: locationId, data })
				onOpenChange(false)
			},
		}),
		[locationId],
	)

	React.useEffect(() => {
		if (record) {
			form.reset({
				code: record.code ?? '',
				name: record.name ?? '',
				type: record.type ?? 'WAREHOUSE',
				address: record.address ?? '',
				city: record.city ?? '',
				country: record.country ?? '',
				latitude: toAmericanLatitude(record.latitude),
				longitude: toAmericanLongitude(record.longitude),
				active: record.active ?? true,
			})
		}
	}, [record, form])

	const latitude = toAmericanLatitude(form.watch('latitude'))
	const longitude = toAmericanLongitude(form.watch('longitude'))

	const mapLatitude =
		toAmericanLatitude(latitude) ?? DEFAULT_COORDINATES.latitude
	const mapLongitude =
		toAmericanLongitude(longitude) ?? DEFAULT_COORDINATES.longitude
	const americanMapBounds: [[number, number], [number, number]] = [
		[
			AMERICAS_COORDINATE_BOUNDS.longitude.min,
			AMERICAS_COORDINATE_BOUNDS.latitude.min,
		],
		[
			AMERICAS_COORDINATE_BOUNDS.longitude.max,
			AMERICAS_COORDINATE_BOUNDS.latitude.max,
		],
	]

	if (isLoading) return null

	return (
		<RecordDialog
			open={open}
			onOpenChange={onOpenChange}
			title='Location Details'
			description='View and edit location information.'
			size='md'
			footer={
				<>
					<Button
						variant='outline'
						size='sm'
						onClick={() => onOpenChange(false)}
					>
						Cancel
					</Button>
					<Button size='sm' onClick={() => form.submit()}>
						Save
					</Button>
				</>
			}
		>
			<Form>
				{() => (
					<div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
						<Form.Field
							name='code'
							render={({ field }) => (
								<Form.Item>
									<Form.Label>Code</Form.Label>
									<Form.Control>
										<Form.Input {...field} readOnly />
									</Form.Control>
									<Form.Message />
								</Form.Item>
							)}
						/>

						<Form.Field
							name='name'
							render={({ field }) => (
								<Form.Item>
									<Form.Label>Name</Form.Label>
									<Form.Control>
										<Form.Input {...field} />
									</Form.Control>
									<Form.Message />
								</Form.Item>
							)}
						/>

						<Form.Field
							name='type'
							render={({ field }) => (
								<Form.Item>
									<Form.Label>Type</Form.Label>
									<Form.Select
										value={field.value}
										onValueChange={field.onChange}
									>
										<Form.Control>
											<Form.Select.Trigger>
												<Form.Select.Value placeholder='Select type' />
											</Form.Select.Trigger>
										</Form.Control>
										<Form.Select.Content>
											<Form.Select.Item value='WAREHOUSE'>
												Warehouse
											</Form.Select.Item>
											<Form.Select.Item value='STORE'>Store</Form.Select.Item>
											<Form.Select.Item value='DISTRIBUTION_CENTER'>
												Distribution Center
											</Form.Select.Item>
										</Form.Select.Content>
									</Form.Select>
									<Form.Message />
								</Form.Item>
							)}
						/>

						<Form.Field
							name='address'
							render={({ field }) => (
								<Form.Item>
									<Form.Label>Address</Form.Label>
									<Form.Control>
										<Form.Input {...field} />
									</Form.Control>
									<Form.Message />
								</Form.Item>
							)}
						/>

						<Form.Field
							name='city'
							render={({ field }) => (
								<Form.Item>
									<Form.Label>City</Form.Label>
									<Form.Control>
										<Form.Input {...field} />
									</Form.Control>
									<Form.Message />
								</Form.Item>
							)}
						/>

						<Form.Field
							name='country'
							render={({ field }) => (
								<Form.Item>
									<Form.Label>Country</Form.Label>
									<Form.Control>
										<Form.Input {...field} />
									</Form.Control>
									<Form.Message />
								</Form.Item>
							)}
						/>

						<Form.Field
							name='latitude'
							render={({ field }) => (
								<Form.Item>
									<Form.Label>Latitude</Form.Label>
									<Form.Control>
										<Form.Input
											{...field}
											type='number'
											step='any'
											min={AMERICAS_COORDINATE_BOUNDS.latitude.min}
											max={AMERICAS_COORDINATE_BOUNDS.latitude.max}
											value={toAmericanLatitude(field.value) ?? ''}
											placeholder='e.g. 40.7128\u2026'
											onChange={(e) =>
												field.onChange(
													parseCoordinateInput(
														e.target.value,
														AMERICAS_COORDINATE_BOUNDS.latitude,
													),
												)
											}
										/>
									</Form.Control>
									<Form.Message />
								</Form.Item>
							)}
						/>

						<Form.Field
							name='longitude'
							render={({ field }) => (
								<Form.Item>
									<Form.Label>Longitude</Form.Label>
									<Form.Control>
										<Form.Input
											{...field}
											type='number'
											step='any'
											min={AMERICAS_COORDINATE_BOUNDS.longitude.min}
											max={AMERICAS_COORDINATE_BOUNDS.longitude.max}
											value={toAmericanLongitude(field.value) ?? ''}
											placeholder='e.g. -74.0060\u2026'
											onChange={(e) =>
												field.onChange(
													parseCoordinateInput(
														e.target.value,
														AMERICAS_COORDINATE_BOUNDS.longitude,
													),
												)
											}
										/>
									</Form.Control>
									<Form.Message />
								</Form.Item>
							)}
						/>

						<Form.Field
							name='active'
							render={({ field }) => (
								<Form.Item className='flex items-center gap-3 sm:col-span-2'>
									<Form.Label>Active</Form.Label>
									<Form.Control>
										<Form.Switch
											checked={field.value}
											onCheckedChange={field.onChange}
										/>
									</Form.Control>
									<Form.Message />
								</Form.Item>
							)}
						/>

						<div className='space-y-2 sm:col-span-2'>
							<p className='font-medium text-sm'>Map Preview</p>
							<div className='h-72 overflow-hidden rounded-md border'>
								<UplinkMap
									className='h-full w-full'
									center={[mapLongitude, mapLatitude]}
									maxBounds={americanMapBounds}
									zoom={11}
								>
									<MapControls
										position='top-right'
										showZoom
										showLocate
										showCompass
										onLocate={(coords) => {
											form.setValue(
												'latitude',
												Number(
													toAmericanLatitude(coords.latitude)?.toFixed(6) ??
														DEFAULT_COORDINATES.latitude.toFixed(6),
												),
											)
											form.setValue(
												'longitude',
												Number(
													toAmericanLongitude(coords.longitude)?.toFixed(6) ??
														DEFAULT_COORDINATES.longitude.toFixed(6),
												),
											)
										}}
									/>
									<MapMarker
										longitude={mapLongitude}
										latitude={mapLatitude}
										draggable
										onDragEnd={({ lng, lat }) => {
											form.setValue(
												'latitude',
												Number(
													toAmericanLatitude(lat)?.toFixed(6) ??
														DEFAULT_COORDINATES.latitude.toFixed(6),
												),
											)
											form.setValue(
												'longitude',
												Number(
													toAmericanLongitude(lng)?.toFixed(6) ??
														DEFAULT_COORDINATES.longitude.toFixed(6),
												),
											)
										}}
									>
										<MarkerContent />
										<MarkerPopup closeButton>
											<div className='space-y-1 text-xs'>
												<p className='font-medium'>
													{form.getValues('name') || 'Location'}
												</p>
												<p className='text-muted-foreground'>
													{lngLatToText(mapLatitude, mapLongitude)}
												</p>
											</div>
										</MarkerPopup>
									</MapMarker>
								</UplinkMap>
							</div>
							<p className='text-muted-foreground text-xs'>
								Drag the pin or use locate to update coordinates.
							</p>
						</div>
					</div>
				)}
			</Form>
		</RecordDialog>
	)
}

function lngLatToText(latitude: number, longitude: number): string {
	return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
}
