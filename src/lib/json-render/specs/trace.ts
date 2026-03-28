/**
 * Trace module route specs.
 * Logistics: dashboard, shipments, shipment methods, carrier ops.
 *
 * Uses json-render features:
 * - $computed for number formatting
 * - $template for dynamic descriptions
 * - $bindState for shipment status and carrier filters
 * - $cond for conditional KPI descriptions
 * - visibility for filter reset and delayed shipment alerts
 */
import type { NextAppSpec } from '@json-render/next'

type Routes = NonNullable<NextAppSpec['routes']>

export const traceRoutes: Routes = {
	'/trace/dashboard': {
		layout: 'app',
		metadata: {
			title: 'Trace Dashboard',
			description:
				'Shipment status, delivery metrics, and logistics performance.',
		},
		page: {
			root: 'page',
			elements: {
				page: {
					type: 'Stack',
					props: { direction: 'vertical', gap: '6' },
					children: ['header', 'delayAlert', 'kpis', 'dashboard'],
				},
				header: {
					type: 'PageHeader',
					props: {
						title: 'Trace',
						description: {
							$template:
								'Logistics overview — ${/trace/dashboard/activeShipments} active shipments',
						} as any,
					},
					children: [],
				},
				delayAlert: {
					type: 'Alert',
					props: {
						title: {
							$template: '${/trace/dashboard/delayedCount} shipments delayed',
						} as any,
						message:
							'Review delayed shipments and contact carriers for updated ETAs.',
						type: 'warning' as any,
					},
					visible: { $state: '/trace/dashboard/delayedCount' } as any,
					children: [],
				},
				kpis: {
					type: 'KpiCards',
					props: {
						items: [
							{
								title: 'In Transit',
								value: {
									$computed: 'formatNumber',
									args: {
										value: { $state: '/trace/dashboard/inTransitCount' },
									},
								} as any,
								description: 'Currently in transit',
							},
							{
								title: 'Delivered Today',
								value: {
									$computed: 'formatNumber',
									args: {
										value: { $state: '/trace/dashboard/deliveredToday' },
									},
								} as any,
							},
							{
								title: 'On-Time Rate',
								value: {
									$computed: 'formatPercent',
									args: {
										part: { $state: '/trace/dashboard/onTimeDeliveries' },
										total: { $state: '/trace/dashboard/totalDeliveries' },
									},
								} as any,
								description: {
									$cond: {
										$state: '/trace/dashboard/onTimeImproving',
									},
									$then: 'Improving vs last week',
									$else: 'Below target',
								} as any,
							},
							{
								title: 'Avg Transit Time',
								value: {
									$template: '${/trace/dashboard/avgTransitDays}d',
								} as any,
								description: 'Mean delivery time',
							},
						],
					},
					children: [],
				},
				dashboard: {
					type: 'TraceDashboard',
					props: {},
					children: [],
				},
			},
		},
	},

	'/trace/shipments': {
		layout: 'app',
		metadata: {
			title: 'Shipments',
			description: 'Outbound shipments and delivery tracking.',
		},
		page: {
			root: 'page',
			elements: {
				page: {
					type: 'Stack',
					props: { direction: 'vertical', gap: '4' },
					children: ['filterBar', 'list'],
				},
				filterBar: {
					type: 'Stack',
					props: { direction: 'horizontal', gap: '3', align: 'center' },
					children: ['statusFilter', 'carrierFilter', 'resetBtn'],
				},
				statusFilter: {
					type: 'Select',
					props: {
						label: 'Status',
						name: 'shipmentStatus',
						options: [
							'ALL',
							'PLANNED',
							'DISPATCHED',
							'IN_TRANSIT',
							'DELIVERED',
							'EXCEPTION',
						],
						value: { $bindState: '/filters/trace/shipmentStatusFilter' } as any,
					},
					children: [],
				},
				carrierFilter: {
					type: 'Select',
					props: {
						label: 'Carrier',
						name: 'carrier',
						options: ['ALL', 'FedEx', 'UPS', 'DHL', 'USPS', 'Other'],
						value: { $bindState: '/filters/trace/carrierFilter' } as any,
					},
					children: [],
				},
				resetBtn: {
					type: 'Button',
					props: {
						label: 'Reset Filters',
						variant: 'secondary' as any,
					},
					on: {
						press: {
							action: 'setState',
							params: {
								statePath: '/filters/trace',
								value: {
									shipmentStatusFilter: 'ALL',
									carrierFilter: 'ALL',
								},
							},
						},
					},
					visible: {
						$or: [
							{ $state: '/filters/trace/shipmentStatusFilter', neq: 'ALL' },
							{ $state: '/filters/trace/carrierFilter', neq: 'ALL' },
						],
					} as any,
					children: [],
				},
				list: {
					type: 'ModuleListView',
					props: {
						moduleId: 'trace',
						entityId: 'shipments',
						title: 'Shipments',
						description: 'Outbound shipments and delivery tracking.',
						_filters: {
							status: '/filters/trace/shipmentStatusFilter',
							courierName: '/filters/trace/carrierFilter',
						},
						columns: [
							{ accessorKey: 'shipmentNo', title: 'Shipment No.' },
							{ accessorKey: 'orderNo', title: 'Order No.' },
							{ accessorKey: 'customerName', title: 'Customer' },
							{ accessorKey: 'carrier', title: 'Carrier' },
							{ accessorKey: 'status', title: 'Status', cellVariant: 'select' },
							{
								accessorKey: 'shipDate',
								title: 'Ship Date',
								cellVariant: 'date',
							},
							{
								accessorKey: 'deliveryDate',
								title: 'Delivery Date',
								cellVariant: 'date',
							},
							{ accessorKey: 'trackingNo', title: 'Tracking No.' },
						],
						bulkActions: [
							{
								id: 'dispatch',
								label: 'Dispatch',
								toStatus: 'DISPATCHED',
								requireAllStatus: 'PLANNED',
							},
							{
								id: 'deliver',
								label: 'Mark Delivered',
								toStatus: 'DELIVERED',
								requireAllStatus: 'IN_TRANSIT',
							},
							{
								id: 'exception',
								label: 'Flag Exception',
								toStatus: 'EXCEPTION',
								requireAllStatus: 'PLANNED,DISPATCHED,IN_TRANSIT',
								variant: 'destructive',
							},
						],
						enableNew: true,
						newLabel: 'New Shipment',
						_cardTitle: 'Shipment {shipmentNo}',
						_cardNewTitle: 'New Shipment',
						_cardDescription:
							'Outbound shipment with status tracking, carrier details, and delivery dates.',
						_cardSections: [
							{
								title: 'General',
								fields: [
									{
										name: 'shipmentNo',
										label: 'Shipment No.',
										type: 'text',
										readOnly: true,
									},
									{
										name: 'sourceDocumentType',
										label: 'Source Document Type',
										type: 'text',
									},
									{
										name: 'sourceDocumentNo',
										label: 'Source Document No.',
										type: 'text',
									},
									{
										name: 'shipmentMethodCode',
										label: 'Shipment Method Code',
										type: 'text',
									},
								],
							},
							{
								title: 'Status',
								fields: [
									{
										name: 'status',
										label: 'Status',
										type: 'select',
										options: [
											{ label: 'Planned', value: 'PLANNED' },
											{ label: 'Dispatched', value: 'DISPATCHED' },
											{ label: 'In Transit', value: 'IN_TRANSIT' },
											{ label: 'Delivered', value: 'DELIVERED' },
											{ label: 'Exception', value: 'EXCEPTION' },
										],
									},
									{
										name: 'priority',
										label: 'Priority',
										type: 'select',
										options: [
											{ label: 'Low', value: 'LOW' },
											{ label: 'Normal', value: 'NORMAL' },
											{ label: 'High', value: 'HIGH' },
											{ label: 'Express', value: 'EXPRESS' },
										],
									},
								],
							},
							{
								title: 'Dates',
								fields: [
									{
										name: 'plannedDispatchDate',
										label: 'Planned Dispatch Date',
										type: 'date',
									},
									{
										name: 'plannedDeliveryDate',
										label: 'Planned Delivery Date',
										type: 'date',
									},
									{
										name: 'actualDispatchDate',
										label: 'Actual Dispatch Date',
										type: 'date',
									},
									{
										name: 'actualDeliveryDate',
										label: 'Actual Delivery Date',
										type: 'date',
									},
								],
							},
							{
								title: 'Carrier',
								fields: [
									{ name: 'courierName', label: 'Courier Name', type: 'text' },
									{ name: 'trackingNo', label: 'Tracking No.', type: 'text' },
								],
							},
						] as any,
					},
					children: [],
				},
			},
		},
	},

	'/trace/shipment-methods': {
		layout: 'app',
		metadata: {
			title: 'Shipment Methods',
			description: 'Shipping methods and delivery configurations.',
		},
		page: {
			root: 'view',
			elements: {
				view: {
					type: 'ModuleListView',
					props: {
						moduleId: 'trace',
						entityId: 'shipmentMethods',
						title: 'Shipment Methods',
						description: 'Shipping methods and delivery configurations.',
						columns: [
							{ accessorKey: 'code', title: 'Code' },
							{ accessorKey: 'description', title: 'Description' },
							{ accessorKey: 'carrier', title: 'Default Carrier' },
							{
								accessorKey: 'transitDays',
								title: 'Transit Days',
								cellVariant: 'number',
							},
							{ accessorKey: 'active', title: 'Active', cellVariant: 'select' },
						],
						enableNew: true,
						newLabel: 'New Method',
						_cardTitle: 'Shipment Method {code}',
						_cardNewTitle: 'New Shipment Method',
						_cardDescription:
							'Shipping method configuration with carrier and delivery settings.',
						_cardSections: [
							{
								title: 'General',
								columns: 2,
								fields: [
									{ name: 'code', label: 'Code', type: 'text' },
									{ name: 'description', label: 'Description', type: 'text' },
									{ name: 'active', label: 'Active', type: 'switch' },
								],
							},
						] as any,
					},
					children: [],
				},
			},
		},
	},

	'/trace/carrier-ops': {
		layout: 'app',
		metadata: {
			title: 'Carrier Operations',
			description: 'Carrier management, rate tables, and performance tracking.',
		},
		page: {
			root: 'view',
			elements: {
				view: {
					type: 'CarrierOps',
					props: {
						title: 'Carrier Operations & Customer Communications',
						description:
							'Quote/purchase labels, ingest carrier events with dedupe, and operate customer communication templates with timeline triage.',
					},
					children: [],
				},
			},
		},
	},
}
