/**
 * Payroll module route specs.
 * HR & Compensation: dashboard, employees, employee ledger, payroll journal,
 * G/L entries, bank ledger, adjustments & off-cycle.
 *
 * Uses json-render features:
 * - $computed for currency/number formatting in KPI cards
 * - $template for dynamic text
 * - $bindState for employment status and department filters
 * - $cond for conditional descriptions
 * - visibility for filter reset and alert banners
 */
import type { NextAppSpec } from '@json-render/next'

type Routes = NonNullable<NextAppSpec['routes']>

export const payrollRoutes: Routes = {
	'/payroll/dashboard': {
		layout: 'app',
		metadata: {
			title: 'Payroll Dashboard',
			description: 'Compensation summary, headcount, and payroll run history.',
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
						title: 'Payroll',
						description: {
							$template:
								'Compensation overview — ${/payroll/dashboard/activeEmployees} active employees',
						} as any,
					},
					children: [],
				},
				kpis: {
					type: 'KpiCards',
					props: {
						items: [
							{
								title: 'Monthly Payroll',
								value: {
									$computed: 'formatCompactCurrency',
									args: {
										value: { $state: '/payroll/dashboard/monthlyPayroll' },
									},
								} as any,
								description: {
									$template:
										'${/payroll/dashboard/payrollDelta}% vs last month',
								} as any,
							},
							{
								title: 'Headcount',
								value: {
									$computed: 'formatNumber',
									args: { value: { $state: '/payroll/dashboard/headcount' } },
								} as any,
								description: {
									$cond: {
										$state: '/payroll/dashboard/newHires',
									},
									$then: {
										$template: '${/payroll/dashboard/newHires} new this month',
									},
									$else: 'No new hires this month',
								} as any,
							},
							{
								title: 'Avg Salary',
								value: {
									$computed: 'formatCurrency',
									args: { value: { $state: '/payroll/dashboard/avgSalary' } },
								} as any,
								description: 'Mean base compensation',
							},
							{
								title: 'Next Run',
								value: {
									$computed: 'formatDate',
									args: { value: { $state: '/payroll/dashboard/nextRunDate' } },
								} as any,
								description: {
									$template:
										'${/payroll/dashboard/pendingAdjustments} pending adjustments',
								} as any,
							},
						],
					},
					children: [],
				},
				dashboard: {
					type: 'PayrollDashboard',
					props: {},
					children: [],
				},
			},
		},
	},

	'/payroll/employees': {
		layout: 'app',
		metadata: {
			title: 'Employees',
			description: 'Employee profiles, contracts, and compensation setup.',
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
					children: ['statusFilter', 'deptFilter', 'resetBtn'],
				},
				statusFilter: {
					type: 'Select',
					props: {
						label: 'Status',
						name: 'employmentStatus',
						options: ['ALL', 'ACTIVE', 'ON_LEAVE', 'TERMINATED'],
						value: {
							$bindState: '/filters/payroll/employmentStatusFilter',
						} as any,
					},
					children: [],
				},
				deptFilter: {
					type: 'Select',
					props: {
						label: 'Department',
						name: 'department',
						options: [
							'ALL',
							'Engineering',
							'Sales',
							'Marketing',
							'Operations',
							'Finance',
							'HR',
						],
						value: { $bindState: '/filters/payroll/departmentFilter' } as any,
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
								statePath: '/filters/payroll',
								value: {
									employmentStatusFilter: 'ALL',
									departmentFilter: 'ALL',
								},
							},
						},
					},
					visible: {
						$or: [
							{ $state: '/filters/payroll/employmentStatusFilter', neq: 'ALL' },
							{ $state: '/filters/payroll/departmentFilter', neq: 'ALL' },
						],
					} as any,
					children: [],
				},
				list: {
					type: 'ModuleListView',
					props: {
						moduleId: 'payroll',
						entityId: 'employees',
						title: 'Employees',
						description:
							'Employee profiles, contracts, and compensation setup.',
						_filters: {
							status: '/filters/payroll/employmentStatusFilter',
							department: '/filters/payroll/departmentFilter',
						},
						columns: [
							{ accessorKey: 'employeeNo', title: 'Employee No.' },
							{ accessorKey: 'firstName', title: 'First Name' },
							{ accessorKey: 'lastName', title: 'Last Name' },
							{ accessorKey: 'department', title: 'Department' },
							{ accessorKey: 'jobTitle', title: 'Job Title' },
							{
								accessorKey: 'employmentStatus',
								title: 'Status',
								cellVariant: 'select',
							},
							{
								accessorKey: 'hireDate',
								title: 'Hire Date',
								cellVariant: 'date',
							},
							{
								accessorKey: 'baseSalary',
								title: 'Base Salary',
								cellVariant: 'number',
							},
						],
						bulkActions: [
							{
								id: 'onLeave',
								label: 'Set On Leave',
								toStatus: 'ON_LEAVE',
								requireAllStatus: 'ACTIVE',
							},
							{
								id: 'reactivate',
								label: 'Reactivate',
								toStatus: 'ACTIVE',
								requireAllStatus: 'ON_LEAVE',
							},
							{
								id: 'terminate',
								label: 'Terminate',
								toStatus: 'TERMINATED',
								requireAllStatus: 'ACTIVE,ON_LEAVE',
								variant: 'destructive',
							},
						],
						enableNew: true,
						newLabel: 'New Employee',
						_cardTitle: 'Employee {employeeNo}',
						_cardNewTitle: 'New Employee',
						_cardDescription:
							'Employee profile with personal details, employment info, and compensation setup.',
						_cardSections: [
							{
								title: 'General',
								fields: [
									{
										name: 'employeeNo',
										label: 'Employee No.',
										type: 'text',
										readOnly: true,
									},
									{ name: 'firstName', label: 'First Name', type: 'text' },
									{ name: 'lastName', label: 'Last Name', type: 'text' },
									{ name: 'email', label: 'Email', type: 'email' },
									{ name: 'phone', label: 'Phone', type: 'tel' },
								],
							},
							{
								title: 'Employment',
								fields: [
									{ name: 'department', label: 'Department', type: 'text' },
									{ name: 'jobTitle', label: 'Job Title', type: 'text' },
									{
										name: 'employmentType',
										label: 'Employment Type',
										type: 'select',
										options: [
											{ label: 'Full Time', value: 'FULL_TIME' },
											{ label: 'Part Time', value: 'PART_TIME' },
											{ label: 'Contractor', value: 'CONTRACTOR' },
											{ label: 'Temporary', value: 'TEMPORARY' },
										],
									},
									{
										name: 'status',
										label: 'Status',
										type: 'select',
										options: [
											{ label: 'Active', value: 'ACTIVE' },
											{ label: 'On Leave', value: 'ON_LEAVE' },
											{ label: 'Terminated', value: 'TERMINATED' },
										],
									},
								],
							},
							{
								title: 'Compensation',
								fields: [
									{ name: 'hireDate', label: 'Hire Date', type: 'date' },
									{ name: 'baseSalary', label: 'Base Salary', type: 'number' },
									{
										name: 'payFrequency',
										label: 'Pay Frequency',
										type: 'select',
										options: [
											{ label: 'Weekly', value: 'WEEKLY' },
											{ label: 'Biweekly', value: 'BIWEEKLY' },
											{ label: 'Semi-Monthly', value: 'SEMI_MONTHLY' },
											{ label: 'Monthly', value: 'MONTHLY' },
										],
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

	'/payroll/employee-ledger': {
		layout: 'app',
		metadata: {
			title: 'Employee Ledger',
			description: 'Employee ledger entries and payment history.',
		},
		page: {
			root: 'view',
			elements: {
				view: {
					type: 'ModuleListView',
					props: {
						moduleId: 'payroll',
						entityId: 'employeeLedger',
						title: 'Employee Ledger',
						description: 'Employee ledger entries and payment history.',
						columns: [
							{ accessorKey: 'entryNo', title: 'Entry No.' },
							{ accessorKey: 'employeeNo', title: 'Employee No.' },
							{ accessorKey: 'employeeName', title: 'Employee' },
							{
								accessorKey: 'entryType',
								title: 'Type',
								cellVariant: 'select',
							},
							{
								accessorKey: 'postingDate',
								title: 'Posting Date',
								cellVariant: 'date',
							},
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

	'/payroll/payroll-journal': {
		layout: 'app',
		metadata: {
			title: 'Payroll Journal',
			description: 'Payroll run processing and posting.',
		},
		page: {
			root: 'view',
			elements: {
				view: {
					type: 'PayrollJournal',
					props: {
						title: 'Payroll Journal',
						description:
							'Review payroll journal entries and execute payroll cycles.',
					},
					children: [],
				},
			},
		},
	},

	'/payroll/gl-entries': {
		layout: 'app',
		metadata: {
			title: 'G/L Entries',
			description: 'General ledger entries from payroll operations.',
		},
		page: {
			root: 'view',
			elements: {
				view: {
					type: 'ModuleListView',
					props: {
						moduleId: 'payroll',
						entityId: 'glEntries',
						title: 'G/L Entries',
						description: 'General ledger entries from payroll operations.',
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

	'/payroll/bank-ledger': {
		layout: 'app',
		metadata: {
			title: 'Bank Ledger',
			description: 'Bank entries from payroll disbursements.',
		},
		page: {
			root: 'view',
			elements: {
				view: {
					type: 'ModuleListView',
					props: {
						moduleId: 'payroll',
						entityId: 'bankLedger',
						title: 'Bank Ledger',
						description: 'Bank entries from payroll disbursements.',
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

	'/payroll/adjustments-offcycle': {
		layout: 'app',
		metadata: {
			title: 'Adjustments & Off-cycle',
			description: 'Payroll adjustments, corrections, and off-cycle payments.',
		},
		page: {
			root: 'view',
			elements: {
				view: {
					type: 'AdjustmentsOffcycle',
					props: {
						title: 'Adjustments & Off-cycle Operations',
						description:
							'Build retro/off-cycle payroll runs, apply controlled corrections, and publish statutory artifacts.',
					},
					children: [],
				},
			},
		},
	},
}
