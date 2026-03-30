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
			root: 'dashboard',
			elements: {
				dashboard: {
					type: 'DashboardPageStack',
					props: {},
					children: ['provider'],
				},
				provider: {
					type: 'InsightDashboardData',
					props: {},
					children: ['header', 'kpis', 'distribution', 'trend', 'lowerGrid'],
				},
				header: {
					type: 'PageHeader',
					props: {
						title: 'Insight Dashboard',
						description:
							'Inventory movement, cost-to-sales visibility, and location health.',
					},
					children: [],
				},
				kpis: {
					type: 'InsightKpiStrip',
					props: {},
					children: [],
				},
				distribution: {
					type: 'InsightEntryTypeDistribution',
					props: {},
					children: [],
				},
				trend: {
					type: 'InsightMovementTrend',
					props: {},
					children: [],
				},
				lowerGrid: {
					type: 'DashboardThreeColumnGrid',
					props: {},
					children: ['stats', 'recentEntries', 'locations'],
				},
				stats: {
					type: 'InsightInventoryStats',
					props: {},
					children: [],
				},
				recentEntries: {
					type: 'InsightRecentEntries',
					props: {},
					children: [],
				},
				locations: {
					type: 'InsightLocationSummary',
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
			root: 'view',
			elements: {
				view: {
					type: 'ModuleListView',
					props: {
						moduleId: 'insight',
						entityId: 'itemLedger',
						title: 'Item Ledger',
						description: 'Inventory movement entries by item and location.',
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
						],
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
