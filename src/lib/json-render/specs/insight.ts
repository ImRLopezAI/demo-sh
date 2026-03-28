/**
 * Insight module route specs.
 * Analytics: dashboard, item ledger, locations, value entries, forecast workbench.
 *
 * Uses json-render features:
 * - $computed for number/currency formatting
 * - $template for dynamic text
 * - $bindState for location and entry type filters
 * - $cond for conditional descriptions
 * - visibility for filter reset
 */
import type { NextAppSpec } from '@json-render/next'

type Routes = NonNullable<NextAppSpec['routes']>

export const insightRoutes: Routes = {
	'/insight/dashboard': {
		layout: 'app',
		metadata: {
			title: 'Insight Dashboard',
			description:
				'Inventory analytics, movement trends, and forecast signals.',
		},
		page: {
			root: 'page',
			elements: {
				page: {
					type: 'Stack',
					props: { direction: 'vertical', gap: '6' },
					children: ['header', 'kpis', 'dashboard'],
				},
				header: {
					type: 'PageHeader',
					props: {
						title: 'Insight',
						description: {
							$template:
								'Inventory intelligence — ${/insight/dashboard/totalSKUs} tracked SKUs',
						} as any,
					},
					children: [],
				},
				kpis: {
					type: 'KpiCards',
					props: {
						items: [
							{
								title: 'Inventory Value',
								value: {
									$computed: 'formatCompactCurrency',
									args: {
										value: { $state: '/insight/dashboard/inventoryValue' },
									},
								} as any,
								description: 'Total cost value on hand',
							},
							{
								title: 'Locations',
								value: {
									$computed: 'formatNumber',
									args: {
										value: { $state: '/insight/dashboard/locationCount' },
									},
								} as any,
								description: 'Active warehouses & stores',
							},
							{
								title: 'Turnover Rate',
								value: {
									$template: '${/insight/dashboard/turnoverRate}x',
								} as any,
								description: {
									$cond: {
										$state: '/insight/dashboard/turnoverImproving',
									},
									$then: 'Improving vs prior period',
									$else: 'Below target rate',
								} as any,
							},
							{
								title: 'Forecast Accuracy',
								value: {
									$computed: 'formatPercent',
									args: {
										part: { $state: '/insight/dashboard/forecastAccurate' },
										total: { $state: '/insight/dashboard/forecastTotal' },
									},
								} as any,
								description: 'Last 90 days',
							},
						],
					},
					children: [],
				},
				dashboard: {
					type: 'InsightDashboard',
					props: {},
					children: [],
				},
			},
		},
	},

	'/insight/item-ledger': {
		layout: 'app',
		metadata: {
			title: 'Item Ledger',
			description: 'Inventory movement entries by item and location.',
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
					children: ['locationFilter', 'entryTypeFilter', 'resetBtn'],
				},
				locationFilter: {
					type: 'Select',
					props: {
						label: 'Location',
						name: 'location',
						options: ['ALL'],
						value: { $bindState: '/filters/insight/locationFilter' } as any,
					},
					children: [],
				},
				entryTypeFilter: {
					type: 'Select',
					props: {
						label: 'Entry Type',
						name: 'entryType',
						options: [
							'ALL',
							'PURCHASE',
							'SALE',
							'POSITIVE_ADJ',
							'NEGATIVE_ADJ',
							'TRANSFER',
						],
						value: { $bindState: '/filters/insight/entryTypeFilter' } as any,
					},
					children: [],
				},
				resetBtn: {
					type: 'Button',
					props: {
						label: 'Reset',
						variant: 'secondary' as any,
					},
					on: {
						press: {
							action: 'setState',
							params: {
								statePath: '/filters/insight',
								value: { locationFilter: 'ALL', entryTypeFilter: 'ALL' },
							},
						},
					},
					visible: {
						$or: [
							{ $state: '/filters/insight/locationFilter', neq: 'ALL' },
							{ $state: '/filters/insight/entryTypeFilter', neq: 'ALL' },
						],
					} as any,
					children: [],
				},
				list: {
					type: 'ModuleListView',
					props: {
						moduleId: 'insight',
						entityId: 'itemLedger',
						title: 'Item Ledger',
						description: 'Inventory movement entries by item and location.',
						_filters: {
							locationId: '/filters/insight/locationFilter',
							entryType: '/filters/insight/entryTypeFilter',
						},
						columns: [
							{ accessorKey: 'entryNo', title: 'Entry No.' },
							{ accessorKey: 'itemNo', title: 'Item No.' },
							{
								accessorKey: 'entryType',
								title: 'Entry Type',
								cellVariant: 'select',
							},
							{ accessorKey: 'locationId', title: 'Location' },
							{
								accessorKey: 'quantity',
								title: 'Quantity',
								cellVariant: 'number',
							},
							{
								accessorKey: 'costAmount',
								title: 'Cost Amount',
								cellVariant: 'number',
							},
							{
								accessorKey: 'postingDate',
								title: 'Posting Date',
								cellVariant: 'date',
							},
						],
						enableNew: false,
					},
					children: [],
				},
			},
		},
	},

	'/insight/locations': {
		layout: 'app',
		metadata: {
			title: 'Locations',
			description: 'Warehouse and store locations with inventory levels.',
		},
		page: {
			root: 'view',
			elements: {
				view: {
					type: 'ModuleListView',
					props: {
						moduleId: 'insight',
						entityId: 'locations',
						title: 'Locations',
						description: 'Warehouse and store locations with inventory levels.',
						columns: [
							{ accessorKey: 'locationCode', title: 'Location Code' },
							{ accessorKey: 'name', title: 'Name' },
							{ accessorKey: 'address', title: 'Address' },
							{
								accessorKey: 'locationType',
								title: 'Type',
								cellVariant: 'select',
							},
							{
								accessorKey: 'itemCount',
								title: 'Items',
								cellVariant: 'number',
							},
							{
								accessorKey: 'totalValue',
								title: 'Total Value',
								cellVariant: 'number',
							},
						],
						enableNew: true,
						newLabel: 'New Location',
						_cardTitle: 'Location {code}',
						_cardNewTitle: 'New Location',
						_cardDescription:
							'Warehouse or store location with address and inventory levels.',
						_cardSections: [
							{
								title: 'General',
								fields: [
									{
										name: 'code',
										label: 'Location Code',
										type: 'text',
										readOnly: true,
									},
									{ name: 'name', label: 'Name', type: 'text' },
									{
										name: 'locationType',
										label: 'Type',
										type: 'select',
										options: [
											{ label: 'Warehouse', value: 'WAREHOUSE' },
											{ label: 'Store', value: 'STORE' },
											{
												label: 'Distribution Center',
												value: 'DISTRIBUTION_CENTER',
											},
										],
									},
								],
							},
							{
								title: 'Address',
								fields: [
									{
										name: 'address',
										label: 'Address',
										type: 'text',
										colSpan: 2,
									},
									{ name: 'city', label: 'City', type: 'text' },
									{ name: 'country', label: 'Country', type: 'text' },
								],
							},
							{
								title: 'Status',
								fields: [{ name: 'active', label: 'Active', type: 'switch' }],
							},
						] as any,
					},
					children: [],
				},
			},
		},
	},

	'/insight/value-entries': {
		layout: 'app',
		metadata: {
			title: 'Value Entries',
			description: 'Cost and value adjustments for inventory items.',
		},
		page: {
			root: 'view',
			elements: {
				view: {
					type: 'ModuleListView',
					props: {
						moduleId: 'insight',
						entityId: 'valueEntries',
						title: 'Value Entries',
						description: 'Cost and value adjustments for inventory items.',
						columns: [
							{ accessorKey: 'entryNo', title: 'Entry No.' },
							{ accessorKey: 'itemNo', title: 'Item No.' },
							{
								accessorKey: 'entryType',
								title: 'Entry Type',
								cellVariant: 'select',
							},
							{
								accessorKey: 'costAmount',
								title: 'Cost Amount',
								cellVariant: 'number',
							},
							{
								accessorKey: 'salesAmount',
								title: 'Sales Amount',
								cellVariant: 'number',
							},
							{
								accessorKey: 'postingDate',
								title: 'Posting Date',
								cellVariant: 'date',
							},
						],
						enableNew: false,
					},
					children: [],
				},
			},
		},
	},

	'/insight/forecast-workbench': {
		layout: 'app',
		metadata: {
			title: 'Forecast Workbench',
			description: 'Demand forecasting and trend analysis tools.',
		},
		page: {
			root: 'view',
			elements: {
				view: {
					type: 'ForecastWorkbench',
					props: {
						title: 'Forecast Workbench & Alerting',
						description:
							'Run demand signals, segment risk posture, and tune alert subscriptions for Insight.',
					},
					children: [],
				},
			},
		},
	},
}
