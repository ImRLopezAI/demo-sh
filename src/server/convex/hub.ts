import * as z from 'zod'
import {
	NOTIFICATION_SEVERITY,
	NOTIFICATION_STATUS,
	TASK_PRIORITY,
	TASK_STATUS,
} from './utils/enums'
import { zodTable } from './utils/helper'

export const operationTasks = zodTable('operationTasks', (_zid) => ({
	taskNo: z.string(),
	moduleId: z.string(),
	title: z.string(),
	description: z.string().optional(),
	status: z.enum(TASK_STATUS).default('OPEN'),
	priority: z.enum(TASK_PRIORITY).default('MEDIUM'),
	assigneeUserId: z.string().optional(),
	dueDate: z.string().optional(),
	slaTargetAt: z.string().optional(),
	slaStatus: z.enum(['ON_TRACK', 'AT_RISK', 'BREACHED']).optional(),
	slaBreachedAt: z.string().optional(),
	slaLastEvaluatedAt: z.string().optional(),
	escalationLevel: z.enum(['NONE', 'L1', 'L2']).optional(),
	statusReason: z.string().optional(),
	statusUpdatedAt: z.number().optional(),
}))

export const moduleNotifications = zodTable('moduleNotifications', (_zid) => ({
	moduleId: z.string(),
	title: z.string(),
	body: z.string().optional(),
	status: z.enum(NOTIFICATION_STATUS).default('UNREAD'),
	severity: z.enum(NOTIFICATION_SEVERITY).default('INFO'),
	targetUserId: z.string().optional(),
}))
