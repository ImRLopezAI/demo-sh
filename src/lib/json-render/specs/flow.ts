/**
 * Flow module route specs.
 * Banking: dashboard, bank accounts, bank ledger, payment journal, G/L entries, reconciliation.
 *
 * Uses json-render features:
 * - $computed for currency/number formatting
 * - $template for dynamic text
 * - $bindState for account/doc type filters
 * - $cond for conditional descriptions
 * - visibility for filter reset button
 */
import type { NextAppSpec } from '@json-render/next'

type Routes = NonNullable<NextAppSpec['routes']>

export const flowRoutes: Routes = {
	'/flow/dashboard': {
		layout: 'app',
		metadata: {
			title: 'Flow Dashboard',
			description:
				'Cash forecast, projected balance, and bank account overview.',
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
						title: 'Cash Flow',
						description: {
							$template:
								'Treasury overview — ${/flow/dashboard/accountCount} connected accounts',
						} as any,
					},
					children: [],
				},
				kpis: {
					type: 'KpiCards',
					props: {
						items: [
							{
								title: 'Total Balance',
								value: {
									$computed: 'formatCompactCurrency',
									args: {
										value: { $state: '/flow/dashboard/totalBalance' },
									},
								} as any,
								description: 'Across all accounts',
							},
							{
								title: 'Projected (30d)',
								value: {
									$computed: 'formatCompactCurrency',
									args: {
										value: { $state: '/flow/dashboard/projected30d' },
									},
								} as any,
								description: {
									$cond: {
										$state: '/flow/dashboard/projectedNegative',
									},
									$then: 'Cash shortfall projected',
									$else: 'Positive outlook',
								} as any,
							},
							{
								title: 'Pending Payments',
								value: {
									$computed: 'formatCompactCurrency',
									args: {
										value: { $state: '/flow/dashboard/pendingPayments' },
									},
								} as any,
								description: {
									$template:
										'${/flow/dashboard/pendingPaymentCount} payments queued',
								} as any,
							},
							{
								title: 'Unreconciled',
								value: {
									$computed: 'formatNumber',
									args: {
										value: { $state: '/flow/dashboard/unreconciledCount' },
									},
								} as any,
								description: 'Entries awaiting reconciliation',
							},
						],
					},
					children: [],
				},
				dashboard: {
					type: 'FlowDashboard',
					props: {},
					children: [],
				},
			},
		},
	},

	'/flow/bank-accounts': {
		layout: 'app',
		metadata: {
			title: 'Bank Accounts',
			description: 'Connected bank accounts and current balances.',
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
					children: ['accountFilter', 'resetBtn'],
				},
				accountFilter: {
					type: 'Select',
					props: {
						label: 'Account Status',
						name: 'accountStatus',
						options: ['ALL', 'ACTIVE', 'INACTIVE', 'BLOCKED'],
						value: { $bindState: '/filters/flow/accountFilter' } as any,
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
								statePath: '/filters/flow/accountFilter',
								value: 'ALL',
							},
						},
					},
					visible: {
						$state: '/filters/flow/accountFilter',
						neq: 'ALL',
					} as any,
					children: [],
				},
				list: {
					type: 'ModuleListView',
					props: {
						moduleId: 'flow',
						entityId: 'bankAccounts',
						title: 'Bank Accounts',
						description: 'Connected bank accounts and current balances.',
						_filters: {
							status: '/filters/flow/accountFilter',
						},
						columns: [
							{ accessorKey: 'accountNo', title: 'Account No.' },
							{ accessorKey: 'name', title: 'Name' },
							{ accessorKey: 'bankName', title: 'Bank' },
							{ accessorKey: 'currency', title: 'Currency' },
							{
								accessorKey: 'balance',
								title: 'Balance',
								cellVariant: 'number',
							},
							{
								accessorKey: 'lastStatementDate',
								title: 'Last Statement',
								cellVariant: 'date',
							},
							{ accessorKey: 'status', title: 'Status', cellVariant: 'select' },
						],
						enableNew: true,
						newLabel: 'New Account',
						_cardTitle: 'Bank Account {accountNo}',
						_cardNewTitle: 'New Bank Account',
						_cardDescription:
							'Bank account with connection details, currency, and current balance.',
						_cardSections: [
							{
								title: 'General',
								fields: [
									{
										name: 'accountNo',
										label: 'Account No.',
										type: 'text',
										readOnly: true,
									},
									{ name: 'name', label: 'Name', type: 'text' },
									{ name: 'bankName', label: 'Bank Name', type: 'text' },
								],
							},
							{
								title: 'Details',
								fields: [
									{
										name: 'currency',
										label: 'Currency',
										type: 'select',
										options: [
											{ label: 'USD', value: 'USD' },
											{ label: 'EUR', value: 'EUR' },
											{ label: 'GBP', value: 'GBP' },
											{ label: 'MXN', value: 'MXN' },
											{ label: 'CAD', value: 'CAD' },
										],
									},
									{ name: 'iban', label: 'IBAN', type: 'text' },
									{ name: 'swiftCode', label: 'SWIFT Code', type: 'text' },
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
											{ label: 'Active', value: 'ACTIVE' },
											{ label: 'Inactive', value: 'INACTIVE' },
											{ label: 'Blocked', value: 'BLOCKED' },
										],
									},
									{
										name: 'balance',
										label: 'Balance',
										type: 'number',
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

	'/flow/bank-ledger': {
		layout: 'app',
		metadata: {
			title: 'Bank Ledger',
			description: 'Bank account ledger entries and transaction history.',
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
					children: ['docTypeFilter', 'resetBtn'],
				},
				docTypeFilter: {
					type: 'Select',
					props: {
						label: 'Document Type',
						name: 'docType',
						options: ['ALL', 'PAYMENT', 'REFUND', 'TRANSFER', 'FEE'],
						value: { $bindState: '/filters/flow/docTypeFilter' } as any,
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
								statePath: '/filters/flow/docTypeFilter',
								value: 'ALL',
							},
						},
					},
					visible: {
						$state: '/filters/flow/docTypeFilter',
						neq: 'ALL',
					} as any,
					children: [],
				},
				list: {
					type: 'ModuleListView',
					props: {
						moduleId: 'flow',
						entityId: 'bankLedger',
						title: 'Bank Ledger',
						description: 'Bank account ledger entries and transaction history.',
						_filters: {
							documentType: '/filters/flow/docTypeFilter',
						},
						columns: [
							{ accessorKey: 'entryNo', title: 'Entry No.' },
							{ accessorKey: 'bankAccountNo', title: 'Account' },
							{
								accessorKey: 'postingDate',
								title: 'Posting Date',
								cellVariant: 'date',
							},
							{
								accessorKey: 'documentType',
								title: 'Doc Type',
								cellVariant: 'select',
							},
							{ accessorKey: 'documentNo', title: 'Doc No.' },
							{ accessorKey: 'amount', title: 'Amount', cellVariant: 'number' },
							{
								accessorKey: 'remainingAmount',
								title: 'Remaining',
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

	'/flow/payment-journal': {
		layout: 'app',
		metadata: {
			title: 'Payment Journal',
			description: 'Vendor payments, refunds, and disbursement processing.',
		},
		page: {
			root: 'view',
			elements: {
				view: {
					type: 'PaymentJournal',
					props: {
						title: 'Payment Journal',
						description:
							'Create and manage payment journal entries for posting.',
					},
					children: [],
				},
			},
		},
	},

	'/flow/gl-entries': {
		layout: 'app',
		metadata: {
			title: 'G/L Entries',
			description: 'General ledger entries from banking operations.',
		},
		page: {
			root: 'view',
			elements: {
				view: {
					type: 'ModuleListView',
					props: {
						moduleId: 'flow',
						entityId: 'glEntries',
						title: 'G/L Entries',
						description: 'General ledger entries from banking operations.',
						columns: [
							{ accessorKey: 'entryNo', title: 'Entry No.' },
							{ accessorKey: 'accountNo', title: 'Account No.' },
							{ accessorKey: 'accountName', title: 'Account' },
							{
								accessorKey: 'postingDate',
								title: 'Posting Date',
								cellVariant: 'date',
							},
							{
								accessorKey: 'documentType',
								title: 'Doc Type',
								cellVariant: 'select',
							},
							{ accessorKey: 'documentNo', title: 'Doc No.' },
							{
								accessorKey: 'debitAmount',
								title: 'Debit',
								cellVariant: 'number',
							},
							{
								accessorKey: 'creditAmount',
								title: 'Credit',
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

	'/flow/reconciliation-approvals': {
		layout: 'app',
		metadata: {
			title: 'Reconciliation & Approvals',
			description:
				'Bank reconciliation matching and payment approval workflows.',
		},
		page: {
			root: 'view',
			elements: {
				view: {
					type: 'ReconciliationApprovals',
					props: {
						title: 'Reconciliation, Approvals & Scenario Planner',
						description:
							'Operate reconciliation transitions, enforce maker-checker workflow, and compare cash scenarios.',
					},
					children: [],
				},
			},
		},
	},
}
