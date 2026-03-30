/**
 * POS module route specs.
 * Point of Sale: dashboard, transactions, terminals, sessions, terminal view, shift controls.
 *
 * Uses json-render features:
 * - $computed for number/currency formatting
 * - $template for dynamic text
 * - $bindState for terminal and session filters
 * - $cond for conditional offline terminal warnings
 * - visibility for filter reset and alert banners
 */
import type { NextAppSpec } from '@json-render/next'

type Routes = NonNullable<NextAppSpec['routes']>

export const posRoutes: Routes = {
	'/pos/dashboard': {
		layout: 'app',
		metadata: {
			title: 'POS Dashboard',
			description: 'Terminal status, payment methods, and transaction metrics.',
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
					type: 'PosDashboardData',
					props: {},
					children: [
						'header',
						'kpis',
						'paymentMethodDistribution',
						'transactionStatusDistribution',
						'transactionVolumeTrend',
						'lowerGrid',
					],
				},
				header: {
					type: 'PageHeader',
					props: {
						title: 'POS Dashboard',
						description:
							'Terminal status, payment methods, and transaction metrics.',
					},
					children: [],
				},
				kpis: {
					type: 'PosKpiStrip',
					props: {},
					children: [],
				},
				paymentMethodDistribution: {
					type: 'PosPaymentMethodDistribution',
					props: {},
					children: [],
				},
				transactionStatusDistribution: {
					type: 'PosTransactionStatusDistribution',
					props: {},
					children: [],
				},
				transactionVolumeTrend: {
					type: 'PosTransactionVolumeTrend',
					props: {},
					children: [],
				},
				lowerGrid: {
					type: 'DashboardThreeColumnGrid',
					props: {},
					children: ['operationalStats', 'recentTransactions', 'terminalSummary'],
				},
				operationalStats: {
					type: 'PosOperationalStats',
					props: {},
					children: [],
				},
				recentTransactions: {
					type: 'PosRecentTransactions',
					props: {},
					children: [],
				},
				terminalSummary: {
					type: 'PosTerminalSummary',
					props: {},
					children: [],
				},
			},
		},
	},

	'/pos/transactions': {
		layout: 'app',
		metadata: {
			title: 'Transactions',
			description: 'POS transaction history and receipts.',
		},
		page: {
			root: 'view',
			elements: {
				view: {
					type: 'ModuleListView',
					props: {
						moduleId: 'pos',
						entityId: 'transactions',
						title: 'Transactions',
						description: 'POS transaction history and receipts.',
						columns: [
							{ accessorKey: 'transactionNo', title: 'Transaction No.' },
							{ accessorKey: 'terminalId', title: 'Terminal' },
							{ accessorKey: 'sessionId', title: 'Session' },
							{ accessorKey: 'status', title: 'Status', cellVariant: 'select' },
							{
								accessorKey: 'paymentMethod',
								title: 'Payment',
								cellVariant: 'select',
							},
							{
								accessorKey: 'totalAmount',
								title: 'Total',
								cellVariant: 'number',
							},
							{
								accessorKey: 'transactionDate',
								title: 'Date',
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

	'/pos/terminals': {
		layout: 'app',
		metadata: {
			title: 'Terminals',
			description: 'POS terminal registration and status.',
		},
		page: {
			root: 'view',
			elements: {
				view: {
					type: 'ModuleListView',
					props: {
						moduleId: 'pos',
						entityId: 'terminals',
						title: 'Terminals',
						description: 'POS terminal registration and status.',
						columns: [
							{ accessorKey: 'terminalCode', title: 'Terminal Code' },
							{ accessorKey: 'name', title: 'Name' },
							{ accessorKey: 'locationId', title: 'Location' },
							{ accessorKey: 'status', title: 'Status', cellVariant: 'select' },
							{
								accessorKey: 'lastActiveAt',
								title: 'Last Active',
								cellVariant: 'date',
							},
						],
						enableNew: true,
						newLabel: 'New Terminal',
						_cardTitle: 'Terminal {terminalId}',
						_cardNewTitle: 'New Terminal',
						_cardDescription: 'POS terminal configuration and status details.',
						_cardSections: [
							{
								title: 'General',
								fields: [
									{
										name: 'terminalId',
										label: 'Terminal ID',
										type: 'text',
										readOnly: true,
									},
									{ name: 'name', label: 'Name', type: 'text' },
									{
										name: 'locationCode',
										label: 'Location Code',
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
											{ label: 'Online', value: 'ONLINE' },
											{ label: 'Offline', value: 'OFFLINE' },
											{ label: 'Maintenance', value: 'MAINTENANCE' },
										],
									},
								],
							},
							{
								title: 'Configuration',
								fields: [
									{
										name: 'sessionCount',
										label: 'Session Count',
										type: 'number',
										readOnly: true,
									},
									{
										name: 'lastHeartbeat',
										label: 'Last Heartbeat',
										type: 'date',
										readOnly: true,
									},
								],
							},
						] as any,
					},
					children: [],
				},
			},
		},
	},

	'/pos/sessions': {
		layout: 'app',
		metadata: {
			title: 'Sessions',
			description: 'POS operator sessions and shift history.',
		},
		page: {
			root: 'view',
			elements: {
				view: {
					type: 'ModuleListView',
					props: {
						moduleId: 'pos',
						entityId: 'sessions',
						title: 'Sessions',
						description: 'POS operator sessions and shift history.',
						columns: [
							{ accessorKey: 'sessionCode', title: 'Session Code' },
							{ accessorKey: 'terminalId', title: 'Terminal' },
							{ accessorKey: 'operatorId', title: 'Operator' },
							{ accessorKey: 'status', title: 'Status', cellVariant: 'select' },
							{ accessorKey: 'openedAt', title: 'Opened', cellVariant: 'date' },
							{ accessorKey: 'closedAt', title: 'Closed', cellVariant: 'date' },
							{
								accessorKey: 'totalSales',
								title: 'Total Sales',
								cellVariant: 'number',
							},
						],
						enableNew: false,
					},
					children: [],
				},
			},
		},
	},

	'/pos/terminal': {
		layout: 'app',
		metadata: {
			title: 'Terminal',
			description: 'POS checkout terminal.',
		},
		page: {
			root: 'view',
			elements: {
				view: {
					type: 'PosTerminalView',
					props: {
						title: 'POS Terminal',
						description: 'POS checkout terminal.',
					},
					children: [],
				},
			},
		},
	},

	'/pos/shift-controls': {
		layout: 'app',
		metadata: {
			title: 'Shift Controls',
			description: 'Manage shift opening, closing, and cash declarations.',
		},
		page: {
			root: 'view',
			elements: {
				view: {
					type: 'ShiftControls',
					props: {
						title: 'Shift Controls & Refund Governance',
						description:
							'Close shifts with policy checks, govern refund/void actions, and monitor terminal health with replay safety.',
					},
					children: [],
				},
			},
		},
	},
}
