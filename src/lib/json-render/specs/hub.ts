/**
 * Hub module route specs.
 * Central operations: dashboard, tasks, notifications, reporting, order fulfillment.
 *
 * Demonstrates full json-render feature set:
 * - $state / $bindState for reactive UI
 * - $template for dynamic text interpolation
 * - $computed for formatted values
 * - $cond for conditional prop values
 * - visibility conditions for show/hide
 * - on action bindings for interactions
 * - watch for state-driven side effects
 */
import type { NextAppSpec } from '@json-render/next'

type Routes = NonNullable<NextAppSpec['routes']>

export const hubRoutes: Routes = {
	'/hub/dashboard': {
		layout: 'app',
		metadata: {
			title: 'Hub Dashboard',
			description:
				'Central operations command view with task flow and notification health.',
		},
		page: {
			root: 'page',
			elements: {
				page: {
					type: 'Stack',
					props: { direction: 'vertical', gap: '6' },
					children: ['header', 'kpis', 'mainGrid'],
				},
				header: {
					type: 'PageHeader',
					props: {
						title: 'Hub Command Center',
						description: {
							$template: 'Operations overview — ${/hub/dashboard/lastRefresh}',
						} as any,
					},
					children: [],
				},
				kpis: {
					type: 'KpiCards',
					props: {
						items: [
							{
								title: 'Open Tasks',
								value: {
									$computed: 'formatNumber',
									args: { value: { $state: '/hub/dashboard/openTasks' } },
								} as any,
								description: {
									$template: '${/hub/dashboard/tasksDelta} vs last week',
								} as any,
							},
							{
								title: 'SLA Compliance',
								value: {
									$computed: 'formatPercent',
									args: {
										part: { $state: '/hub/dashboard/slaOnTime' },
										total: { $state: '/hub/dashboard/slaTotal' },
									},
								} as any,
								description: 'On-time completion rate',
							},
							{
								title: 'Active Modules',
								value: {
									$computed: 'formatNumber',
									args: {
										value: { $state: '/hub/dashboard/activeModules' },
									},
								} as any,
								description: 'Modules with activity today',
							},
							{
								title: 'Unread Alerts',
								value: {
									$computed: 'formatNumber',
									args: {
										value: { $state: '/hub/dashboard/unreadAlerts' },
									},
								} as any,
								description: {
									$cond: {
										$state: '/hub/dashboard/criticalAlerts',
									},
									$then: {
										$template: '${/hub/dashboard/criticalAlerts} critical',
									},
									$else: 'All clear',
								} as any,
							},
						],
					},
					children: [],
				},
				mainGrid: {
					type: 'SectionGrid',
					props: { columns: 2 },
					children: ['taskPanel', 'notificationPanel'],
				},
				taskPanel: {
					type: 'StatsPanel',
					props: {
						title: 'Task Distribution',
						description: 'By status across all modules',
						items: [
							{
								label: 'Open',
								value: {
									$computed: 'formatNumber',
									args: {
										value: {
											$state: '/hub/dashboard/tasksByStatus/open',
										},
									},
								} as any,
							},
							{
								label: 'In Progress',
								value: {
									$computed: 'formatNumber',
									args: {
										value: {
											$state: '/hub/dashboard/tasksByStatus/inProgress',
										},
									},
								} as any,
							},
							{
								label: 'Blocked',
								value: {
									$computed: 'formatNumber',
									args: {
										value: {
											$state: '/hub/dashboard/tasksByStatus/blocked',
										},
									},
								} as any,
							},
							{
								label: 'Done (7d)',
								value: {
									$computed: 'formatNumber',
									args: {
										value: {
											$state: '/hub/dashboard/tasksByStatus/done',
										},
									},
								} as any,
							},
						],
					},
					children: [],
				},
				notificationPanel: {
					type: 'StatsPanel',
					props: {
						title: 'Notification Health',
						description: 'Alert severity breakdown',
						items: [
							{
								label: 'Critical',
								value: {
									$computed: 'formatNumber',
									args: {
										value: {
											$state: '/hub/dashboard/alertsBySeverity/critical',
										},
									},
								} as any,
							},
							{
								label: 'Warning',
								value: {
									$computed: 'formatNumber',
									args: {
										value: {
											$state: '/hub/dashboard/alertsBySeverity/warning',
										},
									},
								} as any,
							},
							{
								label: 'Info',
								value: {
									$computed: 'formatNumber',
									args: {
										value: {
											$state: '/hub/dashboard/alertsBySeverity/info',
										},
									},
								} as any,
							},
							{
								label: 'Resolved (24h)',
								value: {
									$computed: 'formatNumber',
									args: {
										value: {
											$state: '/hub/dashboard/alertsBySeverity/resolved',
										},
									},
								} as any,
							},
						],
					},
					children: [],
				},
			},
		},
	},

	'/hub/tasks': {
		layout: 'app',
		metadata: {
			title: 'Operation Tasks',
			description: 'Manage cross-module operation tasks and SLA tracking.',
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
					children: ['statusFilter', 'priorityFilter', 'resetBtn'],
				},
				statusFilter: {
					type: 'Select',
					props: {
						label: 'Status',
						name: 'taskStatusFilter',
						options: ['ALL', 'OPEN', 'IN_PROGRESS', 'DONE', 'BLOCKED'],
						value: {
							$bindState: '/filters/hub/taskStatusFilter',
						} as any,
					},
					children: [],
				},
				priorityFilter: {
					type: 'Select',
					props: {
						label: 'Priority',
						name: 'taskPriorityFilter',
						options: ['ALL', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
						value: {
							$bindState: '/filters/hub/taskPriorityFilter',
						} as any,
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
								statePath: '/filters/hub',
								value: {
									taskStatusFilter: 'ALL',
									taskPriorityFilter: 'ALL',
								},
							},
						},
					},
					visible: {
						$or: [
							{
								$state: '/filters/hub/taskStatusFilter',
								neq: 'ALL',
							},
							{
								$state: '/filters/hub/taskPriorityFilter',
								neq: 'ALL',
							},
						],
					} as any,
					children: [],
				},
				list: {
					type: 'ModuleListView',
					props: {
						moduleId: 'hub',
						entityId: 'operationTasks',
						title: 'Operation Tasks',
						description:
							'Manage cross-module operation tasks and SLA tracking.',
						_filters: {
							status: '/filters/hub/taskStatusFilter',
							priority: '/filters/hub/taskPriorityFilter',
						},
						columns: [
							{ accessorKey: 'taskNo', title: 'Task No.' },
							{ accessorKey: 'title', title: 'Title' },
							{ accessorKey: 'moduleId', title: 'Module' },
							{
								accessorKey: 'status',
								title: 'Status',
								cellVariant: 'select',
							},
							{
								accessorKey: 'priority',
								title: 'Priority',
								cellVariant: 'select',
							},
							{ accessorKey: 'assigneeUserId', title: 'Assignee' },
							{
								accessorKey: 'dueDate',
								title: 'Due Date',
								cellVariant: 'date',
							},
							{
								accessorKey: 'slaStatus',
								title: 'SLA',
								cellVariant: 'select',
							},
						],
						bulkActions: [
							{
								id: 'start',
								label: 'Start',
								toStatus: 'IN_PROGRESS',
								requireAllStatus: 'OPEN',
							},
							{
								id: 'complete',
								label: 'Complete',
								toStatus: 'DONE',
								requireAllStatus: 'IN_PROGRESS',
							},
							{
								id: 'block',
								label: 'Block',
								toStatus: 'BLOCKED',
								requireAllStatus: 'OPEN,IN_PROGRESS',
								variant: 'destructive',
							},
							{
								id: 'reopen',
								label: 'Reopen',
								toStatus: 'OPEN',
								requireAllStatus: 'BLOCKED,DONE',
							},
						],
						enableNew: true,
						newLabel: 'New Task',
						_cardTitle: 'Task {taskNo}',
						_cardNewTitle: 'New Task',
						_cardDescription:
							'Cross-module operation task with SLA tracking and escalation.',
						_cardSections: [
							{
								title: 'General',
								fields: [
									{
										name: 'taskNo',
										label: 'Task No.',
										type: 'text',
										readOnly: true,
									},
									{ name: 'title', label: 'Title', type: 'text' },
									{ name: 'moduleId', label: 'Module', type: 'text' },
									{ name: 'assigneeUserId', label: 'Assignee', type: 'text' },
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
											{ label: 'Open', value: 'OPEN' },
											{ label: 'In Progress', value: 'IN_PROGRESS' },
											{ label: 'Blocked', value: 'BLOCKED' },
											{ label: 'Done', value: 'DONE' },
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
											{ label: 'Critical', value: 'CRITICAL' },
										],
									},
								],
							},
							{
								title: 'Scheduling',
								fields: [
									{ name: 'dueDate', label: 'Due Date', type: 'date' },
									{
										name: 'slaStatus',
										label: 'SLA Status',
										type: 'select',
										options: [
											{ label: 'On Track', value: 'ON_TRACK' },
											{ label: 'At Risk', value: 'AT_RISK' },
											{ label: 'Breached', value: 'BREACHED' },
										],
									},
									{
										name: 'escalationLevel',
										label: 'Escalation Level',
										type: 'select',
										options: [
											{ label: 'None', value: 'NONE' },
											{ label: 'L1', value: 'L1' },
											{ label: 'L2', value: 'L2' },
											{ label: 'L3', value: 'L3' },
										],
									},
								],
							},
						] as any,
					},
					watch: {
						'/filters/hub/taskStatusFilter': {
							action: 'setState',
							params: {
								statePath: '/hub/tasks/activeFilter',
								value: { $state: '/filters/hub/taskStatusFilter' },
							},
						},
					} as any,
					children: [],
				},
			},
		},
	},

	'/hub/notifications': {
		layout: 'app',
		metadata: {
			title: 'Notifications',
			description: 'Module alerts and system notifications.',
		},
		page: {
			root: 'page',
			elements: {
				page: {
					type: 'Stack',
					props: { direction: 'vertical', gap: '4' },
					children: ['alertBanner', 'list'],
				},
				alertBanner: {
					type: 'Alert',
					props: {
						title: {
							$template:
								'${/hub/notifications/criticalCount} critical alerts require attention',
						} as any,
						message: 'Review and acknowledge critical notifications below.',
						type: 'error' as any,
					},
					visible: { $state: '/hub/notifications/criticalCount' } as any,
					children: [],
				},
				list: {
					type: 'ModuleListView',
					props: {
						moduleId: 'hub',
						entityId: 'notifications',
						title: 'Notifications',
						description: 'Module alerts and system notifications.',
						columns: [
							{ accessorKey: 'title', title: 'Title' },
							{ accessorKey: 'moduleId', title: 'Module' },
							{
								accessorKey: 'severity',
								title: 'Severity',
								cellVariant: 'select',
							},
							{
								accessorKey: 'status',
								title: 'Status',
								cellVariant: 'select',
							},
							{ accessorKey: 'body', title: 'Body' },
						],
						enableNew: false,
					},
					children: [],
				},
			},
		},
	},

	'/hub/reporting': {
		layout: 'app',
		metadata: {
			title: 'Reporting Center',
			description: 'Design and generate operational reports.',
		},
		page: {
			root: 'view',
			elements: {
				view: {
					type: 'ReportingCenter',
					props: {
						title: 'Reporting Center',
						description: 'Design and generate operational reports.',
					},
					children: [],
				},
			},
		},
	},

	'/hub/order-fulfillment': {
		layout: 'app',
		metadata: {
			title: 'Order Fulfillment',
			description: 'Track and manage order pick, pack, and ship workflows.',
		},
		page: {
			root: 'view',
			elements: {
				view: {
					type: 'OrderFulfillment',
					props: {
						title: 'Order Fulfillment Control Room',
						description:
							'Start, resume, and inspect cross-module fulfillment runs with SLA policy controls.',
					},
					children: [],
				},
			},
		},
	},
}
