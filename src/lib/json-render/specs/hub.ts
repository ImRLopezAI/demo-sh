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
			root: 'dashboard',
			elements: {
				dashboard: {
					type: 'DashboardPageStack',
					props: {},
					children: ['provider'],
				},
				provider: {
					type: 'HubDashboardData',
					props: {},
					children: [
						'header',
						'kpis',
						'taskStatusDistribution',
						'taskStatusChart',
						'taskVolumeTrend',
						'lowerGrid',
					],
				},
				header: {
					type: 'PageHeader',
					props: {
						title: 'Hub Dashboard',
						description:
							'Central operations command view with task flow and notification health.',
					},
					children: [],
				},
				kpis: {
					type: 'HubKpiStrip',
					props: {},
					children: [],
				},
				taskStatusDistribution: {
					type: 'HubTaskStatusDistribution',
					props: {},
					children: [],
				},
				taskStatusChart: {
					type: 'HubTaskStatusChart',
					props: {},
					children: [],
				},
				taskVolumeTrend: {
					type: 'HubTaskVolumeTrend',
					props: {},
					children: [],
				},
				lowerGrid: {
					type: 'DashboardThreeColumnGrid',
					props: {},
					children: ['stats', 'recentTasks', 'recentNotifications'],
				},
				stats: {
					type: 'HubStats',
					props: {},
					children: [],
				},
				recentTasks: {
					type: 'HubRecentTasks',
					props: {},
					children: [],
				},
				recentNotifications: {
					type: 'HubRecentNotifications',
					props: {},
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
			root: 'view',
			elements: {
				view: {
					type: 'ModuleListView',
					props: {
						moduleId: 'hub',
						entityId: 'operationTasks',
						title: 'Operation Tasks',
						description:
							'Manage cross-module operation tasks and SLA tracking.',
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
					props: { direction: 'vertical', gap: '4', align: 'stretch' },
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
