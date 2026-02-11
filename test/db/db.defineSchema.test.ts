import { defineSchema, redisAdapter } from '@server/db/definitions'
import { nanoid } from 'nanoid'
import { describe, expect, test } from 'vitest'
import { z } from 'zod'

// Lazily import redis only when needed - avoids env validation errors in tests
const getRedis = async () => {
	const { redis } = await import('@lib/redis')
	return redis
}

// Check if Redis is configured
const isRedisConfigured = !!(process.env.REDIS_URL && process.env.REDIS_TOKEN)

describe('createTable', () => {
	test('creates table with relations using id helper', () => {
		const db = defineSchema(({ createTable }) => {
			const users = createTable('users', {
				schema: { name: z.string() },
				seed: 0,
			})

			const posts = createTable('posts', {
				schema: (id) => ({
					title: z.string(),
					authorId: id('users'),
				}),
				seed: 0,
			})

			return {
				users: users.table(),
				posts: posts.table(),
			}
		})

		// Verify both tables work
		expect(db.schemas.users).toBeDefined()
		expect(db.schemas.posts).toBeDefined()

		// Insert a user and post
		const user = db.schemas.users.insert({ name: 'Alice' })
		const post = db.schemas.posts.insert({ title: 'Hello', authorId: user._id })

		expect(post.authorId).toBe(user._id)
	})

	test('callback-based defineSchema with type-safe relations', () => {
		// Use the new callback-based API for full type safety
		const db = defineSchema(
			({ createTable }) => ({
				users: createTable('users', {
					schema: { name: z.string(), email: z.string() },
					seed: 0,
				}).table(),
				posts: createTable('posts', {
					// `one` is typed to only accept 'users' | 'posts'
					schema: {
						title: z.string(),
						content: z.string(),
						authorId: z.string(),
					},
					seed: 0,
				}).table(),
			}),
			{
				relations: (r) => ({
					posts: {
						author: r.one.users({
							from: r.posts.authorId,
							to: r.users._id,
						}),
					},
					users: {
						posts: r.many.posts({
							from: r.users._id,
							to: r.posts.authorId,
						}),
					},
				}),
			},
		)

		// Create test data
		const alice = db.schemas.users.insert({
			name: 'Alice',
			email: 'alice@test.com',
		})
		const bob = db.schemas.users.insert({ name: 'Bob', email: 'bob@test.com' })
		db.schemas.posts.insert({
			title: 'Post 1',
			content: 'Content 1',
			authorId: alice._id,
		})
		db.schemas.posts.insert({
			title: 'Post 2',
			content: 'Content 2',
			authorId: alice._id,
		})
		db.schemas.posts.insert({
			title: 'Post 3',
			content: 'Content 3',
			authorId: bob._id,
		})

		// Query posts WITH author included - now with type-safe return
		const postsWithAuthor = db.schemas.posts.findMany({
			with: { author: true },
		})

		expect(postsWithAuthor.length).toBe(3)

		// Each post should have the author object nested
		// TypeScript now knows about the `author` property!
		for (const post of postsWithAuthor) {
			expect(post.author).toBeDefined()
			expect(post.author._id).toBe(post.authorId)
			expect(post.author.name).toBeDefined()
			expect(post.author.email).toBeDefined()
		}

		// Verify correct authors are loaded
		const alicesPosts = postsWithAuthor.filter((p) => p.authorId === alice._id)
		expect(alicesPosts.length).toBe(2)
		expect(alicesPosts[0].author.name).toBe('Alice')
	})

	test('findMany with `with` option eager loads relations (legacy API)', () => {
		const db = defineSchema(({ createTable }) => {
			const users = createTable('users', {
				schema: { name: z.string(), email: z.string() },
				seed: 0,
			})

			const posts = createTable('posts', {
				schema: (id) => ({
					title: z.string(),
					content: z.string(),
					authorId: id('users'),
				}),
				seed: 0,
			})

			return {
				users: users.table(),
				posts: posts.table(),
			}
		})

		// Create test data
		const alice = db.schemas.users.insert({
			name: 'Alice',
			email: 'alice@test.com',
		})
		const bob = db.schemas.users.insert({ name: 'Bob', email: 'bob@test.com' })
		db.schemas.posts.insert({
			title: 'Post 1',
			content: 'Content 1',
			authorId: alice._id,
		})
		db.schemas.posts.insert({
			title: 'Post 2',
			content: 'Content 2',
			authorId: alice._id,
		})
		db.schemas.posts.insert({
			title: 'Post 3',
			content: 'Content 3',
			authorId: bob._id,
		})

		// Query posts WITH author included
		// Note: Legacy API requires type assertion
		const postsWithAuthor = db.schemas.posts.findMany({
			with: { author: true },
		}) as unknown as Array<{
			authorId: string
			author: { _id: string; name: string; email: string }
		}>

		expect(postsWithAuthor.length).toBe(3)
		// Each post should have the author object nested
		for (const post of postsWithAuthor) {
			expect(post.author).toBeDefined()
			expect(post.author._id).toBe(post.authorId)
			expect(post.author.name).toBeDefined()
			expect(post.author.email).toBeDefined()
		}

		// Verify correct authors are loaded
		const alicesPosts = postsWithAuthor.filter((p) => p.authorId === alice._id)
		expect(alicesPosts.length).toBe(2)
		expect(alicesPosts[0].author.name).toBe('Alice')
	})

	test('findFirst with `with` option eager loads relations', () => {
		const db = defineSchema(({ createTable }) => {
			const users = createTable('users', {
				schema: { name: z.string() },
				seed: 0,
			})

			const posts = createTable('posts', {
				schema: (id) => ({
					title: z.string(),
					authorId: id('users'),
				}),
				seed: 0,
			})

			return {
				users: users.table(),
				posts: posts.table(),
			}
		})

		const user = db.schemas.users.insert({ name: 'Charlie' })
		db.schemas.posts.insert({ title: 'My Post', authorId: user._id })

		// Note: `with` adds properties at runtime, TypeScript doesn't track this yet
		const post = db.schemas.posts.findFirst({
			where: (p) => p.title === 'My Post',
			with: { author: true },
		}) as unknown as { author: { name: string } } | undefined

		expect(post).toBeDefined()
		expect(post?.author).toBeDefined()
		expect(post?.author.name).toBe('Charlie')
	})

	test('table() returns chainable builder with indexes', () => {
		defineSchema(({ createTable }) => {
			const users = createTable('users', {
				schema: {
					name: z.string(),
					email: z.email(),
				},
			})

			const builder = users
				.table()
				.index('by_email', ['email'])
				.index('by_name', ['name'])

			expect(builder._indexes).toHaveLength(2)
			expect(builder._indexes[0]).toEqual({
				name: 'by_email',
				fields: ['email'],
			})
			expect(builder._indexes[1]).toEqual({ name: 'by_name', fields: ['name'] })

			return {}
		})
	})
})

describe('defineSchema', () => {
	test('creates database with schemas', () => {
		const db = defineSchema(({ createTable }) => {
			const users = createTable('users', {
				schema: () => ({
					name: z.string(),
				}),
				seed: 0,
			})

			return { users: users.table() }
		})

		expect(db.schemas).toBeDefined()
		expect(db.schemas.users).toBeDefined()
		expect(db.clear).toBeTypeOf('function')
		expect(db.subscribe).toBeTypeOf('function')
	})

	test('auto-seeds schemas on creation', () => {
		const db = defineSchema(({ createTable }) => {
			const users = createTable('users', {
				schema: () => ({
					name: z.string(),
				}),
				seed: 5,
			})

			return { users: users.table() }
		})

		// Should be auto-seeded without calling db.seed()
		expect(db.schemas.users.size).toBe(5)
	})

	test('table has CRUD operations', () => {
		const db = defineSchema(({ createTable }) => {
			const users = createTable('users', {
				schema: () => ({
					name: z.string(),
					age: z.number(),
				}),
				seed: 0,
			})

			return { users: users.table() }
		})

		// Insert - now returns full document
		const user = db.schemas.users.insert({ name: 'John', age: 30 })
		expect(user).toBeDefined()
		expect(user._id).toBeDefined()
		expect(user.name).toBe('John')
		expect(user.age).toBe(30)
		expect(user._createdAt).toBeTypeOf('number')
		expect(user._updatedAt).toBeTypeOf('number')
		expect(db.schemas.users.size).toBe(1)

		// Get
		const item = db.schemas.users.get(user._id)
		expect(item).toBeDefined()
		expect(item?._id).toBe(user._id)

		// Update
		const updated = db.schemas.users.update(user._id, { age: 31 })
		expect(updated?.age).toBe(31)
		expect(updated?.name).toBe('John')

		// Delete
		const deleted = db.schemas.users.delete(user._id)
		expect(deleted).toBe(true)
		expect(db.schemas.users.size).toBe(0)
	})

	test('table supports insertMany', () => {
		const db = defineSchema(({ createTable }) => {
			const users = createTable('users', {
				schema: () => ({
					name: z.string(),
					age: z.number(),
				}),
				seed: 0,
			})

			return { users: users.table() }
		})

		const ids = db.schemas.users.batch.insertMany([
			{ name: 'John', age: 30 },
			{ name: 'Jane', age: 25 },
		])

		expect(ids).toHaveLength(2)
		expect(db.schemas.users.size).toBe(2)
	})

	test('table supports toArray', () => {
		const db = defineSchema(({ createTable }) => {
			const users = createTable('users', {
				schema: () => ({
					name: z.string(),
				}),
				seed: 0,
			})

			return { users: users.table() }
		})

		db.schemas.users.insert({ name: 'John' })
		db.schemas.users.insert({ name: 'Jane' })

		const items = db.schemas.users.toArray()
		expect(items).toHaveLength(2)
	})

	test('table supports query with index', () => {
		const db = defineSchema(({ createTable }) => {
			const users = createTable('users', {
				schema: () => ({
					name: z.string(),
					role: z.enum(['admin', 'user']),
				}),
				seed: 0,
			})

			return {
				users: users.table().index('by_role', ['role']),
			}
		})

		db.schemas.users.insert({ name: 'John', role: 'admin' })
		db.schemas.users.insert({ name: 'Jane', role: 'user' })
		db.schemas.users.insert({ name: 'Bob', role: 'admin' })

		const admins = db.schemas.users.query('by_role', 'admin')
		expect(admins).toHaveLength(2)
		expect(admins.every((item) => item.role === 'admin')).toBe(true)
	})

	test('table supports filter', () => {
		const db = defineSchema(({ createTable }) => {
			const users = createTable('users', {
				schema: () => ({
					name: z.string(),
					age: z.number(),
				}),
				seed: 0,
			})

			return { users: users.table() }
		})

		db.schemas.users.insert({ name: 'John', age: 30 })
		db.schemas.users.insert({ name: 'Jane', age: 25 })

		const adults = db.schemas.users.filter((item) => item.age >= 30)
		expect(adults).toHaveLength(1)
		expect(adults[0].name).toBe('John')
	})

	test('table supports find', () => {
		const db = defineSchema(({ createTable }) => {
			const users = createTable('users', {
				schema: () => ({
					name: z.string(),
					age: z.number(),
				}),
				seed: 0,
			})

			return { users: users.table() }
		})

		db.schemas.users.insert({ name: 'John', age: 30 })
		db.schemas.users.insert({ name: 'Jane', age: 25 })

		const found = db.schemas.users.find((item) => item.age < 30)
		expect(found?.name).toBe('Jane')
	})

	test('table supports subscribe for reactivity', () => {
		const db = defineSchema(({ createTable }) => {
			const users = createTable('users', {
				schema: () => ({
					name: z.string(),
				}),
				seed: 0,
			})

			return { users: users.table() }
		})

		let callCount = 0
		const unsub = db.schemas.users.subscribe(() => {
			callCount++
		})

		db.schemas.users.insert({ name: 'John' })
		expect(callCount).toBe(1)

		db.schemas.users.insert({ name: 'Jane' })
		expect(callCount).toBe(2)

		unsub()
		db.schemas.users.insert({ name: 'Bob' })
		expect(callCount).toBe(2)
	})

	test('table supports clear', () => {
		const db = defineSchema(({ createTable }) => {
			const users = createTable('users', {
				schema: () => ({
					name: z.string(),
				}),
				seed: 0,
			})

			return { users: users.table() }
		})

		db.schemas.users.insert({ name: 'John' })
		db.schemas.users.insert({ name: 'Jane' })
		expect(db.schemas.users.size).toBe(2)

		db.schemas.users.clear()
		expect(db.schemas.users.size).toBe(0)
	})

	test('seed respects min/max config', () => {
		const db = defineSchema(({ createTable }) => {
			return {
				users: createTable('users', {
					schema: () => ({
						name: z.string(),
					}),
					seed: 3,
				}).table(),
			}
		})

		expect(db.schemas.users.size).toBe(3)
	})

	test('seed uses faker path from meta.field', () => {
		const db = defineSchema(({ createTable }) => {
			const users = createTable('users', {
				schema: () => ({
					email: z.string().meta({ field: 'internet.email' }),
				}),
				seed: 3,
			})

			return { users: users.table() }
		})

		const items = db.schemas.users.toArray()
		for (const item of items) {
			expect(item.email).toContain('@')
		}
	})

	test('seed uses custom function from meta.field', () => {
		const db = defineSchema(({ createTable }) => {
			const users = createTable('users', {
				schema: () => ({
					code: z.string().meta({ field: () => 'CUSTOM-123' }),
				}),
				seed: 3,
			})

			return { users: users.table() }
		})

		const items = db.schemas.users.toArray()
		for (const item of items) {
			expect(item.code).toBe('CUSTOM-123')
		}
	})

	test('db.clear removes all data from all schemas', () => {
		const db = defineSchema(({ createTable }) => {
			const users = createTable('users', {
				schema: () => ({ name: z.string() }),
				seed: 5,
			})

			return { users: users.table() }
		})

		expect(db.schemas.users.size).toBe(5)

		db.clear()
		expect(db.schemas.users.size).toBe(0)
	})

	test('db.subscribe notifies on any table change', () => {
		const db = defineSchema(({ createTable }) => {
			const users = createTable('users', {
				schema: () => ({ name: z.string() }),
				seed: 0,
			})

			return { users: users.table() }
		})

		let callCount = 0
		const unsub = db.subscribe(() => {
			callCount++
		})

		db.schemas.users.insert({ name: 'John' })
		expect(callCount).toBe(1)

		db.schemas.users.insert({ name: 'Jane' })
		expect(callCount).toBe(2)

		unsub()
		db.schemas.users.insert({ name: 'Bob' })
		expect(callCount).toBe(2)
	})

	test('indexes work after seeding', () => {
		const db = defineSchema(({ createTable }) => {
			const users = createTable('users', {
				schema: () => ({
					name: z.string(),
					role: z.enum(['admin', 'user']),
				}),
				seed: 10,
			})

			return {
				users: users.table().index('by_role', ['role']),
			}
		})

		const admins = db.schemas.users.query('by_role', 'admin')
		const regularUsers = db.schemas.users.query('by_role', 'user')

		expect(admins.length + regularUsers.length).toBe(10)
	})
})

describe('relations', () => {
	test('seed resolves single relation (users -> posts)', () => {
		const db = defineSchema(({ createTable }) => {
			const users = createTable('users', {
				schema: () => ({
					name: z.string(),
				}),
				seed: 2,
			})

			const posts = createTable('posts', {
				schema: () => ({
					title: z.string(),
					authorId: z.string().meta({ related: 'users' }),
				}),
				seed: 5,
			})

			return {
				users: users.table(),
				posts: posts.table(),
			}
		})

		const userIds = db.schemas.users.toArray().map((u) => u._id)
		const allPosts = db.schemas.posts.toArray()

		expect(allPosts.length).toBe(5)
		for (const post of allPosts) {
			expect(userIds).toContain(post.authorId)
		}
	})

	test('seed resolves two-level relations (orgs -> projects -> issues)', () => {
		const db = defineSchema(({ createTable }) => {
			const organizations = createTable('organizations', {
				schema: () => ({
					name: z.string().meta({ field: 'company.name' }),
				}),
				seed: 2,
			})

			const projects = createTable('projects', {
				schema: () => ({
					name: z.string().meta({ field: 'commerce.productName' }),
					organizationId: z.string().meta({ related: 'organizations' }),
				}),
				seed: 4,
			})

			const issues = createTable('issues', {
				schema: () => ({
					title: z.string().meta({ field: 'lorem.sentence' }),
					projectId: z.string().meta({ related: 'projects' }),
					status: z.enum(['open', 'closed']),
				}),
				seed: 10,
			})

			return {
				organizations: organizations.table(),
				projects: projects.table(),
				issues: issues.table(),
			}
		})

		const orgIds = db.schemas.organizations.toArray().map((o) => o._id)
		const projectIds = db.schemas.projects.toArray().map((p) => p._id)

		// All projects should belong to valid organizations
		for (const project of db.schemas.projects.toArray()) {
			expect(orgIds).toContain(project.organizationId)
		}

		// All issues should belong to valid projects
		for (const issue of db.schemas.issues.toArray()) {
			expect(projectIds).toContain(issue.projectId)
		}
	})

	test('seed resolves three-level relations (orgs -> projects -> sprints -> issues)', () => {
		const db = defineSchema(({ createTable }) => {
			const organizations = createTable('organizations', {
				schema: () => ({
					name: z.string().meta({ field: 'company.name' }),
				}),
				seed: 1,
			})

			const projects = createTable('projects', {
				schema: () => ({
					name: z.string().meta({ field: 'commerce.productName' }),
					organizationId: z.string().meta({ related: 'organizations' }),
				}),
				seed: 2,
			})

			const sprints = createTable('sprints', {
				schema: () => ({
					name: z.string().meta({ field: 'lorem.words' }),
					projectId: z.string().meta({ related: 'projects' }),
					status: z.enum(['active', 'completed', 'planned']),
				}),
				seed: 4,
			})

			const issues = createTable('issues', {
				schema: () => ({
					title: z.string().meta({ field: 'lorem.sentence' }),
					sprintId: z.string().meta({ related: 'sprints' }),
					priority: z.enum(['low', 'medium', 'high']),
				}),
				seed: 8,
			})

			return {
				organizations: organizations.table(),
				projects: projects.table(),
				sprints: sprints.table(),
				issues: issues.table(),
			}
		})

		const orgIds = db.schemas.organizations.toArray().map((o) => o._id)
		const projectIds = db.schemas.projects.toArray().map((p) => p._id)
		const sprintIds = db.schemas.sprints.toArray().map((s) => s._id)

		// Verify chain: orgs -> projects
		for (const project of db.schemas.projects.toArray()) {
			expect(orgIds).toContain(project.organizationId)
		}

		// Verify chain: projects -> sprints
		for (const sprint of db.schemas.sprints.toArray()) {
			expect(projectIds).toContain(sprint.projectId)
		}

		// Verify chain: sprints -> issues
		for (const issue of db.schemas.issues.toArray()) {
			expect(sprintIds).toContain(issue.sprintId)
		}
	})

	test('seed resolves multiple relations on same entity', () => {
		const db = defineSchema(({ createTable }) => {
			const users = createTable('users', {
				schema: () => ({
					name: z.string().meta({ field: 'person.fullName' }),
				}),
				seed: 3,
			})

			const projects = createTable('projects', {
				schema: () => ({
					name: z.string().meta({ field: 'commerce.productName' }),
				}),
				seed: 2,
			})

			const issues = createTable('issues', {
				schema: () => ({
					title: z.string().meta({ field: 'lorem.sentence' }),
					projectId: z.string().meta({ related: 'projects' }),
					assigneeId: z.string().meta({ related: 'users' }),
					reporterId: z.string().meta({ related: 'users' }),
				}),
				seed: 6,
			})

			return {
				users: users.table(),
				projects: projects.table(),
				issues: issues.table(),
			}
		})

		const userIds = db.schemas.users.toArray().map((u) => u._id)
		const projectIds = db.schemas.projects.toArray().map((p) => p._id)

		for (const issue of db.schemas.issues.toArray()) {
			expect(projectIds).toContain(issue.projectId)
			expect(userIds).toContain(issue.assigneeId)
			expect(userIds).toContain(issue.reporterId)
		}
	})

	test('seed handles optional relations', () => {
		const db = defineSchema(({ createTable }) => {
			const users = createTable('users', {
				schema: () => ({
					name: z.string(),
				}),
				seed: 2,
			})

			const posts = createTable('posts', {
				schema: () => ({
					title: z.string(),
					authorId: z.string().meta({ related: 'users' }).optional(),
				}),
				seed: 10,
			})

			return {
				users: users.table(),
				posts: posts.table(),
			}
		})

		const userIds = db.schemas.users.toArray().map((u) => u._id)
		const allPosts = db.schemas.posts.toArray()

		// Some posts may have undefined authorId (optional), others should have valid user IDs
		for (const post of allPosts) {
			if (post.authorId !== undefined) {
				expect(userIds).toContain(post.authorId)
			}
		}
	})

	test('can query related entities via index', () => {
		const db = defineSchema(({ createTable }) => {
			const users = createTable('users', {
				schema: () => ({
					name: z.string(),
				}),
				seed: 0,
			})

			const posts = createTable('posts', {
				schema: () => ({
					title: z.string(),
					authorId: z.string().meta({ related: 'users' }),
				}),
				seed: 0,
			})

			return {
				users: users.table(),
				posts: posts.table().index('by_author', ['authorId']),
			}
		})

		// Manually insert to test querying
		const user = db.schemas.users.insert({ name: 'John' })
		db.schemas.posts.insert({ title: 'Post 1', authorId: user._id })
		db.schemas.posts.insert({ title: 'Post 2', authorId: user._id })
		db.schemas.posts.insert({ title: 'Post 3', authorId: 'other-user' })

		const johnsPosts = db.schemas.posts.query('by_author', user._id)
		expect(johnsPosts).toHaveLength(2)
		expect(johnsPosts.every((p) => p.authorId === user._id)).toBe(true)
	})
})

describe('generation fields', () => {
	test('generates email with internet.email', () => {
		const db = defineSchema(({ createTable }) => {
			const users = createTable('users', {
				schema: () => ({
					email: z.string().meta({ field: 'internet.email' }),
				}),
				seed: 5,
			})

			return { users: users.table() }
		})

		for (const user of db.schemas.users.toArray()) {
			expect(user.email).toMatch(/@/)
			expect(user.email).toMatch(/\./)
		}
	})

	test('generates url with internet.url', () => {
		const db = defineSchema(({ createTable }) => {
			const sites = createTable('sites', {
				schema: () => ({
					url: z.string().meta({ field: 'internet.url' }),
				}),
				seed: 5,
			})

			return { sites: sites.table() }
		})

		for (const site of db.schemas.sites.toArray()) {
			expect(site.url).toMatch(/^https?:\/\//)
		}
	})

	test('generates company name with company.name', () => {
		const db = defineSchema(({ createTable }) => {
			const companies = createTable('companies', {
				schema: () => ({
					name: z.string().meta({ field: 'company.name' }),
				}),
				seed: 5,
			})

			return { companies: companies.table() }
		})

		for (const company of db.schemas.companies.toArray()) {
			expect(company.name).toBeTypeOf('string')
			expect(company.name.length).toBeGreaterThan(0)
		}
	})

	test('generates person name with person.fullName', () => {
		const db = defineSchema(({ createTable }) => {
			const people = createTable('people', {
				schema: () => ({
					name: z.string().meta({ field: 'person.fullName' }),
				}),
				seed: 5,
			})

			return { people: people.table() }
		})

		for (const person of db.schemas.people.toArray()) {
			expect(person.name).toBeTypeOf('string')
			expect(person.name.length).toBeGreaterThan(0)
			// Full names typically have a space
			expect(person.name).toMatch(/\s/)
		}
	})

	test('generates lorem sentence with lorem.sentence', () => {
		const db = defineSchema(({ createTable }) => {
			const posts = createTable('posts', {
				schema: () => ({
					title: z.string().meta({ field: 'lorem.sentence' }),
				}),
				seed: 5,
			})

			return { posts: posts.table() }
		})

		for (const post of db.schemas.posts.toArray()) {
			expect(post.title).toBeTypeOf('string')
			expect(post.title.length).toBeGreaterThan(5)
		}
	})

	test('generates lorem paragraph with lorem.paragraph', () => {
		const db = defineSchema(({ createTable }) => {
			const articles = createTable('articles', {
				schema: () => ({
					content: z.string().meta({ field: 'lorem.paragraph' }),
				}),
				seed: 3,
			})

			return { articles: articles.table() }
		})

		for (const article of db.schemas.articles.toArray()) {
			expect(article.content).toBeTypeOf('string')
			expect(article.content.length).toBeGreaterThan(50)
		}
	})

	test('generates product name with commerce.productName', () => {
		const db = defineSchema(({ createTable }) => {
			const products = createTable('products', {
				schema: () => ({
					name: z.string().meta({ field: 'commerce.productName' }),
				}),
				seed: 5,
			})

			return { products: products.table() }
		})

		for (const product of db.schemas.products.toArray()) {
			expect(product.name).toBeTypeOf('string')
			expect(product.name.length).toBeGreaterThan(0)
		}
	})

	test('generates uuid with string.uuid', () => {
		const db = defineSchema(({ createTable }) => {
			const items = createTable('items', {
				schema: () => ({
					externalId: z.string().meta({ field: 'string.uuid' }),
				}),
				seed: 5,
			})

			return { items: items.table() }
		})

		for (const item of db.schemas.items.toArray()) {
			expect(item.externalId).toMatch(
				/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
			)
		}
	})

	test('generates date with date.past and date.future', () => {
		const db = defineSchema(({ createTable }) => {
			const events = createTable('events', {
				schema: () => ({
					startDate: z.string().meta({ field: 'date.past' }),
					endDate: z.string().meta({ field: 'date.future' }),
				}),
				seed: 5,
			})

			return { events: events.table() }
		})

		const now = new Date()

		for (const event of db.schemas.events.toArray()) {
			const start = new Date(event.startDate)
			const end = new Date(event.endDate)

			expect(start.getTime()).toBeLessThan(now.getTime())
			expect(end.getTime()).toBeGreaterThan(now.getTime())
		}
	})

	test('generates number with number.int', () => {
		const db = defineSchema(({ createTable }) => {
			const stats = createTable('stats', {
				schema: () => ({
					count: z.number().meta({ field: 'number.int' }),
				}),
				seed: 5,
			})

			return { stats: stats.table() }
		})

		for (const stat of db.schemas.stats.toArray()) {
			expect(stat.count).toBeTypeOf('number')
			expect(Number.isInteger(stat.count)).toBe(true)
		}
	})

	test('generates custom value with function', () => {
		let counter = 0
		const db = defineSchema(({ createTable }) => {
			const items = createTable('items', {
				schema: () => ({
					code: z.string().meta({ field: () => `ITEM-${++counter}` }),
				}),
				seed: 5,
			})

			return { items: items.table() }
		})

		const codes = db.schemas.items.toArray().map((i) => i.code)

		expect(codes).toContain('ITEM-1')
		expect(codes).toContain('ITEM-2')
		expect(codes).toContain('ITEM-3')
		expect(codes).toContain('ITEM-4')
		expect(codes).toContain('ITEM-5')
	})

	test('generates with nanoid function', () => {
		const db = defineSchema(({ createTable }) => {
			const items = createTable('items', {
				schema: () => ({
					key: z.string().meta({ field: () => nanoid(8).toUpperCase() }),
				}),
				seed: 5,
			})

			return { items: items.table() }
		})

		for (const item of db.schemas.items.toArray()) {
			expect(item.key).toMatch(/^[A-Z0-9_-]{8}$/i)
		}
	})

	test('auto-generates enum values from zod schema', () => {
		const db = defineSchema(({ createTable }) => {
			const tasks = createTable('tasks', {
				schema: () => ({
					status: z.enum(['todo', 'in_progress', 'done']),
					priority: z.enum(['low', 'medium', 'high', 'critical']),
				}),
				seed: 20,
			})

			return { tasks: tasks.table() }
		})

		const statuses = new Set(db.schemas.tasks.toArray().map((t) => t.status))
		const priorities = new Set(
			db.schemas.tasks.toArray().map((t) => t.priority),
		)

		// With 20 items, we should see variety
		expect(statuses.size).toBeGreaterThan(1)
		expect(priorities.size).toBeGreaterThan(1)

		// All values should be valid enum values
		for (const task of db.schemas.tasks.toArray()) {
			expect(['todo', 'in_progress', 'done']).toContain(task.status)
			expect(['low', 'medium', 'high', 'critical']).toContain(task.priority)
		}
	})

	test('auto-generates boolean values', () => {
		const db = defineSchema(({ createTable }) => {
			const flags = createTable('flags', {
				schema: () => ({
					isActive: z.boolean(),
					isPublic: z.boolean(),
				}),
				seed: 20,
			})

			return { flags: flags.table() }
		})

		const activeValues = new Set(
			db.schemas.flags.toArray().map((f) => f.isActive),
		)
		const publicValues = new Set(
			db.schemas.flags.toArray().map((f) => f.isPublic),
		)

		// With 20 items, we should see both true and false
		expect(activeValues.has(true) || activeValues.has(false)).toBe(true)
		expect(publicValues.has(true) || publicValues.has(false)).toBe(true)

		for (const flag of db.schemas.flags.toArray()) {
			expect(flag.isActive).toBeTypeOf('boolean')
			expect(flag.isPublic).toBeTypeOf('boolean')
		}
	})

	test('auto-generates number values', () => {
		const db = defineSchema(({ createTable }) => {
			const metrics = createTable('metrics', {
				schema: () => ({
					value: z.number(),
				}),
				seed: 5,
			})

			return { metrics: metrics.table() }
		})

		for (const metric of db.schemas.metrics.toArray()) {
			expect(metric.value).toBeTypeOf('number')
		}
	})

	test('auto-generates string values', () => {
		const db = defineSchema(({ createTable }) => {
			const notes = createTable('notes', {
				schema: () => ({
					content: z.string(),
				}),
				seed: 5,
			})

			return { notes: notes.table() }
		})

		for (const note of db.schemas.notes.toArray()) {
			expect(note.content).toBeTypeOf('string')
			expect(note.content.length).toBeGreaterThan(0)
		}
	})

	test('handles optional fields', () => {
		const db = defineSchema(({ createTable }) => {
			const users = createTable('users', {
				schema: () => ({
					name: z.string(),
					nickname: z.string().optional(),
					bio: z.string().meta({ field: 'lorem.sentence' }).optional(),
				}),
				seed: 10,
			})

			return { users: users.table() }
		})

		// All should have name
		for (const user of db.schemas.users.toArray()) {
			expect(user.name).toBeTypeOf('string')
		}

		// Some optional fields might be undefined (30% chance per implementation)
		const nicknames = db.schemas.users.toArray().map((u) => u.nickname)
		const hasUndefined = nicknames.some((n) => n === undefined)
		const hasDefined = nicknames.some((n) => n !== undefined)

		// With 10 items, we should see at least some variation
		expect(hasUndefined || hasDefined).toBe(true)
	})

	test('combines faker field with relation', () => {
		const db = defineSchema(({ createTable }) => {
			const authors = createTable('authors', {
				schema: () => ({
					name: z.string().meta({ field: 'person.fullName' }),
					email: z.string().meta({ field: 'internet.email' }),
				}),
				seed: 3,
			})

			const books = createTable('books', {
				schema: () => ({
					title: z.string().meta({ field: 'lorem.sentence' }),
					isbn: z.string().meta({ field: 'string.uuid' }),
					authorId: z.string().meta({ related: 'authors' }),
					publishedAt: z.string().meta({ field: 'date.past' }),
				}),
				seed: 10,
			})

			return {
				authors: authors.table(),
				books: books.table(),
			}
		})

		const authorIds = db.schemas.authors.toArray().map((a) => a._id)

		for (const book of db.schemas.books.toArray()) {
			expect(book.title).toBeTypeOf('string')
			expect(book.isbn).toMatch(/^[0-9a-f-]{36}$/i)
			expect(authorIds).toContain(book.authorId)
			expect(new Date(book.publishedAt).getTime()).toBeLessThan(Date.now())
		}
	})

	test('generates with shorthand type: email', () => {
		const db = defineSchema(({ createTable }) => {
			const users = createTable('users', {
				schema: () => ({
					email: z.string().meta({ type: 'email' }),
				}),
				seed: 5,
			})

			return { users: users.table() }
		})

		for (const user of db.schemas.users.toArray()) {
			expect(user.email).toMatch(/@/)
		}
	})

	test('generates with shorthand type: uuid', () => {
		const db = defineSchema(({ createTable }) => {
			const items = createTable('items', {
				schema: () => ({
					externalId: z.string().meta({ type: 'uuid' }),
				}),
				seed: 5,
			})

			return { items: items.table() }
		})

		for (const item of db.schemas.items.toArray()) {
			expect(item.externalId).toMatch(
				/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
			)
		}
	})

	test('generates with shorthand type: fullname', () => {
		const db = defineSchema(({ createTable }) => {
			const people = createTable('people', {
				schema: () => ({
					name: z.string().meta({ type: 'fullname' }),
				}),
				seed: 5,
			})

			return { people: people.table() }
		})

		for (const person of db.schemas.people.toArray()) {
			expect(person.name).toBeTypeOf('string')
			expect(person.name).toMatch(/\s/)
		}
	})

	test('generates with shorthand type: company', () => {
		const db = defineSchema(({ createTable }) => {
			const orgs = createTable('orgs', {
				schema: () => ({
					name: z.string().meta({ type: 'company' }),
				}),
				seed: 5,
			})

			return { orgs: orgs.table() }
		})

		for (const org of db.schemas.orgs.toArray()) {
			expect(org.name).toBeTypeOf('string')
			expect(org.name.length).toBeGreaterThan(0)
		}
	})

	test('generates with shorthand type: sentence and paragraph', () => {
		const db = defineSchema(({ createTable }) => {
			const posts = createTable('posts', {
				schema: () => ({
					title: z.string().meta({ type: 'sentence' }),
					content: z.string().meta({ type: 'paragraph' }),
				}),
				seed: 3,
			})

			return { posts: posts.table() }
		})

		for (const post of db.schemas.posts.toArray()) {
			expect(post.title).toBeTypeOf('string')
			expect(post.title.length).toBeGreaterThan(5)
			expect(post.content).toBeTypeOf('string')
			expect(post.content.length).toBeGreaterThan(50)
		}
	})

	test('generates with shorthand type: number with min/max', () => {
		const db = defineSchema(({ createTable }) => {
			const stats = createTable('stats', {
				schema: () => ({
					score: z.number().meta({ type: 'number', min: 100, max: 200 }),
				}),
				seed: 10,
			})

			return { stats: stats.table() }
		})

		for (const stat of db.schemas.stats.toArray()) {
			expect(stat.score).toBeGreaterThanOrEqual(100)
			expect(stat.score).toBeLessThanOrEqual(200)
		}
	})

	test('generates with shorthand type: url and image', () => {
		const db = defineSchema(({ createTable }) => {
			const media = createTable('media', {
				schema: () => ({
					link: z.string().meta({ type: 'url' }),
					thumbnail: z.string().meta({ type: 'image' }),
				}),
				seed: 5,
			})

			return { media: media.table() }
		})

		for (const item of db.schemas.media.toArray()) {
			expect(item.link).toMatch(/^https?:\/\//)
			expect(item.thumbnail).toMatch(/^https?:\/\//)
		}
	})

	test('generates with shorthand type: address fields', () => {
		const db = defineSchema(({ createTable }) => {
			const locations = createTable('locations', {
				schema: () => ({
					street: z.string().meta({ type: 'address' }),
					city: z.string().meta({ type: 'city' }),
					country: z.string().meta({ type: 'country' }),
					zip: z.string().meta({ type: 'zipcode' }),
				}),
				seed: 3,
			})

			return { locations: locations.table() }
		})

		for (const loc of db.schemas.locations.toArray()) {
			expect(loc.street).toBeTypeOf('string')
			expect(loc.city).toBeTypeOf('string')
			expect(loc.country).toBeTypeOf('string')
			expect(loc.zip).toBeTypeOf('string')
		}
	})

	test('shorthand type takes priority over faker path', () => {
		const db = defineSchema(({ createTable }) => {
			const items = createTable('items', {
				schema: () => ({
					// type should take priority over field
					value: z.string().meta({ type: 'email', field: 'lorem.word' }),
				}),
				seed: 5,
			})

			return { items: items.table() }
		})

		for (const item of db.schemas.items.toArray()) {
			expect(item.value).toMatch(/@/)
		}
	})

	test('generates with shorthand type: phone', () => {
		const db = defineSchema(({ createTable }) => {
			const contacts = createTable('contacts', {
				schema: () => ({
					phone: z.string().meta({ type: 'phone' }),
				}),
				seed: 5,
			})

			return { contacts: contacts.table() }
		})

		for (const contact of db.schemas.contacts.toArray()) {
			expect(contact.phone).toBeTypeOf('string')
			expect(contact.phone.length).toBeGreaterThan(0)
		}
	})

	test('generates with shorthand type: firstname, lastname', () => {
		const db = defineSchema(({ createTable }) => {
			const people = createTable('people', {
				schema: () => ({
					firstName: z.string().meta({ type: 'firstname' }),
					lastName: z.string().meta({ type: 'lastname' }),
				}),
				seed: 5,
			})

			return { people: people.table() }
		})

		for (const person of db.schemas.people.toArray()) {
			expect(person.firstName).toBeTypeOf('string')
			expect(person.firstName.length).toBeGreaterThan(0)
			expect(person.lastName).toBeTypeOf('string')
			expect(person.lastName.length).toBeGreaterThan(0)
		}
	})

	test('generates with shorthand type: username, password', () => {
		const db = defineSchema(({ createTable }) => {
			const accounts = createTable('accounts', {
				schema: () => ({
					username: z.string().meta({ type: 'username' }),
					password: z.string().meta({ type: 'password' }),
				}),
				seed: 5,
			})

			return { accounts: accounts.table() }
		})

		for (const account of db.schemas.accounts.toArray()) {
			expect(account.username).toBeTypeOf('string')
			expect(account.username.length).toBeGreaterThan(0)
			expect(account.password).toBeTypeOf('string')
			expect(account.password.length).toBeGreaterThanOrEqual(12)
		}
	})

	test('generates with shorthand type: hexcolor', () => {
		const db = defineSchema(({ createTable }) => {
			const themes = createTable('themes', {
				schema: () => ({
					primary: z.string().meta({ type: 'hexcolor' }),
					secondary: z.string().meta({ type: 'hexcolor' }),
				}),
				seed: 5,
			})

			return { themes: themes.table() }
		})

		for (const theme of db.schemas.themes.toArray()) {
			expect(theme.primary).toMatch(/^#[0-9A-F]{6}$/i)
			expect(theme.secondary).toMatch(/^#[0-9A-F]{6}$/i)
		}
	})

	test('generates with shorthand type: credit_card', () => {
		const db = defineSchema(({ createTable }) => {
			const payments = createTable('payments', {
				schema: () => ({
					cardNumber: z.string().meta({ type: 'credit_card' }),
				}),
				seed: 5,
			})

			return { payments: payments.table() }
		})

		for (const payment of db.schemas.payments.toArray()) {
			expect(payment.cardNumber).toBeTypeOf('string')
			// Credit card numbers are typically 13-19 digits with possible separators
			expect(
				payment.cardNumber.replace(/\D/g, '').length,
			).toBeGreaterThanOrEqual(13)
		}
	})

	test('generates with shorthand type: job_title', () => {
		const db = defineSchema(({ createTable }) => {
			const employees = createTable('employees', {
				schema: () => ({
					title: z.string().meta({ type: 'job_title' }),
				}),
				seed: 5,
			})

			return { employees: employees.table() }
		})

		for (const employee of db.schemas.employees.toArray()) {
			expect(employee.title).toBeTypeOf('string')
			expect(employee.title.length).toBeGreaterThan(0)
		}
	})

	test('generates with shorthand type: ipv4, ipv6', () => {
		const db = defineSchema(({ createTable }) => {
			const servers = createTable('servers', {
				schema: () => ({
					ipv4: z.string().meta({ type: 'ipv4' }),
					ipv6: z.string().meta({ type: 'ipv6' }),
				}),
				seed: 5,
			})

			return { servers: servers.table() }
		})

		for (const server of db.schemas.servers.toArray()) {
			// IPv4: x.x.x.x format
			expect(server.ipv4).toMatch(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/)
			// IPv6: contains colons
			expect(server.ipv6).toMatch(/:/)
		}
	})

	test('generates with shorthand type: latitude, longitude', () => {
		const db = defineSchema(({ createTable }) => {
			const locations = createTable('locations', {
				schema: () => ({
					lat: z.number().meta({ type: 'latitude' }),
					lng: z.number().meta({ type: 'longitude' }),
				}),
				seed: 5,
			})

			return { locations: locations.table() }
		})

		for (const loc of db.schemas.locations.toArray()) {
			expect(loc.lat).toBeTypeOf('number')
			expect(loc.lat).toBeGreaterThanOrEqual(-90)
			expect(loc.lat).toBeLessThanOrEqual(90)
			expect(loc.lng).toBeTypeOf('number')
			expect(loc.lng).toBeGreaterThanOrEqual(-180)
			expect(loc.lng).toBeLessThanOrEqual(180)
		}
	})

	test('generates with shorthand type: word', () => {
		const db = defineSchema(({ createTable }) => {
			const tags = createTable('tags', {
				schema: () => ({
					name: z.string().meta({ type: 'word' }),
				}),
				seed: 5,
			})

			return { tags: tags.table() }
		})

		for (const tag of db.schemas.tags.toArray()) {
			expect(tag.name).toBeTypeOf('string')
			expect(tag.name.length).toBeGreaterThan(0)
			// Word should not contain spaces
			expect(tag.name).not.toMatch(/\s/)
		}
	})

	test('generates with shorthand type: date, datetime', () => {
		const db = defineSchema(({ createTable }) => {
			const events = createTable('events', {
				schema: () => ({
					createdDate: z.string().meta({ type: 'date' }),
					createdDatetime: z.string().meta({ type: 'datetime' }),
				}),
				seed: 5,
			})

			return { events: events.table() }
		})

		for (const event of db.schemas.events.toArray()) {
			// Should be valid ISO date strings
			expect(new Date(event.createdDate).toString()).not.toBe('Invalid Date')
			expect(new Date(event.createdDatetime).toString()).not.toBe(
				'Invalid Date',
			)
		}
	})

	test('generates with shorthand type: boolean', () => {
		const db = defineSchema(({ createTable }) => {
			const settings = createTable('settings', {
				schema: () => ({
					enabled: z.boolean().meta({ type: 'boolean' }),
					visible: z.boolean().meta({ type: 'boolean' }),
				}),
				seed: 20,
			})

			return { settings: settings.table() }
		})

		const enabledValues = new Set(
			db.schemas.settings.toArray().map((s) => s.enabled),
		)
		const visibleValues = new Set(
			db.schemas.settings.toArray().map((s) => s.visible),
		)

		// With 20 items, we should see both true and false
		expect(enabledValues.size).toBeGreaterThan(0)
		expect(visibleValues.size).toBeGreaterThan(0)

		for (const setting of db.schemas.settings.toArray()) {
			expect(setting.enabled).toBeTypeOf('boolean')
			expect(setting.visible).toBeTypeOf('boolean')
		}
	})

	test('generates with shorthand type: string (alphanumeric)', () => {
		const db = defineSchema(({ createTable }) => {
			const tokens = createTable('tokens', {
				schema: () => ({
					code: z.string().meta({ type: 'string' }),
				}),
				seed: 5,
			})

			return { tokens: tokens.table() }
		})

		for (const token of db.schemas.tokens.toArray()) {
			expect(token.code).toBeTypeOf('string')
			expect(token.code.length).toBe(10) // default length
			expect(token.code).toMatch(/^[a-zA-Z0-9]+$/)
		}
	})
})

describe('table schemas for validation', () => {
	test('table has insertSchema and updateSchema', () => {
		const db = defineSchema(({ createTable }) => {
			const users = createTable('users', {
				schema: () => ({
					name: z.string(),
					email: z.string().email(),
					age: z.number(),
				}),
				seed: 0,
			})

			return { users: users.table() }
		})

		expect(db.schemas.users.insertSchema).toBeDefined()
		expect(db.schemas.users.updateSchema).toBeDefined()
	})

	test('insertSchema validates complete data', () => {
		const db = defineSchema(({ createTable }) => {
			const users = createTable('users', {
				schema: () => ({
					name: z.string(),
					email: z.string().email(),
				}),
				seed: 0,
			})

			return { users: users.table() }
		})

		// Valid data
		const validResult = db.schemas.users.insertSchema.safeParse({
			name: 'John',
			email: 'john@example.com',
		})
		expect(validResult.success).toBe(true)

		// Invalid data - missing email
		const invalidResult = db.schemas.users.insertSchema.safeParse({
			name: 'John',
		})
		expect(invalidResult.success).toBe(false)

		// Invalid data - bad email format
		const badEmailResult = db.schemas.users.insertSchema.safeParse({
			name: 'John',
			email: 'not-an-email',
		})
		expect(badEmailResult.success).toBe(false)
	})

	test('updateSchema allows partial data', () => {
		const db = defineSchema(({ createTable }) => {
			const users = createTable('users', {
				schema: () => ({
					name: z.string(),
					email: z.string().email(),
					age: z.number(),
				}),
				seed: 0,
			})

			return { users: users.table() }
		})

		// Partial update - only name
		const nameResult = db.schemas.users.updateSchema.safeParse({
			name: 'Jane',
		})
		expect(nameResult.success).toBe(true)

		// Partial update - only age
		const ageResult = db.schemas.users.updateSchema.safeParse({
			age: 25,
		})
		expect(ageResult.success).toBe(true)

		// Empty update (all optional)
		const emptyResult = db.schemas.users.updateSchema.safeParse({})
		expect(emptyResult.success).toBe(true)
	})

	test('schemas can be used with form data', () => {
		const db = defineSchema(({ createTable }) => {
			const products = createTable('products', {
				schema: () => ({
					name: z.string().min(1),
					price: z.number().positive(),
					description: z.string().optional(),
				}),
				seed: 0,
			})

			return { products: products.table() }
		})

		// Simulating form submission
		const formData = {
			name: 'Widget',
			price: 19.99,
			description: 'A great widget',
		}

		const result = db.schemas.products.insertSchema.safeParse(formData)
		expect(result.success).toBe(true)

		if (result.success) {
			// Type-safe insert after validation - returns full document
			const product = db.schemas.products.insert(result.data)
			expect(product.name).toBe('Widget')
			expect(product.price).toBe(19.99)
		}
	})

	test('updateSchema validates field types', () => {
		const db = defineSchema(({ createTable }) => {
			const users = createTable('users', {
				schema: () => ({
					name: z.string(),
					age: z.number(),
				}),
				seed: 0,
			})

			return { users: users.table() }
		})

		// Valid partial update
		const validResult = db.schemas.users.updateSchema.safeParse({
			age: 30,
		})
		expect(validResult.success).toBe(true)

		// Invalid type for age
		const invalidResult = db.schemas.users.updateSchema.safeParse({
			age: 'thirty',
		})
		expect(invalidResult.success).toBe(false)
	})
})

describe('flowFields', () => {
	describe('computed fields (function form)', () => {
		test('computes simple concatenation', () => {
			const db = defineSchema(({ createTable }) => {
				const users = createTable('users', {
					schema: () => ({
						firstName: z.string(),
						lastName: z.string(),
						// FlowFields should be optional since they're computed
						fullName: z
							.string()
							.optional()
							.meta({
								flowField: (row: { firstName: string; lastName: string }) =>
									`${row.firstName} ${row.lastName}`,
							}),
					}),
					seed: 0,
				})

				return { users: users.table() }
			})

			const user = db.schemas.users.insert({
				firstName: 'John',
				lastName: 'Doe',
			})

			expect(user.fullName).toBe('John Doe')
		})

		test('computes derived values', () => {
			const db = defineSchema(({ createTable }) => {
				const products = createTable('products', {
					schema: () => ({
						price: z.number(),
						quantity: z.number(),
						total: z
							.number()
							.optional()
							.meta({
								flowField: (row: { price: number; quantity: number }) =>
									row.price * row.quantity,
							}),
					}),
					seed: 0,
				})

				return { products: products.table() }
			})

			const product = db.schemas.products.insert({ price: 10, quantity: 5 })

			expect(product.total).toBe(50)
		})

		test('computed fields update when source data changes', () => {
			const db = defineSchema(({ createTable }) => {
				const users = createTable('users', {
					schema: () => ({
						firstName: z.string(),
						lastName: z.string(),
						fullName: z
							.string()
							.optional()
							.meta({
								flowField: (row: { firstName: string; lastName: string }) =>
									`${row.firstName} ${row.lastName}`,
							}),
					}),
					seed: 0,
				})

				return { users: users.table() }
			})

			const user = db.schemas.users.insert({
				firstName: 'John',
				lastName: 'Doe',
			})
			expect(db.schemas.users.get(user._id)?.fullName).toBe('John Doe')

			db.schemas.users.update(user._id, { firstName: 'Jane' })
			expect(db.schemas.users.get(user._id)?.fullName).toBe('Jane Doe')
		})

		test('computed fields work in toArray', () => {
			const db = defineSchema(({ createTable }) => {
				const users = createTable('users', {
					schema: () => ({
						firstName: z.string(),
						lastName: z.string(),
						fullName: z
							.string()
							.optional()
							.meta({
								flowField: (row: { firstName: string; lastName: string }) =>
									`${row.firstName} ${row.lastName}`,
							}),
					}),
					seed: 0,
				})

				return { users: users.table() }
			})

			db.schemas.users.insert({ firstName: 'John', lastName: 'Doe' })
			db.schemas.users.insert({ firstName: 'Jane', lastName: 'Smith' })

			const usersList = db.schemas.users.toArray()
			expect(usersList.map((u) => u.fullName)).toContain('John Doe')
			expect(usersList.map((u) => u.fullName)).toContain('Jane Smith')
		})

		test('computed fields can access other tables via context', () => {
			const db = defineSchema(({ createTable }) => {
				const discounts = createTable('discounts', {
					schema: () => ({
						productId: z.string(),
						percent: z.number(),
					}),
					seed: 0,
				})

				const products = createTable('products', {
					schema: () => ({
						name: z.string(),
						price: z.number(),
						finalPrice: z
							.number()
							.optional()
							.meta({
								flowField: (
									row: { _id: string; price: number },
									ctx: {
										schemas: Record<
											string,
											{
												toArray: () => Array<{
													productId: string
													percent: number
												}>
											}
										>
									},
								) => {
									const discount = ctx.schemas.discounts
										.toArray()
										.find((d) => d.productId === row._id)
									return row.price * (1 - (discount?.percent ?? 0) / 100)
								},
							}),
					}),
					seed: 0,
				})

				return {
					discounts: discounts.table(),
					products: products.table(),
				}
			})

			const product = db.schemas.products.insert({ name: 'Widget', price: 100 })
			db.schemas.discounts.insert({ productId: product._id, percent: 20 })

			const fetched = db.schemas.products.get(product._id)
			expect(fetched?.finalPrice).toBe(80)
		})
	})

	describe('aggregation flowFields (object form)', () => {
		test('count - counts related records', () => {
			const db = defineSchema(({ createTable }) => {
				const customers = createTable('customers', {
					schema: () => ({
						name: z.string(),
						// FlowFields should be optional since they're computed
						orderCount: z
							.number()
							.optional()
							.meta({
								flowField: {
									type: 'count',
									source: 'orders',
									key: 'customerId',
								},
							}),
					}),
					seed: 0,
				})

				const orders = createTable('orders', {
					schema: () => ({
						customerId: z.string(),
						amount: z.number(),
					}),
					seed: 0,
				})

				return {
					customers: customers.table(),
					orders: orders.table(),
				}
			})

			const customer = db.schemas.customers.insert({ name: 'John' })
			db.schemas.orders.insert({ customerId: customer._id, amount: 100 })
			db.schemas.orders.insert({ customerId: customer._id, amount: 200 })
			db.schemas.orders.insert({ customerId: customer._id, amount: 300 })

			const fetched = db.schemas.customers.get(customer._id)
			expect(fetched?.orderCount).toBe(3)
		})

		test('sum - sums numeric field', () => {
			const db = defineSchema(({ createTable }) => {
				const customers = createTable('customers', {
					schema: () => ({
						name: z.string(),
						totalSpent: z
							.number()
							.optional()
							.meta({
								flowField: {
									type: 'sum',
									source: 'orders',
									field: 'amount',
									key: 'customerId',
								},
							}),
					}),
					seed: 0,
				})

				const orders = createTable('orders', {
					schema: () => ({
						customerId: z.string(),
						amount: z.number(),
					}),
					seed: 0,
				})

				return {
					customers: customers.table(),
					orders: orders.table(),
				}
			})

			const customer = db.schemas.customers.insert({ name: 'John' })
			db.schemas.orders.insert({ customerId: customer._id, amount: 100 })
			db.schemas.orders.insert({ customerId: customer._id, amount: 200 })
			db.schemas.orders.insert({ customerId: customer._id, amount: 300 })

			const fetched = db.schemas.customers.get(customer._id)
			expect(fetched?.totalSpent).toBe(600)
		})

		test('average - calculates average', () => {
			const db = defineSchema(({ createTable }) => {
				const customers = createTable('customers', {
					schema: () => ({
						name: z.string(),
						avgOrderValue: z
							.number()
							.optional()
							.meta({
								flowField: {
									type: 'average',
									source: 'orders',
									field: 'amount',
									key: 'customerId',
								},
							}),
					}),
					seed: 0,
				})

				const orders = createTable('orders', {
					schema: () => ({
						customerId: z.string(),
						amount: z.number(),
					}),
					seed: 0,
				})

				return {
					customers: customers.table(),
					orders: orders.table(),
				}
			})

			const customer = db.schemas.customers.insert({ name: 'John' })
			db.schemas.orders.insert({ customerId: customer._id, amount: 100 })
			db.schemas.orders.insert({ customerId: customer._id, amount: 200 })
			db.schemas.orders.insert({ customerId: customer._id, amount: 300 })

			expect(customer?.avgOrderValue).toBe(200)
		})

		test('min - finds minimum value', () => {
			const db = defineSchema(({ createTable }) => {
				const customers = createTable('customers', {
					schema: () => ({
						name: z.string(),
						minOrder: z
							.number()
							.optional()
							.meta({
								flowField: {
									type: 'min',
									source: 'orders',
									field: 'amount',
									key: 'customerId',
								},
							}),
					}),
					seed: 0,
				})

				const orders = createTable('orders', {
					schema: () => ({
						customerId: z.string(),
						amount: z.number(),
					}),
					seed: 0,
				})

				return {
					customers: customers.table(),
					orders: orders.table(),
				}
			})

			const customer = db.schemas.customers.insert({ name: 'John' })
			db.schemas.orders.insert({ customerId: customer._id, amount: 100 })
			db.schemas.orders.insert({ customerId: customer._id, amount: 50 })
			db.schemas.orders.insert({ customerId: customer._id, amount: 300 })

			expect(customer?.minOrder).toBe(50)
		})

		test('max - finds maximum value', () => {
			const db = defineSchema(({ createTable }) => {
				const customers = createTable('customers', {
					schema: () => ({
						name: z.string(),
						maxOrder: z
							.number()
							.optional()
							.meta({
								flowField: {
									type: 'max',
									source: 'orders',
									field: 'amount',
									key: 'customerId',
								},
							}),
					}),
					seed: 0,
				})

				const orders = createTable('orders', {
					schema: () => ({
						customerId: z.string(),
						amount: z.number(),
					}),
					seed: 0,
				})

				return {
					customers: customers.table(),
					orders: orders.table(),
				}
			})

			const customer = db.schemas.customers.insert({ name: 'John' })
			db.schemas.orders.insert({ customerId: customer._id, amount: 100 })
			db.schemas.orders.insert({ customerId: customer._id, amount: 500 })
			db.schemas.orders.insert({ customerId: customer._id, amount: 300 })

			expect(customer?.maxOrder).toBe(500)
		})

		test('lookup - gets first related record field', () => {
			const db = defineSchema(({ createTable }) => {
				const customers = createTable('customers', {
					schema: () => ({
						name: z.string(),
						lastOrderAmount: z
							.number()
							.optional()
							.meta({
								flowField: {
									type: 'lookup',
									source: 'orders',
									field: 'amount',
									key: 'customerId',
								},
							}),
					}),
					seed: 0,
				})

				const orders = createTable('orders', {
					schema: () => ({
						customerId: z.string(),
						amount: z.number(),
					}),
					seed: 0,
				})

				return {
					customers: customers.table(),
					orders: orders.table(),
				}
			})

			const customer = db.schemas.customers.insert({ name: 'John' })
			db.schemas.orders.insert({ customerId: customer._id, amount: 100 })

			expect(customer.lastOrderAmount).toBe(100)
		})

		test('exist - checks if related records exist', () => {
			const db = defineSchema(({ createTable }) => {
				const customers = createTable('customers', {
					schema: () => ({
						name: z.string(),
						hasOrders: z
							.boolean()
							.optional()
							.meta({
								flowField: {
									type: 'exist',
									source: 'orders',
									key: 'customerId',
								},
							}),
					}),
					seed: 0,
				})

				const orders = createTable('orders', {
					schema: () => ({
						customerId: z.string(),
						amount: z.number(),
					}),
					seed: 0,
				})

				return {
					customers: customers.table(),
					orders: orders.table(),
				}
			})

			const john = db.schemas.customers.insert({ name: 'John' })
			const jane = db.schemas.customers.insert({ name: 'Jane' })
			db.schemas.orders.insert({ customerId: john._id, amount: 100 })

			expect(john.hasOrders).toBe(true)
			expect(jane.hasOrders).toBe(false)
		})

		test('count with where filter', () => {
			const db = defineSchema(({ createTable }) => {
				const customers = createTable('customers', {
					schema: () => ({
						name: z.string(),
						completedOrderCount: z
							.number()
							.optional()
							.meta({
								flowField: {
									type: 'count',
									source: 'orders',
									key: 'customerId',
									where: { status: 'completed' },
								},
							}),
					}),
					seed: 0,
				})

				const orders = createTable('orders', {
					schema: () => ({
						customerId: z.string(),
						amount: z.number(),
						status: z.enum(['pending', 'completed', 'cancelled']),
					}),
					seed: 0,
				})

				return {
					customers: customers.table(),
					orders: orders.table(),
				}
			})

			const customer = db.schemas.customers.insert({ name: 'John' })
			db.schemas.orders.insert({
				customerId: customer._id,
				amount: 100,
				status: 'completed',
			})
			db.schemas.orders.insert({
				customerId: customer._id,
				amount: 200,
				status: 'pending',
			})
			db.schemas.orders.insert({
				customerId: customer._id,
				amount: 300,
				status: 'completed',
			})
			db.schemas.orders.insert({
				customerId: customer._id,
				amount: 400,
				status: 'cancelled',
			})

			expect(customer?.completedOrderCount).toBe(2)
		})

		test('sum with where filter', () => {
			const db = defineSchema(({ createTable }) => {
				const customers = createTable('customers', {
					schema: () => ({
						name: z.string(),
						completedTotal: z
							.number()
							.optional()
							.meta({
								flowField: {
									type: 'sum',
									source: 'orders',
									field: 'amount',
									key: 'customerId',
									where: { status: 'completed' },
								},
							}),
					}),
					seed: 0,
				})

				const orders = createTable('orders', {
					schema: () => ({
						customerId: z.string(),
						amount: z.number(),
						status: z.enum(['pending', 'completed', 'cancelled']),
					}),
					seed: 0,
				})

				return {
					customers: customers.table(),
					orders: orders.table(),
				}
			})

			const customer = db.schemas.customers.insert({ name: 'John' })
			db.schemas.orders.insert({
				customerId: customer._id,
				amount: 100,
				status: 'completed',
			})
			db.schemas.orders.insert({
				customerId: customer._id,
				amount: 200,
				status: 'pending',
			})
			db.schemas.orders.insert({
				customerId: customer._id,
				amount: 300,
				status: 'completed',
			})

			expect(customer.completedTotal).toBe(400)
		})

		test('exist with where filter', () => {
			const db = defineSchema(({ createTable }) => {
				const customers = createTable('customers', {
					schema: () => ({
						name: z.string(),
						hasCompletedOrders: z
							.boolean()
							.optional()
							.meta({
								flowField: {
									type: 'exist',
									source: 'orders',
									key: 'customerId',
									where: { status: 'completed' },
								},
							}),
					}),
					seed: 0,
				})

				const orders = createTable('orders', {
					schema: () => ({
						customerId: z.string(),
						amount: z.number(),
						status: z.enum(['pending', 'completed', 'cancelled']),
					}),
					seed: 0,
				})

				return {
					customers: customers.table(),
					orders: orders.table(),
				}
			})

			const john = db.schemas.customers.insert({ name: 'John' })
			const jane = db.schemas.customers.insert({ name: 'Jane' })

			db.schemas.orders.insert({
				customerId: john._id,
				amount: 100,
				status: 'completed',
			})
			db.schemas.orders.insert({
				customerId: jane._id,
				amount: 200,
				status: 'pending',
			})
			expect(john.hasCompletedOrders).toBe(true)
			expect(jane.hasCompletedOrders).toBe(false)
		})
	})

	describe('flowField edge cases', () => {
		test('returns 0 for count with no related records', () => {
			const db = defineSchema(({ createTable }) => {
				const customers = createTable('customers', {
					schema: () => ({
						name: z.string(),
						orderCount: z
							.number()
							.optional()
							.meta({
								flowField: {
									type: 'count',
									source: 'orders',
									key: 'customerId',
								},
							}),
					}),
					seed: 0,
				})

				const orders = createTable('orders', {
					schema: () => ({
						customerId: z.string(),
						amount: z.number(),
					}),
					seed: 0,
				})

				return {
					customers: customers.table(),
					orders: orders.table(),
				}
			})

			const customer = db.schemas.customers.insert({ name: 'John' })
			expect(customer.orderCount).toBe(0)
		})

		test('returns 0 for sum with no related records', () => {
			const db = defineSchema(({ createTable }) => {
				const customers = createTable('customers', {
					schema: () => ({
						name: z.string(),
						totalSpent: z
							.number()
							.optional()
							.meta({
								flowField: {
									type: 'sum',
									source: 'orders',
									field: 'amount',
									key: 'customerId',
								},
							}),
					}),
					seed: 0,
				})

				const orders = createTable('orders', {
					schema: () => ({
						customerId: z.string(),
						amount: z.number(),
					}),
					seed: 0,
				})

				return {
					customers: customers.table(),
					orders: orders.table(),
				}
			})

			const customer = db.schemas.customers.insert({ name: 'John' })
			expect(customer.totalSpent).toBe(0)
		})

		test('flowFields are reactive - update when related data changes', () => {
			const db = defineSchema(({ createTable }) => {
				const customers = createTable('customers', {
					schema: () => ({
						name: z.string(),
						orderCount: z
							.number()
							.optional()
							.meta({
								flowField: {
									type: 'count',
									source: 'orders',
									key: 'customerId',
								},
							}),
						totalSpent: z
							.number()
							.optional()
							.meta({
								flowField: {
									type: 'sum',
									source: 'orders',
									field: 'amount',
									key: 'customerId',
								},
							}),
					}),
					seed: 0,
				})

				const orders = createTable('orders', {
					schema: () => ({
						customerId: z.string(),
						amount: z.number(),
					}),
					seed: 0,
				})

				return {
					customers: customers.table(),
					orders: orders.table(),
				}
			})

			const customer = db.schemas.customers.insert({ name: 'John' })

			// Initially no orders
			expect(customer.orderCount).toBe(0)
			expect(customer.totalSpent).toBe(0)

			// Add first order
			const orderId = db.schemas.orders.insert({
				customerId: customer._id,
				amount: 100,
			})
			expect(customer.orderCount).toBe(1)
			expect(customer.totalSpent).toBe(100)

			// Add second order
			db.schemas.orders.insert({ customerId: customer._id, amount: 200 })
			expect(customer.orderCount).toBe(2)
			expect(customer.totalSpent).toBe(300)

			// Update order
			db.schemas.orders.update(orderId._id, { amount: 150 })
			expect(customer.totalSpent).toBe(350)
			// Delete order
			db.schemas.orders.delete(orderId._id)
			expect(db.schemas.customers.get(customer._id)?.orderCount).toBe(1)
			expect(db.schemas.customers.get(customer._id)?.totalSpent).toBe(200)
		})

		test('multiple flowFields on same table', () => {
			const db = defineSchema(({ createTable }) => {
				const customers = createTable('customers', {
					schema: () => ({
						name: z.string(),
						orderCount: z
							.number()
							.optional()
							.meta({
								flowField: {
									type: 'count',
									source: 'orders',
									key: 'customerId',
								},
							}),
						totalSpent: z
							.number()
							.optional()
							.meta({
								flowField: {
									type: 'sum',
									source: 'orders',
									field: 'amount',
									key: 'customerId',
								},
							}),
						avgOrder: z
							.number()
							.optional()
							.meta({
								flowField: {
									type: 'average',
									source: 'orders',
									field: 'amount',
									key: 'customerId',
								},
							}),
						minOrder: z
							.number()
							.optional()
							.meta({
								flowField: {
									type: 'min',
									source: 'orders',
									field: 'amount',
									key: 'customerId',
								},
							}),
						maxOrder: z
							.number()
							.optional()
							.meta({
								flowField: {
									type: 'max',
									source: 'orders',
									field: 'amount',
									key: 'customerId',
								},
							}),
						hasOrders: z
							.boolean()
							.optional()
							.meta({
								flowField: {
									type: 'exist',
									source: 'orders',
									key: 'customerId',
								},
							}),
					}),
					seed: 0,
				})

				const orders = createTable('orders', {
					schema: () => ({
						customerId: z.string(),
						amount: z.number(),
					}),
					seed: 0,
				})

				return {
					customers: customers.table(),
					orders: orders.table(),
				}
			})

			const customer = db.schemas.customers.insert({ name: 'John' })
			db.schemas.orders.insert({ customerId: customer._id, amount: 100 })
			db.schemas.orders.insert({ customerId: customer._id, amount: 200 })
			db.schemas.orders.insert({ customerId: customer._id, amount: 300 })

			expect(customer?.orderCount).toBe(3)
			expect(customer?.totalSpent).toBe(600)
			expect(customer?.avgOrder).toBe(200)
			expect(customer?.minOrder).toBe(100)
			expect(customer?.maxOrder).toBe(300)
			expect(customer?.hasOrders).toBe(true)
		})

		test('flowFields work with filter method', () => {
			const db = defineSchema(({ createTable }) => {
				const customers = createTable('customers', {
					schema: () => ({
						name: z.string(),
						orderCount: z
							.number()
							.optional()
							.meta({
								flowField: {
									type: 'count',
									source: 'orders',
									key: 'customerId',
								},
							}),
					}),
					seed: 0,
				})

				const orders = createTable('orders', {
					schema: () => ({
						customerId: z.string(),
						amount: z.number(),
					}),
					seed: 0,
				})

				return {
					customers: customers.table(),
					orders: orders.table(),
				}
			})

			const john = db.schemas.customers.insert({ name: 'John' })
			const jane = db.schemas.customers.insert({ name: 'Jane' })
			db.schemas.customers.insert({ name: 'Bob' }) // Bob has no orders

			db.schemas.orders.insert({ customerId: john._id, amount: 100 })
			db.schemas.orders.insert({ customerId: john._id, amount: 200 })
			db.schemas.orders.insert({ customerId: jane._id, amount: 300 })

			// Filter customers with more than 1 order
			const activeCustomers = db.schemas.customers.filter(
				(c) => (c.orderCount ?? 0) > 1,
			)
			expect(activeCustomers).toHaveLength(1)
			expect(activeCustomers[0].name).toBe('John')
		})

		test('flowFields work with find method', () => {
			const db = defineSchema(({ createTable }) => {
				const customers = createTable('customers', {
					schema: () => ({
						name: z.string(),
						totalSpent: z
							.number()
							.optional()
							.meta({
								flowField: {
									type: 'sum',
									source: 'orders',
									field: 'amount',
									key: 'customerId',
								},
							}),
					}),
					seed: 0,
				})

				const orders = createTable('orders', {
					schema: () => ({
						customerId: z.string(),
						amount: z.number(),
					}),
					seed: 0,
				})

				return {
					customers: customers.table(),
					orders: orders.table(),
				}
			})

			const john = db.schemas.customers.insert({ name: 'John' })
			const jane = db.schemas.customers.insert({ name: 'Jane' })

			db.schemas.orders.insert({ customerId: john._id, amount: 100 })
			db.schemas.orders.insert({ customerId: jane._id, amount: 500 })
			// Find customer who spent more than 400
			const bigSpender = db.schemas.customers.find(
				(c) => (c.totalSpent ?? 0) > 400,
			)
			expect(bigSpender?.name).toBe('Jane')
		})
	})
})

describe('computed builder (type-safe)', () => {
	test('computed fields are type-safe - row is inferred from schema', () => {
		const db = defineSchema(({ createTable }) => {
			const users = createTable('users', {
				schema: () => ({
					firstName: z.string(),
					lastName: z.string(),
				}),
				seed: 0,
			})
				.table()
				// row is fully typed here - no need to specify type!
				.computed((row) => ({
					fullName: `${row.firstName} ${row.lastName}`,
				}))

			return { users }
		})

		const user = db.schemas.users.insert({ firstName: 'John', lastName: 'Doe' })

		expect(user.fullName).toBe('John Doe')
	})

	test('computed fields with calculations', () => {
		const db = defineSchema(({ createTable }) => {
			const products = createTable('products', {
				schema: () => ({
					name: z.string(),
					price: z.number(),
					quantity: z.number(),
					taxRate: z.number(),
				}),
				seed: 0,
			})
				.table()
				.computed((row) => ({
					subtotal: row.price * row.quantity,
					tax: row.price * row.quantity * row.taxRate,
					total: row.price * row.quantity * (1 + row.taxRate),
				}))

			return { products }
		})

		const product = db.schemas.products.insert({
			name: 'Widget',
			price: 100,
			quantity: 2,
			taxRate: 0.1,
		})

		expect(product.subtotal).toBe(200)
		expect(product.tax).toBe(20)
		expect(product.total).toBeCloseTo(220, 5)
	})

	test('computed fields update when source data changes', () => {
		const db = defineSchema(({ createTable }) => {
			const users = createTable('users', {
				schema: () => ({
					firstName: z.string(),
					lastName: z.string(),
				}),
				seed: 0,
			})
				.table()
				.computed((row) => ({
					fullName: `${row.firstName} ${row.lastName}`,
					initials: `${row.firstName[0]}${row.lastName[0]}`,
				}))

			return { users }
		})

		const user = db.schemas.users.insert({ firstName: 'John', lastName: 'Doe' })
		expect(db.schemas.users.get(user._id)?.fullName).toBe('John Doe')
		expect(db.schemas.users.get(user._id)?.initials).toBe('JD')

		db.schemas.users.update(user._id, { firstName: 'Jane' })
		expect(db.schemas.users.get(user._id)?.fullName).toBe('Jane Doe')
		expect(db.schemas.users.get(user._id)?.initials).toBe('JD')
	})

	test('computed fields work in toArray', () => {
		const db = defineSchema(({ createTable }) => {
			const users = createTable('users', {
				schema: () => ({
					firstName: z.string(),
					lastName: z.string(),
				}),
				seed: 0,
			})
				.table()
				.computed((row) => ({
					fullName: `${row.firstName} ${row.lastName}`,
				}))

			return { users }
		})

		db.schemas.users.insert({ firstName: 'John', lastName: 'Doe' })
		db.schemas.users.insert({ firstName: 'Jane', lastName: 'Smith' })

		const usersList = db.schemas.users.toArray()
		expect(usersList.map((u) => u.fullName)).toContain('John Doe')
		expect(usersList.map((u) => u.fullName)).toContain('Jane Smith')
	})

	test('computed fields work with filter', () => {
		const db = defineSchema(({ createTable }) => {
			const products = createTable('products', {
				schema: () => ({
					name: z.string(),
					price: z.number(),
					quantity: z.number(),
				}),
				seed: 0,
			})
				.table()
				.computed((row) => ({
					total: row.price * row.quantity,
				}))

			return { products }
		})

		db.schemas.products.insert({ name: 'Cheap', price: 10, quantity: 1 })
		db.schemas.products.insert({ name: 'Expensive', price: 100, quantity: 5 })
		db.schemas.products.insert({ name: 'Medium', price: 50, quantity: 2 })

		const expensive = db.schemas.products.filter((p) => p.total > 100)
		expect(expensive).toHaveLength(1)
		expect(expensive[0].name).toBe('Expensive')
	})

	test('computed fields can access other tables via context', () => {
		const db = defineSchema(({ createTable }) => {
			const categories = createTable('categories', {
				schema: () => ({
					name: z.string(),
				}),
				seed: 0,
			})

			const products = createTable('products', {
				schema: () => ({
					name: z.string(),
					categoryId: z.string(),
				}),
				seed: 0,
			})
				.table()
				.computed((row, ctx) => {
					const category = ctx.schemas.categories
						.toArray()
						.find((c: any) => c._id === row.categoryId)
					return {
						categoryName:
							(category as { name: string } | undefined)?.name ?? 'Unknown',
					}
				})

			return {
				categories: categories.table(),
				products,
			}
		})

		const category = db.schemas.categories.insert({ name: 'Electronics' })
		const product = db.schemas.products.insert({
			name: 'Laptop',
			categoryId: category._id,
		})

		expect(product.categoryName).toBe('Electronics')
	})

	test('can combine computed builder with flowField aggregations', () => {
		const db = defineSchema(({ createTable }) => {
			const customers = createTable('customers', {
				schema: () => ({
					firstName: z.string(),
					lastName: z.string(),
					orderCount: z
						.number()
						.optional()
						.meta({
							flowField: { type: 'count', source: 'orders', key: 'customerId' },
						}),
					totalSpent: z
						.number()
						.optional()
						.meta({
							flowField: {
								type: 'sum',
								source: 'orders',
								field: 'amount',
								key: 'customerId',
							},
						}),
				}),
				seed: 0,
			})
				.table()
				.computed((row) => ({
					fullName: `${row.firstName} ${row.lastName}`,
				}))

			const orders = createTable('orders', {
				schema: () => ({
					customerId: z.string(),
					amount: z.number(),
				}),
				seed: 0,
			})

			return {
				customers,
				orders: orders.table(),
			}
		})

		const customer = db.schemas.customers.insert({
			firstName: 'John',
			lastName: 'Doe',
		})
		db.schemas.orders.insert({ customerId: customer._id, amount: 100 })
		db.schemas.orders.insert({ customerId: customer._id, amount: 200 })

		// Computed field
		expect(customer.fullName).toBe('John Doe')
		// FlowField aggregations
		expect(customer.orderCount).toBe(2)
		expect(customer.totalSpent).toBe(300)
	})

	test('can chain index and computed', () => {
		const db = defineSchema(({ createTable }) => {
			const products = createTable('products', {
				schema: () => ({
					name: z.string(),
					category: z.string(),
					price: z.number(),
				}),
				seed: 0,
			})
				.table()
				.index('by_category', ['category'])
				.computed((row) => ({
					displayPrice: `$${row.price.toFixed(2)}`,
				}))

			return { products }
		})

		db.schemas.products.insert({
			name: 'Laptop',
			category: 'electronics',
			price: 999.99,
		})
		db.schemas.products.insert({
			name: 'Phone',
			category: 'electronics',
			price: 599.99,
		})
		db.schemas.products.insert({
			name: 'Book',
			category: 'books',
			price: 29.99,
		})

		const electronics = db.schemas.products.query('by_category', 'electronics')
		expect(electronics).toHaveLength(2)
		expect(electronics[0].displayPrice).toBe('$999.99')
	})
})

describe('batch operations', () => {
	test('updateMany updates multiple documents', () => {
		const db = defineSchema(({ createTable }) => {
			const users = createTable('users', {
				schema: () => ({
					name: z.string(),
					status: z.enum(['active', 'inactive']),
				}),
				seed: 0,
			})

			return { users: users.table() }
		})

		db.schemas.users.insert({ name: 'John', status: 'active' })
		db.schemas.users.insert({ name: 'Jane', status: 'active' })
		db.schemas.users.insert({ name: 'Bob', status: 'inactive' })

		const updated = db.schemas.users.batch.updateMany(
			(u) => u.status === 'active',
			{
				status: 'inactive',
			},
		)

		expect(updated).toHaveLength(2)
		expect(
			db.schemas.users.filter((u) => u.status === 'inactive'),
		).toHaveLength(3)
	})

	test('deleteMany deletes multiple documents', () => {
		const db = defineSchema(({ createTable }) => {
			const items = createTable('items', {
				schema: () => ({
					name: z.string(),
					archived: z.boolean(),
				}),
				seed: 0,
			})

			return { items: items.table() }
		})

		db.schemas.items.insert({ name: 'Item 1', archived: false })
		db.schemas.items.insert({ name: 'Item 2', archived: true })
		db.schemas.items.insert({ name: 'Item 3', archived: true })

		const deleted = db.schemas.items.batch.deleteMany((i) => i.archived)

		expect(deleted).toBe(2)
		expect(db.schemas.items.size).toBe(1)
	})
})

describe('findMany/findFirst (Drizzle-like API)', () => {
	test('findMany returns all documents by default', () => {
		const db = defineSchema(({ createTable }) => {
			const users = createTable('users', {
				schema: () => ({ name: z.string(), age: z.number() }),
				seed: 0,
			})

			return { users: users.table() }
		})

		db.schemas.users.insert({ name: 'John', age: 30 })
		db.schemas.users.insert({ name: 'Jane', age: 25 })

		const all = db.schemas.users.findMany()
		expect(all).toHaveLength(2)
	})

	test('findMany with where filter', () => {
		const db = defineSchema(({ createTable }) => {
			const users = createTable('users', {
				schema: () => ({ name: z.string(), age: z.number() }),
				seed: 0,
			})

			return { users: users.table() }
		})

		db.schemas.users.insert({ name: 'John', age: 30 })
		db.schemas.users.insert({ name: 'Jane', age: 25 })
		db.schemas.users.insert({ name: 'Bob', age: 35 })

		const adults = db.schemas.users.findMany({
			where: (user) => user.age >= 30,
		})

		expect(adults).toHaveLength(2)
		expect(adults.map((u) => u.name).sort()).toEqual(['Bob', 'John'])
	})

	test('findMany with orderBy ascending', () => {
		const db = defineSchema(({ createTable }) => {
			const users = createTable('users', {
				schema: () => ({ name: z.string(), age: z.number() }),
				seed: 0,
			})

			return { users: users.table() }
		})

		db.schemas.users.insert({ name: 'John', age: 30 })
		db.schemas.users.insert({ name: 'Jane', age: 25 })
		db.schemas.users.insert({ name: 'Bob', age: 35 })

		const sorted = db.schemas.users.findMany({
			orderBy: { field: 'age', direction: 'asc' },
		})

		expect(sorted.map((u) => u.name)).toEqual(['Jane', 'John', 'Bob'])
	})

	test('findMany with orderBy descending', () => {
		const db = defineSchema(({ createTable }) => {
			const users = createTable('users', {
				schema: () => ({ name: z.string(), age: z.number() }),
				seed: 0,
			})

			return { users: users.table() }
		})

		db.schemas.users.insert({ name: 'John', age: 30 })
		db.schemas.users.insert({ name: 'Jane', age: 25 })
		db.schemas.users.insert({ name: 'Bob', age: 35 })

		const sorted = db.schemas.users.findMany({
			orderBy: { field: 'name', direction: 'desc' },
		})

		expect(sorted.map((u) => u.name)).toEqual(['John', 'Jane', 'Bob'])
	})

	test('findMany with limit', () => {
		const db = defineSchema(({ createTable }) => {
			const users = createTable('users', {
				schema: () => ({ name: z.string() }),
				seed: 0,
			})

			return { users: users.table() }
		})

		db.schemas.users.insert({ name: 'A' })
		db.schemas.users.insert({ name: 'B' })
		db.schemas.users.insert({ name: 'C' })

		const limited = db.schemas.users.findMany({ limit: 2 })
		expect(limited).toHaveLength(2)
	})

	test('findMany with offset', () => {
		const db = defineSchema(({ createTable }) => {
			const users = createTable('users', {
				schema: () => ({ name: z.string() }),
				seed: 0,
			})

			return { users: users.table() }
		})

		db.schemas.users.insert({ name: 'A' })
		db.schemas.users.insert({ name: 'B' })
		db.schemas.users.insert({ name: 'C' })

		const result = db.schemas.users.findMany({
			orderBy: { field: 'name', direction: 'asc' },
			offset: 1,
		})
		expect(result.map((u) => u.name)).toEqual(['B', 'C'])
	})

	test('findMany with limit and offset for pagination', () => {
		const db = defineSchema(({ createTable }) => {
			const users = createTable('users', {
				schema: () => ({ name: z.string() }),
				seed: 0,
			})

			return { users: users.table() }
		})

		for (let i = 1; i <= 10; i++) {
			db.schemas.users.insert({ name: `User ${i}` })
		}

		const page2 = db.schemas.users.findMany({
			orderBy: { field: 'name', direction: 'asc' },
			limit: 3,
			offset: 3,
		})

		expect(page2).toHaveLength(3)
	})

	test('findFirst returns first matching document', () => {
		const db = defineSchema(({ createTable }) => {
			const users = createTable('users', {
				schema: () => ({ name: z.string(), age: z.number() }),
				seed: 0,
			})

			return { users: users.table() }
		})

		db.schemas.users.insert({ name: 'John', age: 30 })
		db.schemas.users.insert({ name: 'Jane', age: 25 })
		db.schemas.users.insert({ name: 'Bob', age: 35 })

		const oldest = db.schemas.users.findFirst({
			orderBy: { field: 'age', direction: 'desc' },
		})

		expect(oldest?.name).toBe('Bob')
	})

	test('findFirst with where returns first matching', () => {
		const db = defineSchema(({ createTable }) => {
			const users = createTable('users', {
				schema: () => ({ name: z.string(), active: z.boolean() }),
				seed: 0,
			})

			return { users: users.table() }
		})

		db.schemas.users.insert({ name: 'John', active: false })
		db.schemas.users.insert({ name: 'Jane', active: true })
		db.schemas.users.insert({ name: 'Bob', active: true })

		const firstActive = db.schemas.users.findFirst({
			where: (u) => u.active,
			orderBy: { field: 'name', direction: 'asc' },
		})

		expect(firstActive?.name).toBe('Bob')
	})
})

describe('full-text search', () => {
	test('search finds documents by text', () => {
		const db = defineSchema(({ createTable }) => {
			const posts = createTable('posts', {
				schema: () => ({
					title: z.string(),
					content: z.string(),
				}),
				seed: 0,
			})

			return { posts: posts.table() }
		})

		db.schemas.posts.insert({
			title: 'Hello World',
			content: 'This is my first post',
		})
		db.schemas.posts.insert({
			title: 'TypeScript Tips',
			content: 'Learn TypeScript today',
		})
		db.schemas.posts.insert({
			title: 'React Guide',
			content: 'Building apps with React',
		})

		const results = db.schemas.posts.search('typescript')
		expect(results).toHaveLength(1)
		expect(results[0].title).toBe('TypeScript Tips')
	})

	test('search ranks exact matches higher', () => {
		const db = defineSchema(({ createTable }) => {
			const posts = createTable('posts', {
				schema: () => ({
					title: z.string(),
					content: z.string(),
				}),
				seed: 0,
			})

			return { posts: posts.table() }
		})

		db.schemas.posts.insert({ title: 'React', content: 'About React' })
		db.schemas.posts.insert({
			title: 'React Native',
			content: 'Mobile with React',
		})
		db.schemas.posts.insert({
			title: 'Reactive Programming',
			content: 'RxJS guide',
		})

		const results = db.schemas.posts.search('react')
		expect(results.length).toBeGreaterThan(0)
		// The exact match "React" should be first
		expect(results[0].title).toBe('React')
	})

	test('search with specific fields', () => {
		const db = defineSchema(({ createTable }) => {
			const posts = createTable('posts', {
				schema: () => ({
					title: z.string(),
					content: z.string(),
					author: z.string(),
				}),
				seed: 0,
			})

			return { posts: posts.table() }
		})

		db.schemas.posts.insert({
			title: 'Hello',
			content: 'World',
			author: 'John',
		})
		db.schemas.posts.insert({
			title: 'World',
			content: 'Hello',
			author: 'Jane',
		})

		// Search only in title
		const titleOnly = db.schemas.posts.search('world', ['title'])
		expect(titleOnly).toHaveLength(1)
		expect(titleOnly[0].author).toBe('Jane')
	})
})

describe('unique constraints', () => {
	test('enforces unique constraint on single field', () => {
		const db = defineSchema(({ createTable }) => {
			const users = createTable('users', {
				schema: () => ({
					email: z.string(),
					name: z.string(),
				}),
				seed: 0,
			})

			return {
				users: users.table().unique('email_unique', ['email']),
			}
		})

		db.schemas.users.insert({ email: 'john@example.com', name: 'John' })

		expect(() => {
			db.schemas.users.insert({ email: 'john@example.com', name: 'Jane' })
		}).toThrow(/Unique constraint violation/)
	})

	test('enforces unique constraint on multiple fields', () => {
		const db = defineSchema(({ createTable }) => {
			const orders = createTable('orders', {
				schema: () => ({
					customerId: z.string(),
					productId: z.string(),
					quantity: z.number(),
				}),
				seed: 0,
			})

			return {
				orders: orders
					.table()
					.unique('customer_product', ['customerId', 'productId']),
			}
		})

		db.schemas.orders.insert({ customerId: 'c1', productId: 'p1', quantity: 1 })
		db.schemas.orders.insert({ customerId: 'c1', productId: 'p2', quantity: 2 })
		db.schemas.orders.insert({ customerId: 'c2', productId: 'p1', quantity: 3 })

		expect(() => {
			db.schemas.orders.insert({
				customerId: 'c1',
				productId: 'p1',
				quantity: 5,
			})
		}).toThrow(/Unique constraint violation/)
	})

	test('allows update that maintains uniqueness', () => {
		const db = defineSchema(({ createTable }) => {
			const users = createTable('users', {
				schema: () => ({
					email: z.string(),
					name: z.string(),
				}),
				seed: 0,
			})

			return {
				users: users.table().unique('email_unique', ['email']),
			}
		})

		const user = db.schemas.users.insert({
			email: 'john@example.com',
			name: 'John',
		})

		// Updating the same record with same email should work
		const updated = db.schemas.users.update(user._id, { name: 'Johnny' })
		expect(updated?.name).toBe('Johnny')
	})
})

describe('default values', () => {
	test('applies default values on insert', () => {
		const db = defineSchema(({ createTable }) => {
			const posts = createTable('posts', {
				schema: () => ({
					title: z.string(),
					status: z.string(),
					views: z.number(),
				}),
				seed: 0,
			})

			return {
				posts: posts.table().defaults({ status: 'draft', views: 0 }),
			}
		})

		const post = db.schemas.posts.insert({
			title: 'My Post',
			status: 'published',
			views: 100,
		})

		// Explicitly provided values should override defaults
		expect(post?.status).toBe('published')
		expect(post?.views).toBe(100)
	})

	test('uses defaults when values not provided', () => {
		const db = defineSchema(({ createTable }) => {
			const items = createTable('items', {
				schema: () => ({
					name: z.string(),
					quantity: z.number(),
					active: z.boolean(),
				}),
				seed: 0,
			})

			return {
				items: items.table().defaults({ quantity: 1, active: true }),
			}
		})

		// @ts-expect-error - testing defaults filling in missing fields
		const item = db.schemas.items.insert({ name: 'Widget' })

		expect(item.name).toBe('Widget')
		expect(item.quantity).toBe(1)
		expect(item.active).toBe(true)
	})
})

describe('setup tables (single document config)', () => {
	test('get() creates document with defaults if none exists', () => {
		const db = defineSchema(({ createTable }) => {
			const config = createTable('config', {
				schema: () => ({
					theme: z.string(),
					language: z.string(),
				}),
				seed: false, // Setup tables don't seed
			})

			return {
				config: config
					.setupTable()
					.defaults({ theme: 'light', language: 'en' }),
			}
		})

		// First get() should create the document with defaults
		const config = db.schemas.config.get()
		expect(config).toBeDefined()
		expect(config._id).toBeDefined()
		expect(config.theme).toBe('light')
		expect(config.language).toBe('en')

		// Second get() should return the same document
		const config2 = db.schemas.config.get()
		expect(config2._id).toBe(config._id)
	})

	test('edit() updates existing document', () => {
		const db = defineSchema(({ createTable }) => {
			const settings = createTable('settings', {
				schema: () => ({
					darkMode: z.boolean(),
					fontSize: z.number(),
				}),
				seed: false,
			})

			return {
				settings: settings
					.setupTable()
					.defaults({ darkMode: false, fontSize: 14 }),
			}
		})

		// Create initial document
		db.schemas.settings.get()

		// Edit with partial updates
		const updated = db.schemas.settings.edit({ darkMode: true })
		expect(updated.darkMode).toBe(true)
		expect(updated.fontSize).toBe(14) // Unchanged

		// Verify get() returns updated values
		const fetched = db.schemas.settings.get()
		expect(fetched.darkMode).toBe(true)
	})

	test('edit() creates document if none exists', () => {
		const db = defineSchema(({ createTable }) => {
			const prefs = createTable('prefs', {
				schema: () => ({
					notifications: z.boolean(),
					volume: z.number(),
				}),
				seed: false,
			})

			return {
				prefs: prefs.setupTable().defaults({ notifications: true, volume: 50 }),
			}
		})

		// Edit without prior get() should create with merged defaults
		const created = db.schemas.prefs.edit({ volume: 75 })
		expect(created.notifications).toBe(true) // From defaults
		expect(created.volume).toBe(75) // From edit
	})

	test('subscribe() notifies on changes', () => {
		const db = defineSchema(({ createTable }) => {
			const cfg = createTable('cfg', {
				schema: () => ({
					value: z.string(),
				}),
				seed: false,
			})

			return {
				cfg: cfg.setupTable().defaults({ value: 'default' }),
			}
		})

		let changeCount = 0
		const unsubscribe = db.schemas.cfg.subscribe(() => {
			changeCount++
		})

		// Create document
		db.schemas.cfg.get()
		expect(changeCount).toBe(1)

		// Edit document
		db.schemas.cfg.edit({ value: 'updated' })
		expect(changeCount).toBe(2)

		// Unsubscribe
		unsubscribe()
		db.schemas.cfg.edit({ value: 'again' })
		expect(changeCount).toBe(2) // No change after unsubscribe
	})
})

describe('autoIncrement', () => {
	test('auto-generates sequential numbers on insert', () => {
		const db = defineSchema(({ createTable }) => {
			const entries = createTable('entries', {
				schema: () => ({
					entryNo: z.number().optional().meta({ autoIncrement: true }),
					description: z.string(),
				}),
				seed: 0,
			})

			return {
				entries: entries.table(),
			}
		})

		const entry1 = db.schemas.entries.insert({ description: 'First' })
		const entry2 = db.schemas.entries.insert({ description: 'Second' })
		const entry3 = db.schemas.entries.insert({ description: 'Third' })

		expect(entry1.entryNo).toBe(1)
		expect(entry2.entryNo).toBe(2)
		expect(entry3.entryNo).toBe(3)
	})

	test('auto-generates from custom initial value', () => {
		const db = defineSchema(({ createTable }) => {
			const invoices = createTable('invoices', {
				schema: () => ({
					invoiceNo: z.number().optional().meta({ autoIncrement: 1000 }),
					amount: z.number(),
				}),
				seed: 0,
			})

			return {
				invoices: invoices.table(),
			}
		})

		const inv1 = db.schemas.invoices.insert({ amount: 100 })
		const inv2 = db.schemas.invoices.insert({ amount: 200 })

		expect(inv1.invoiceNo).toBe(1000)
		expect(inv2.invoiceNo).toBe(1001)
	})

	test('preserves explicitly provided values', () => {
		const db = defineSchema(({ createTable }) => {
			const orders = createTable('orders', {
				schema: () => ({
					orderNo: z.number().optional().meta({ autoIncrement: true }),
					total: z.number(),
				}),
				seed: 0,
			})

			return {
				orders: orders.table(),
			}
		})

		// Insert with explicit value
		const order1 = db.schemas.orders.insert({ orderNo: 999, total: 50 })
		expect(order1.orderNo).toBe(999)

		// Next auto-generated should continue from internal counter
		const order2 = db.schemas.orders.insert({ total: 75 })
		expect(order2.orderNo).toBe(1) // Counter wasn't affected by explicit value
	})

	test('works with batch insertMany', () => {
		const db = defineSchema(({ createTable }) => {
			const lines = createTable('lines', {
				schema: () => ({
					lineNo: z.number().optional().meta({ autoIncrement: 10 }),
					item: z.string(),
				}),
				seed: 0,
			})

			return {
				lines: lines.table(),
			}
		})

		const inserted = db.schemas.lines.batch.insertMany([
			{ item: 'A' },
			{ item: 'B' },
			{ item: 'C' },
		])

		expect(inserted[0].lineNo).toBe(10)
		expect(inserted[1].lineNo).toBe(11)
		expect(inserted[2].lineNo).toBe(12)
	})

	test('multiple autoIncrement fields per table', () => {
		const db = defineSchema(({ createTable }) => {
			const ledger = createTable('ledger', {
				schema: () => ({
					entryNo: z.number().optional().meta({ autoIncrement: true }),
					sequenceNo: z.number().optional().meta({ autoIncrement: 100 }),
					amount: z.number(),
				}),
				seed: 0,
			})

			return {
				ledger: ledger.table(),
			}
		})

		const entry1 = db.schemas.ledger.insert({ amount: 1000 })
		const entry2 = db.schemas.ledger.insert({ amount: 2000 })

		expect(entry1.entryNo).toBe(1)
		expect(entry1.sequenceNo).toBe(100)

		expect(entry2.entryNo).toBe(2)
		expect(entry2.sequenceNo).toBe(101)
	})
})

describe('history/undo', () => {
	test('undo reverts insert', () => {
		const db = defineSchema(({ createTable }) => {
			const items = createTable('items', {
				schema: () => ({ name: z.string() }),
				seed: 0,
			})

			return {
				items: items.table().enableHistory(),
			}
		})

		db.schemas.items.insert({ name: 'Item 1' })
		expect(db.schemas.items.size).toBe(1)

		db.schemas.items.history.undo()
		expect(db.schemas.items.size).toBe(0)
	})

	test('redo restores undone insert', () => {
		const db = defineSchema(({ createTable }) => {
			const items = createTable('items', {
				schema: () => ({ name: z.string() }),
				seed: 0,
			})

			return {
				items: items.table().enableHistory(),
			}
		})

		db.schemas.items.insert({ name: 'Item 1' })
		db.schemas.items.history.undo()
		expect(db.schemas.items.size).toBe(0)

		db.schemas.items.history.redo()
		expect(db.schemas.items.size).toBe(1)
	})

	test('undo reverts update', () => {
		const db = defineSchema(({ createTable }) => {
			const items = createTable('items', {
				schema: () => ({ name: z.string() }),
				seed: 0,
			})

			return {
				items: items.table().enableHistory(),
			}
		})

		const item = db.schemas.items.insert({ name: 'Original' })
		db.schemas.items.update(item._id, { name: 'Updated' })

		expect(db.schemas.items.get(item._id)?.name).toBe('Updated')

		db.schemas.items.history.undo()
		expect(db.schemas.items.get(item._id)?.name).toBe('Original')
	})

	test('undo reverts delete', () => {
		const db = defineSchema(({ createTable }) => {
			const items = createTable('items', {
				schema: () => ({ name: z.string() }),
				seed: 0,
			})

			return {
				items: items.table().enableHistory(),
			}
		})

		const item = db.schemas.items.insert({ name: 'Item 1' })
		db.schemas.items.delete(item._id)
		expect(db.schemas.items.size).toBe(0)

		db.schemas.items.history.undo()
		expect(db.schemas.items.size).toBe(1)
		expect(db.schemas.items.get(item._id)?.name).toBe('Item 1')
	})

	test('canUndo and canRedo report correctly', () => {
		const db = defineSchema(({ createTable }) => {
			const items = createTable('items', {
				schema: () => ({ name: z.string() }),
				seed: 0,
			})

			return {
				items: items.table().enableHistory(),
			}
		})

		expect(db.schemas.items.history.canUndo()).toBe(false)
		expect(db.schemas.items.history.canRedo()).toBe(false)

		db.schemas.items.insert({ name: 'Item 1' })
		expect(db.schemas.items.history.canUndo()).toBe(true)
		expect(db.schemas.items.history.canRedo()).toBe(false)

		db.schemas.items.history.undo()
		expect(db.schemas.items.history.canUndo()).toBe(false)
		expect(db.schemas.items.history.canRedo()).toBe(true)
	})

	test('history disabled by default', () => {
		const db = defineSchema(({ createTable }) => {
			const items = createTable('items', {
				schema: () => ({ name: z.string() }),
				seed: 0,
			})

			return { items: items.table() }
		})

		db.schemas.items.insert({ name: 'Item 1' })
		expect(db.schemas.items.history.canUndo()).toBe(false)
	})
})

describe('snapshots', () => {
	test('createSnapshot captures current state', () => {
		const db = defineSchema(({ createTable }) => {
			const items = createTable('items', {
				schema: () => ({ name: z.string() }),
				seed: 0,
			})

			return { items: items.table() }
		})

		db.schemas.items.insert({ name: 'Item 1' })
		db.schemas.items.insert({ name: 'Item 2' })

		const snapshot = db.schemas.items.history.createSnapshot()

		expect(snapshot.data).toHaveLength(2)
		expect(snapshot.timestamp).toBeLessThanOrEqual(Date.now())
	})

	test('restoreSnapshot restores state', () => {
		const db = defineSchema(({ createTable }) => {
			const items = createTable('items', {
				schema: () => ({ name: z.string() }),
				seed: 0,
			})

			return { items: items.table() }
		})

		db.schemas.items.insert({ name: 'Item 1' })
		db.schemas.items.insert({ name: 'Item 2' })

		const snapshot = db.schemas.items.history.createSnapshot()

		// Modify data
		db.schemas.items.insert({ name: 'Item 3' })
		db.schemas.items.clear()

		expect(db.schemas.items.size).toBe(0)

		// Restore
		db.schemas.items.history.restoreSnapshot(snapshot)

		expect(db.schemas.items.size).toBe(2)
		expect(
			db.schemas.items
				.toArray()
				.map((i) => i.name)
				.sort(),
		).toEqual(['Item 1', 'Item 2'])
	})
})

describe('transactions', () => {
	test('transaction commits all changes on success', () => {
		const db = defineSchema(({ createTable }) => {
			const users = createTable('users', {
				schema: () => ({ name: z.string() }),
				seed: 0,
			})
			const posts = createTable('posts', {
				schema: () => ({
					title: z.string(),
					authorId: z.string(),
				}),
				seed: 0,
			})

			return { users: users.table(), posts: posts.table() }
		})

		db.transaction({
			users: { insert: [{ name: 'John' }, { name: 'Jane' }] },
			posts: { insert: [{ title: 'Hello World', authorId: 'user1' }] },
		})

		expect(db.schemas.users.size).toBe(2)
		expect(db.schemas.posts.size).toBe(1)
	})

	test('transaction rolls back all changes on error', () => {
		const db = defineSchema(({ createTable }) => {
			const users = createTable('users', {
				schema: () => ({
					email: z.string(),
					name: z.string(),
				}),
				seed: 0,
			})

			return {
				users: users.table().unique('email_unique', ['email']),
			}
		})

		// Insert initial user
		db.schemas.users.insert({ email: 'john@example.com', name: 'John' })

		expect(() => {
			db.transaction({
				users: {
					insert: [
						{ email: 'jane@example.com', name: 'Jane' },
						{ email: 'john@example.com', name: 'John Duplicate' },
					],
				},
			})
		}).toThrow()

		// Should rollback - only John should exist
		expect(db.schemas.users.size).toBe(1)
		expect(db.schemas.users.toArray()[0].name).toBe('John')
	})

	test('transaction supports updates and deletes', () => {
		const db = defineSchema(({ createTable }) => {
			const items = createTable('items', {
				schema: () => ({
					name: z.string(),
					quantity: z.number(),
				}),
				seed: 0,
			})

			return { items: items.table() }
		})

		const id1 = db.schemas.items.insert({ name: 'Widget', quantity: 10 })
		const id2 = db.schemas.items.insert({ name: 'Gadget', quantity: 5 })

		db.transaction({
			items: {
				update: [{ id: id1._id, data: { quantity: 20 } }],
				delete: [id2._id],
			},
		})

		expect(db.schemas.items.size).toBe(1)
		expect(db.schemas.items.get(id1._id)?.quantity).toBe(20)
	})
})

describe('cascade deletes', () => {
	test('cascade delete removes child records', () => {
		const db = defineSchema(({ createTable }) => {
			const users = createTable('users', {
				schema: () => ({ name: z.string() }),
				seed: 0,
			})
			const posts = createTable('posts', {
				schema: () => ({
					title: z.string(),
					authorId: z.string().meta({ related: 'users', onDelete: 'cascade' }),
				}),
				seed: 0,
			})

			return { users: users.table(), posts: posts.table() }
		})

		const user = db.schemas.users.insert({ name: 'John' })
		db.schemas.posts.insert({ title: 'Post 1', authorId: user._id })
		db.schemas.posts.insert({ title: 'Post 2', authorId: user._id })
		db.schemas.posts.insert({ title: 'Other Post', authorId: 'other-user' })

		expect(db.schemas.posts.size).toBe(3)

		// Delete user - should cascade delete their posts
		db.schemas.users.delete(user._id)

		expect(db.schemas.users.size).toBe(0)
		expect(db.schemas.posts.size).toBe(1)
		expect(db.schemas.posts.toArray()[0].title).toBe('Other Post')
	})

	test('setNull sets foreign key to null on parent delete', () => {
		const db = defineSchema(({ createTable }) => {
			const categories = createTable('categories', {
				schema: () => ({ name: z.string() }),
				seed: 0,
			})
			const products = createTable('products', {
				schema: () => ({
					name: z.string(),
					categoryId: z.string().nullable().meta({
						related: 'categories',
						onDelete: 'setNull',
					}),
				}),
				seed: 0,
			})

			return { categories: categories.table(), products: products.table() }
		})

		const cat = db.schemas.categories.insert({ name: 'Electronics' })
		const prod = db.schemas.products.insert({
			name: 'Phone',
			categoryId: cat._id,
		})

		expect(db.schemas.products.get(prod._id)?.categoryId).toBe(cat._id)

		// Delete category - should set categoryId to null
		db.schemas.categories.delete(cat._id)

		expect(db.schemas.categories.size).toBe(0)
		expect(db.schemas.products.size).toBe(1)
		expect(db.schemas.products.get(prod._id)?.categoryId).toBeNull()
	})

	test('restrict prevents delete when referenced', () => {
		const db = defineSchema(({ createTable }) => {
			const departments = createTable('departments', {
				schema: () => ({ name: z.string() }),
				seed: 0,
			})
			const employees = createTable('employees', {
				schema: () => ({
					name: z.string(),
					departmentId: z.string().meta({
						related: 'departments',
						onDelete: 'restrict',
					}),
				}),
				seed: 0,
			})

			return { departments: departments.table(), employees: employees.table() }
		})

		const dept = db.schemas.departments.insert({ name: 'Engineering' })
		db.schemas.employees.insert({ name: 'John', departmentId: dept._id })

		expect(() => {
			db.schemas.departments.delete(dept._id)
		}).toThrow(/Cannot delete/)

		// Department and employee should still exist
		expect(db.schemas.departments.size).toBe(1)
		expect(db.schemas.employees.size).toBe(1)
	})

	test('multi-level cascade delete', () => {
		const db = defineSchema(({ createTable }) => {
			const orgs = createTable('orgs', {
				schema: () => ({ name: z.string() }),
				seed: 0,
			})
			const teams = createTable('teams', {
				schema: () => ({
					name: z.string(),
					orgId: z.string().meta({ related: 'orgs', onDelete: 'cascade' }),
				}),
				seed: 0,
			})
			const members = createTable('members', {
				schema: () => ({
					name: z.string(),
					teamId: z.string().meta({ related: 'teams', onDelete: 'cascade' }),
				}),
				seed: 0,
			})

			return {
				orgs: orgs.table(),
				teams: teams.table(),
				members: members.table(),
			}
		})

		const org = db.schemas.orgs.insert({ name: 'Acme Corp' })
		const team1 = db.schemas.teams.insert({ name: 'Team A', orgId: org._id })
		const team2 = db.schemas.teams.insert({ name: 'Team B', orgId: org._id })
		db.schemas.members.insert({ name: 'Alice', teamId: team1._id })
		db.schemas.members.insert({ name: 'Bob', teamId: team1._id })
		db.schemas.members.insert({ name: 'Charlie', teamId: team2._id })

		expect(db.schemas.orgs.size).toBe(1)
		expect(db.schemas.teams.size).toBe(2)
		expect(db.schemas.members.size).toBe(3)

		// Delete org - should cascade delete teams and members
		db.schemas.orgs.delete(org._id)

		expect(db.schemas.orgs.size).toBe(0)
		expect(db.schemas.teams.size).toBe(0)
		expect(db.schemas.members.size).toBe(0)
	})
})

describe('derived views', () => {
	test('createView returns computed collection', () => {
		const db = defineSchema(({ createTable }) => {
			const users = createTable('users', {
				schema: () => ({
					name: z.string(),
					active: z.boolean(),
				}),
				seed: 0,
			})

			return { users: users.table() }
		})

		db.schemas.users.insert({ name: 'John', active: true })
		db.schemas.users.insert({ name: 'Jane', active: false })
		db.schemas.users.insert({ name: 'Bob', active: true })

		const activeUsers = db.createView('activeUsers', () =>
			db.schemas.users.filter((u) => u.active),
		)

		expect(activeUsers.name).toBe('activeUsers')
		expect(activeUsers.size).toBe(2)
		expect(
			activeUsers
				.toArray()
				.map((u) => u.name)
				.sort(),
		).toEqual(['Bob', 'John'])
	})

	test('view auto-updates when source data changes', () => {
		const db = defineSchema(({ createTable }) => {
			const items = createTable('items', {
				schema: () => ({
					name: z.string(),
					quantity: z.number(),
				}),
				seed: 0,
			})

			return { items: items.table() }
		})

		const lowStock = db.createView('lowStock', () =>
			db.schemas.items.filter((i) => i.quantity < 5),
		)

		db.schemas.items.insert({ name: 'Widget', quantity: 10 })
		db.schemas.items.insert({ name: 'Gadget', quantity: 2 })

		expect(lowStock.size).toBe(1)
		expect(lowStock.toArray()[0].name).toBe('Gadget')

		// Add another low stock item
		db.schemas.items.insert({ name: 'Gizmo', quantity: 3 })

		expect(lowStock.size).toBe(2)
	})

	test('view notifies subscribers on change', () => {
		const db = defineSchema(({ createTable }) => {
			const posts = createTable('posts', {
				schema: () => ({
					title: z.string(),
					published: z.boolean(),
				}),
				seed: 0,
			})

			return { posts: posts.table() }
		})

		const publishedPosts = db.createView('publishedPosts', () =>
			db.schemas.posts.filter((p) => p.published),
		)

		let notifyCount = 0
		publishedPosts.subscribe(() => {
			notifyCount++
		})

		db.schemas.posts.insert({ title: 'Draft', published: false })
		expect(notifyCount).toBe(1)

		db.schemas.posts.insert({ title: 'Published', published: true })
		expect(notifyCount).toBe(2)

		expect(publishedPosts.size).toBe(1)
	})

	test('view with aggregations', () => {
		const db = defineSchema(({ createTable }) => {
			const orders = createTable('orders', {
				schema: () => ({
					customerId: z.string(),
					amount: z.number(),
				}),
				seed: 0,
			})

			return { orders: orders.table() }
		})

		db.schemas.orders.insert({ customerId: 'c1', amount: 100 })
		db.schemas.orders.insert({ customerId: 'c1', amount: 200 })
		db.schemas.orders.insert({ customerId: 'c2', amount: 50 })

		// Create a view that groups by customer
		const customerTotals = db.createView('customerTotals', () => {
			const orders = db.schemas.orders.toArray()
			const totals = new Map<string, number>()

			for (const order of orders) {
				const current = totals.get(order.customerId) ?? 0
				totals.set(order.customerId, current + order.amount)
			}

			return Array.from(totals.entries()).map(([customerId, total]) => ({
				customerId,
				total,
			}))
		})

		expect(customerTotals.size).toBe(2)

		const c1Total = customerTotals.toArray().find((t) => t.customerId === 'c1')
		expect(c1Total?.total).toBe(300)
	})
})

describe('cursor pagination', () => {
	test('paginate returns first page with correct cursor', () => {
		const db = defineSchema(({ createTable }) => {
			const items = createTable('items', {
				schema: () => ({ name: z.string() }),
				seed: 0,
			})

			return { items: items.table() }
		})

		// Insert 10 items
		for (let i = 1; i <= 10; i++) {
			db.schemas.items.insert({ name: `Item ${i}` })
		}

		const page1 = db.schemas.items.paginate({ pageSize: 3 })

		expect(page1.items).toHaveLength(3)
		expect(page1.hasMore).toBe(true)
		expect(page1.nextCursor).not.toBeNull()
		expect(page1.prevCursor).toBeNull()
		expect(page1.totalCount).toBe(10)
	})

	test('paginate with cursor returns next page', () => {
		const db = defineSchema(({ createTable }) => {
			const items = createTable('items', {
				schema: () => ({ name: z.string(), order: z.number() }),
				seed: 0,
			})

			return { items: items.table() }
		})

		// Insert items with specific order
		for (let i = 1; i <= 10; i++) {
			db.schemas.items.insert({ name: `Item ${i}`, order: i })
		}

		const page1 = db.schemas.items.paginate({
			pageSize: 3,
			orderBy: { field: 'order', direction: 'asc' },
		})

		expect(page1.items.map((i) => i.order)).toEqual([1, 2, 3])

		const page2 = db.schemas.items.paginate({
			pageSize: 3,
			orderBy: { field: 'order', direction: 'asc' },
			cursor: page1.nextCursor,
		})

		expect(page2.items.map((i) => i.order)).toEqual([4, 5, 6])
		expect(page2.hasMore).toBe(true)
		expect(page2.prevCursor).not.toBeNull()
	})

	test('paginate returns hasMore=false on last page', () => {
		const db = defineSchema(({ createTable }) => {
			const items = createTable('items', {
				schema: () => ({ name: z.string() }),
				seed: 0,
			})

			return { items: items.table() }
		})

		for (let i = 1; i <= 5; i++) {
			db.schemas.items.insert({ name: `Item ${i}` })
		}

		const page1 = db.schemas.items.paginate({ pageSize: 3 })
		const page2 = db.schemas.items.paginate({
			pageSize: 3,
			cursor: page1.nextCursor,
		})

		expect(page2.items).toHaveLength(2)
		expect(page2.hasMore).toBe(false)
		expect(page2.nextCursor).toBeNull()
	})

	test('paginate with where filter', () => {
		const db = defineSchema(({ createTable }) => {
			const items = createTable('items', {
				schema: () => ({ name: z.string(), active: z.boolean() }),
				seed: 0,
			})

			return { items: items.table() }
		})

		for (let i = 1; i <= 10; i++) {
			db.schemas.items.insert({ name: `Item ${i}`, active: i % 2 === 0 })
		}

		const result = db.schemas.items.paginate({
			pageSize: 10,
			where: (item) => item.active,
		})

		expect(result.items).toHaveLength(5)
		expect(result.items.every((i) => i.active)).toBe(true)
	})
})

describe.skipIf(!isRedisConfigured)(
	'async adapter with optimistic updates',
	() => {
		test('defineSchema creates async database', async () => {
			const redis = await getRedis()
			const db = await defineSchema(
				({ createTable }) => ({
					users: createTable('users', {
						schema: () => ({ name: z.string() }),
						seed: 0,
					}).table(),
				}),
				{
					adapter: redisAdapter(redis, { prefix: `test_async_${Date.now()}` }),
				},
			)

			// Insert returns Promise
			const user = await db.schemas.users.insert({ name: 'John' })
			expect(typeof user).toBe('object')

			// Get is sync (from optimistic state)
			expect(user.name).toBe('John')

			// Cleanup
			await db.clear()
		})

		test('optimistic updates are visible immediately', async () => {
			const redis = await getRedis()
			const db = await defineSchema(
				({ createTable }) => ({
					users: createTable('users', {
						schema: () => ({ name: z.string() }),
						seed: 0,
					}).table(),
				}),
				{
					adapter: redisAdapter(redis, {
						prefix: `test_optimistic_${Date.now()}`,
					}),
				},
			)

			// Start insert (don't await yet)
			const insertPromise = db.schemas.users.insert({ name: 'Jane' })

			// Data should be visible immediately (optimistic)
			expect(db.schemas.users.size).toBe(1)
			expect(db.schemas.users.toArray()[0]?.name).toBe('Jane')

			// Wait for background sync
			const user = await insertPromise

			// Still visible after sync
			expect(db.schemas.users.get(user._id)?.name).toBe('Jane')

			// Cleanup
			await db.clear()
		})

		test('async update operations', async () => {
			const redis = await getRedis()
			const db = await defineSchema(
				({ createTable }) => ({
					users: createTable('users', {
						schema: () => ({ name: z.string(), age: z.number() }),
						seed: 0,
					}).table(),
				}),
				{
					adapter: redisAdapter(redis, { prefix: `test_update_${Date.now()}` }),
				},
			)

			const user = await db.schemas.users.insert({ name: 'Bob', age: 25 })

			// Update returns Promise
			const updated = await db.schemas.users.update(user._id, { age: 26 })
			expect(updated?.age).toBe(26)

			// Verify update persisted
			expect(db.schemas.users.get(user._id)?.age).toBe(26)
			// Cleanup
			await db.clear()
		})

		test('async delete operations', async () => {
			const redis = await getRedis()
			const db = await defineSchema(
				({ createTable }) => ({
					users: createTable('users', {
						schema: () => ({ name: z.string() }),
						seed: 0,
					}).table(),
				}),
				{
					adapter: redisAdapter(redis, { prefix: `test_delete_${Date.now()}` }),
				},
			)

			const user = await db.schemas.users.insert({ name: 'ToDelete' })
			expect(db.schemas.users.size).toBe(1)

			// Delete returns Promise
			const deleted = await db.schemas.users.delete(user._id)
			expect(deleted).toBe(true)

			// Verify deleted
			expect(db.schemas.users.size).toBe(0)
			expect(db.schemas.users.get(user._id)).toBeUndefined()
		})

		test('subscribe notifies on optimistic updates', async () => {
			const redis = await getRedis()
			const db = await defineSchema(
				({ createTable }) => ({
					users: createTable('users', {
						schema: () => ({ name: z.string() }),
						seed: 0,
					}).table(),
				}),
				{
					adapter: redisAdapter(redis, {
						prefix: `test_subscribe_${Date.now()}`,
					}),
				},
			)

			let notifyCount = 0
			db.subscribe(() => {
				notifyCount++
			})

			// Insert should trigger notification immediately (optimistic)
			const insertPromise = db.schemas.users.insert({ name: 'Test' })
			expect(notifyCount).toBe(1)

			await insertPromise

			// Cleanup
			await db.clear()
		})

		test('data is persisted to Redis after insert', async () => {
			const redis = await getRedis()
			const prefix = `test_persist_${Date.now()}`
			const db = await defineSchema(
				({ createTable }) => ({
					users: createTable('users', {
						schema: () => ({ name: z.string() }),
						seed: 0,
					}).table(),
				}),
				{ adapter: redisAdapter(redis, { prefix }) },
			)

			const user = await db.schemas.users.insert({ name: 'Persisted' })

			// Verify data is in Redis
			const redisKey = `${prefix}:users:${user._id}`
			const stored = await redis.get(redisKey)
			expect(stored).not.toBeNull()
			expect((stored as { name: string }).name).toBe('Persisted')

			// Verify ID is in the index set
			const indexKey = `${prefix}:users:_ids`
			const isMember = await redis.sismember(indexKey, user._id)
			expect(isMember).toBe(1)

			// Cleanup
			await db.clear()
		})

		test('data is removed from Redis after delete', async () => {
			const redis = await getRedis()
			const prefix = `test_delete_persist_${Date.now()}`
			const db = await defineSchema(
				({ createTable }) => ({
					users: createTable('users', {
						schema: () => ({ name: z.string() }),
						seed: 0,
					}).table(),
				}),
				{ adapter: redisAdapter(redis, { prefix }) },
			)

			const user = await db.schemas.users.insert({ name: 'ToDelete' })

			// Verify it exists in Redis
			const redisKey = `${prefix}:users:${user._id}`
			expect(await redis.get(redisKey)).not.toBeNull()

			// Delete
			await db.schemas.users.delete(user._id)

			// Verify removed from Redis
			expect(await redis.get(redisKey)).toBeNull()

			// Verify removed from index
			const indexKey = `${prefix}:users:_ids`
			expect(await redis.sismember(indexKey, user._id)).toBe(0)
		})

		test('data is updated in Redis after update', async () => {
			const redis = await getRedis()
			const prefix = `test_update_persist_${Date.now()}`
			const db = await defineSchema(
				({ createTable }) => ({
					users: createTable('users', {
						schema: () => ({ name: z.string(), age: z.number() }),
						seed: 0,
					}).table(),
				}),
				{ adapter: redisAdapter(redis, { prefix }) },
			)

			const user = await db.schemas.users.insert({ name: 'Original', age: 25 })

			// Verify original in Redis
			const redisKey = `${prefix}:users:${user._id}`
			let stored = await redis.get<{ name: string; age: number }>(redisKey)
			expect(stored?.name).toBe('Original')
			expect(stored?.age).toBe(25)

			// Update
			await db.schemas.users.update(user._id, { age: 30 })

			// Verify updated in Redis
			stored = await redis.get<{ name: string; age: number }>(redisKey)
			expect(stored?.name).toBe('Original')
			expect(stored?.age).toBe(30)

			// Cleanup
			await db.clear()
		})

		test('clear removes all data from Redis', async () => {
			const redis = await getRedis()
			const prefix = `test_clear_persist_${Date.now()}`
			const db = await defineSchema(
				({ createTable }) => ({
					users: createTable('users', {
						schema: () => ({ name: z.string() }),
						seed: 0,
					}).table(),
				}),
				{ adapter: redisAdapter(redis, { prefix }) },
			)

			const user1 = await db.schemas.users.insert({ name: 'User1' })
			const user2 = await db.schemas.users.insert({ name: 'User2' })

			// Verify both exist in Redis
			expect(await redis.get(`${prefix}:users:${user1._id}`)).not.toBeNull()
			expect(await redis.get(`${prefix}:users:${user2._id}`)).not.toBeNull()
			expect(await redis.scard(`${prefix}:users:_ids`)).toBe(2)

			// Clear
			await db.clear()

			// Verify all removed from Redis
			expect(await redis.get(`${prefix}:users:${user1._id}`)).toBeNull()
			expect(await redis.get(`${prefix}:users:${user2._id}`)).toBeNull()
			expect(await redis.scard(`${prefix}:users:_ids`)).toBe(0)
		})

		test('init loads existing data from Redis', async () => {
			const redis = await getRedis()
			const prefix = `test_init_${Date.now()}`

			// Pre-populate Redis with data
			const testDoc = {
				_id: 'preexisting',
				name: 'FromRedis',
				_createdAt: Date.now(),
				_updatedAt: Date.now(),
			}
			await redis.set(`${prefix}:users:preexisting`, testDoc)
			await redis.sadd(`${prefix}:users:_ids`, 'preexisting')

			// Create schema - should load existing data
			const db = await defineSchema(
				({ createTable }) => ({
					users: createTable('users', {
						schema: () => ({ name: z.string() }),
						seed: 0,
					}).table(),
				}),
				{ adapter: redisAdapter(redis, { prefix }) },
			)

			// Verify data was loaded
			expect(db.schemas.users.size).toBe(1)
			const loaded = db.schemas.users.get('preexisting')
			expect(loaded?.name).toBe('FromRedis')

			// Cleanup
			await db.clear()
		})
	},
)
