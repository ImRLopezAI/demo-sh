import type { RpcContextType } from '@server/rpc/init'

export const AUTH_ROLES = ['VIEWER', 'AGENT', 'MANAGER', 'ADMIN'] as const
export type AuthRole = (typeof AUTH_ROLES)[number]

const ROLE_RANK: Record<AuthRole, number> = {
	VIEWER: 1,
	AGENT: 2,
	MANAGER: 3,
	ADMIN: 4,
} as const

export function normalizeRole(role: string | null | undefined): AuthRole {
	const normalizedRole = role?.trim().toUpperCase()
	if (!normalizedRole) return 'VIEWER'
	if (normalizedRole in ROLE_RANK) {
		return normalizedRole as AuthRole
	}
	return 'VIEWER'
}

export function getAuthRole(context: RpcContextType): AuthRole {
	return normalizeRole(context.auth.role)
}

export function assertRole(
	context: RpcContextType,
	minRole: AuthRole,
	actionLabel: string,
) {
	const role = getAuthRole(context)
	if (ROLE_RANK[role] < ROLE_RANK[minRole]) {
		throw new Error(
			`Role "${minRole}" or higher is required for ${actionLabel}`,
		)
	}
}

export type AuditLogStatus = 'SUCCESS' | 'DENIED' | 'FAILED'

export interface AuditLogInput {
	moduleId: string
	action: string
	entityType: string
	entityId?: string
	status?: AuditLogStatus
	message?: string
	before?: unknown
	after?: unknown
	correlationId?: string
	source?: string
}

export interface PermissionCheckOptions {
	fallbackRole?: AuthRole
	actionLabel?: string
	moduleId?: string
	entityType?: string
	entityId?: string
	logSuccess?: boolean
}

const readTenantId = (row: unknown) =>
	(row as { tenantId?: string }).tenantId ?? 'demo-tenant'

const toJson = (value: unknown) => {
	if (value === undefined) return undefined
	try {
		return JSON.stringify(value)
	} catch {
		return JSON.stringify({ serialization: 'failed' })
	}
}

const findHubUserByExternalId = (
	context: RpcContextType,
	externalUserId: string,
) =>
	context.db.schemas.hubUsers.findMany({
		where: (row) =>
			readTenantId(row) === context.auth.tenantId &&
			row.userId === externalUserId,
		limit: 1,
	})[0]

export function listEffectivePermissionCodes(
	context: RpcContextType,
	externalUserId = context.auth.userId,
) {
	const hubUser = findHubUserByExternalId(context, externalUserId)
	if (!hubUser?._id) return [] as string[]

	const roleAssignments = context.db.schemas.hubUserRoles.findMany({
		where: (row) =>
			readTenantId(row) === context.auth.tenantId &&
			row.hubUserId === hubUser._id &&
			row.active !== false,
	})
	if (roleAssignments.length === 0) return [] as string[]

	const roleIdSet = new Set(
		roleAssignments.map((assignment) => assignment.roleId),
	)
	const rolePermissions = context.db.schemas.hubRolePermissions.findMany({
		where: (row) =>
			readTenantId(row) === context.auth.tenantId && roleIdSet.has(row.roleId),
	})
	if (rolePermissions.length === 0) return [] as string[]

	const permissionIdSet = new Set(
		rolePermissions.map((assignment) => assignment.permissionId),
	)
	const permissions = context.db.schemas.hubPermissions.findMany({
		where: (row) =>
			readTenantId(row) === context.auth.tenantId &&
			permissionIdSet.has(row._id) &&
			Boolean(row.permissionCode),
	})

	return Array.from(
		new Set(permissions.map((permission) => permission.permissionCode)),
	)
}

export function hasPermission(
	context: RpcContextType,
	permissionCode: string,
	externalUserId = context.auth.userId,
) {
	const normalized = permissionCode.trim().toLowerCase()
	if (!normalized) return false
	return listEffectivePermissionCodes(context, externalUserId).some(
		(code) => code.trim().toLowerCase() === normalized,
	)
}

export function appendAuditLog(context: RpcContextType, input: AuditLogInput) {
	const auditTable = (context.db.schemas as Record<string, unknown>)
		.hubAuditLogs as
		| {
				insert: (data: Record<string, unknown>) => unknown
		  }
		| undefined
	if (!auditTable) return

	try {
		auditTable.insert({
			auditNo: '',
			actorUserId: context.auth.userId,
			actorRole: getAuthRole(context),
			moduleId: input.moduleId,
			action: input.action,
			entityType: input.entityType,
			entityId: input.entityId,
			status: input.status ?? 'SUCCESS',
			message: input.message,
			beforeJson: toJson(input.before),
			afterJson: toJson(input.after),
			correlationId: input.correlationId,
			occurredAt: new Date().toISOString(),
			source: input.source ?? 'RPC',
		})
	} catch {
		// Audit must never break business flow.
	}
}

export function assertPermission(
	context: RpcContextType,
	permissionCode: string,
	options: PermissionCheckOptions = {},
) {
	const normalizedPermissionCode = permissionCode.trim()
	if (!normalizedPermissionCode) {
		throw new Error('Permission code is required')
	}

	if (hasPermission(context, normalizedPermissionCode)) {
		if (options.logSuccess) {
			appendAuditLog(context, {
				moduleId:
					options.moduleId ?? normalizedPermissionCode.split('.')[0] ?? 'hub',
				action: normalizedPermissionCode,
				entityType: options.entityType ?? 'permission',
				entityId: options.entityId,
				status: 'SUCCESS',
				message: `Permission granted via persisted RBAC: ${normalizedPermissionCode}`,
			})
		}
		return
	}

	if (options.fallbackRole) {
		try {
			assertRole(
				context,
				options.fallbackRole,
				options.actionLabel ?? `permission "${normalizedPermissionCode}"`,
			)
			if (options.logSuccess) {
				appendAuditLog(context, {
					moduleId:
						options.moduleId ?? normalizedPermissionCode.split('.')[0] ?? 'hub',
					action: normalizedPermissionCode,
					entityType: options.entityType ?? 'permission',
					entityId: options.entityId,
					status: 'SUCCESS',
					message: `Permission granted via fallback role ${options.fallbackRole}`,
				})
			}
			return
		} catch (error) {
			appendAuditLog(context, {
				moduleId:
					options.moduleId ?? normalizedPermissionCode.split('.')[0] ?? 'hub',
				action: normalizedPermissionCode,
				entityType: options.entityType ?? 'permission',
				entityId: options.entityId,
				status: 'DENIED',
				message:
					error instanceof Error
						? error.message
						: `Permission denied: ${normalizedPermissionCode}`,
			})
			throw error
		}
	}

	appendAuditLog(context, {
		moduleId:
			options.moduleId ?? normalizedPermissionCode.split('.')[0] ?? 'hub',
		action: normalizedPermissionCode,
		entityType: options.entityType ?? 'permission',
		entityId: options.entityId,
		status: 'DENIED',
		message: `Permission "${normalizedPermissionCode}" is required`,
	})
	throw new Error(`Permission "${normalizedPermissionCode}" is required`)
}
