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
			root: 'page',
			elements: {
				page: {
					type: 'Stack',
					props: { direction: 'vertical', gap: '6' },
					children: ['header', 'offlineAlert', 'kpis', 'dashboard'],
				},
				header: {
					type: 'PageHeader',
					props: {
						title: 'Point of Sale',
						description: {
							$template: '${/pos/dashboard/activeTerminals} active terminals',
						} as any,
						actionLabel: 'Open Terminal',
					},
					on: {
						press: {
							action: 'navigate',
							params: { href: '/pos/terminal' },
						},
					} as any,
					children: [],
				},
				offlineAlert: {
					type: 'Alert',
					props: {
						title: {
							$template: '${/pos/dashboard/offlineTerminals} terminals offline',
						} as any,
						message:
							'Offline terminals may have pending transactions that need syncing.',
						type: 'warning' as any,
					},
					visible: { $state: '/pos/dashboard/offlineTerminals' } as any,
					children: [],
				},
				kpis: {
					type: 'KpiCards',
					props: {
						items: [
							{
								title: 'Sales Today',
								value: {
									$computed: 'formatCompactCurrency',
									args: { value: { $state: '/pos/dashboard/salesToday' } },
								} as any,
								description: {
									$template: '${/pos/dashboard/transactionCount} transactions',
								} as any,
							},
							{
								title: 'Avg Transaction',
								value: {
									$computed: 'formatCurrency',
									args: { value: { $state: '/pos/dashboard/avgTransaction' } },
								} as any,
							},
							{
								title: 'Open Sessions',
								value: {
									$computed: 'formatNumber',
									args: { value: { $state: '/pos/dashboard/openSessions' } },
								} as any,
								description: {
									$cond: {
										$state: '/pos/dashboard/staleSessions',
									},
									$then: {
										$template: '${/pos/dashboard/staleSessions} need attention',
									},
									$else: 'All sessions healthy',
								} as any,
							},
							{
								title: 'Payment Mix',
								value: {
									$template: '${/pos/dashboard/topPaymentMethod}',
								} as any,
								description: {
									$computed: 'formatPercent',
									args: {
										part: { $state: '/pos/dashboard/topPaymentPct' },
										total: 100,
									},
								} as any,
							},
						],
					},
					children: [],
				},
				dashboard: {
					type: 'PosDashboard',
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
					children: ['terminalFilter', 'sessionFilter', 'resetBtn'],
				},
				terminalFilter: {
					type: 'Select',
					props: {
						label: 'Terminal',
						name: 'terminal',
						options: ['ALL'],
						value: { $bindState: '/filters/pos/terminalFilter' } as any,
					},
					children: [],
				},
				sessionFilter: {
					type: 'Select',
					props: {
						label: 'Session',
						name: 'session',
						options: ['ALL'],
						value: { $bindState: '/filters/pos/sessionFilter' } as any,
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
								statePath: '/filters/pos',
								value: { terminalFilter: 'ALL', sessionFilter: 'ALL' },
							},
						},
					},
					visible: {
						$or: [
							{ $state: '/filters/pos/terminalFilter', neq: 'ALL' },
							{ $state: '/filters/pos/sessionFilter', neq: 'ALL' },
						],
					} as any,
					children: [],
				},
				list: {
					type: 'ModuleListView',
					props: {
						moduleId: 'pos',
						entityId: 'transactions',
						title: 'Transactions',
						description: 'POS transaction history and receipts.',
						_filters: {
							terminalId: '/filters/pos/terminalFilter',
							sessionId: '/filters/pos/sessionFilter',
						},
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
