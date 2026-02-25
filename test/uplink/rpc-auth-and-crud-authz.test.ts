import { db } from '@server/db'
import { createRpcContext } from '@server/rpc/init'
import { beforeEach, describe, expect, test } from 'vitest'
import { createCaller } from './helpers'

describe('rpc identity and CRUD authz', () => {
	beforeEach(async () => {
		await db._internals.reset()
	})

	test('rejects unverified client identity headers', async () => {
		await expect(
			createRpcContext({
				headers: new Headers({
					'x-tenant-id': 'spoof-tenant',
					'x-user-id': 'spoof-user',
					'x-user-role': 'ADMIN',
				}),
			}),
		).rejects.toMatchObject({
			code: 'UNAUTHORIZED',
		})
	})

	test('accepts trusted explicit auth context', async () => {
		const context = await createRpcContext({
			headers: new Headers(),
			auth: {
				tenantId: 'demo-tenant',
				userId: 'trusted-user',
				role: 'MANAGER',
			},
		})

		expect(context.auth.tenantId).toBe('demo-tenant')
		expect(context.auth.userId).toBe('trusted-user')
		expect(context.auth.role).toBe('MANAGER')
	})

	test('blocks viewer writes across CRUD operations with FORBIDDEN', async () => {
		const viewerCaller = createCaller({ role: 'VIEWER', userId: 'viewer-user' })
		const existingCustomer = db.schemas.customers.toArray()[0]
		expect(existingCustomer?._id).toBeDefined()
		if (!existingCustomer?._id) {
			throw new Error('Missing customer seed data')
		}

		await expect(
			viewerCaller.market.customers.create({
				customerNo: '',
				name: 'Denied Customer',
			}),
		).rejects.toMatchObject({ code: 'FORBIDDEN' })

		await expect(
			viewerCaller.market.customers.update({
				id: existingCustomer._id,
				data: { name: 'Denied Update' },
			}),
		).rejects.toMatchObject({ code: 'FORBIDDEN' })

		await expect(
			viewerCaller.market.customers.delete({
				id: existingCustomer._id,
			}),
		).rejects.toMatchObject({ code: 'FORBIDDEN' })
	})

	test('permits write workflows for authorized roles', async () => {
		const agentCaller = createCaller({ role: 'AGENT', userId: 'agent-user' })
		const managerCaller = createCaller({
			role: 'MANAGER',
			userId: 'manager-user',
		})

		const created = await agentCaller.market.customers.create({
			customerNo: '',
			name: 'Authorized Customer',
		})
		expect(created._id).toBeTruthy()

		const updated = await agentCaller.market.customers.update({
			id: created._id,
			data: { name: 'Authorized Customer Updated' },
		})
		expect(updated?.name).toBe('Authorized Customer Updated')

		const deleted = await managerCaller.market.customers.delete({
			id: created._id,
		})
		expect(deleted.deleted).toBe(true)
	})
})
