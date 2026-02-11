import { defineSchema } from '@server/db/definitions'
import { describe, expect, test } from 'vitest'
import { z } from 'zod'

describe('Explicit Relations API', () => {
	test('one-to-one relation with findMany', () => {
		const db = defineSchema(
			({ createTable }) => ({
				users: createTable('users', {
					schema: { name: z.string() },
					seed: 0,
				}).table(),
				posts: createTable('posts', {
					schema: { title: z.string(), authorId: z.string() },
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

		// Insert test data
		const alice = db.schemas.users.insert({ name: 'Alice' })
		const bob = db.schemas.users.insert({ name: 'Bob' })
		db.schemas.posts.insert({ title: 'Post 1', authorId: alice._id })
		db.schemas.posts.insert({ title: 'Post 2', authorId: alice._id })
		db.schemas.posts.insert({ title: 'Post 3', authorId: bob._id })

		// Test one-to-one: posts with author
		const postsWithAuthor = db.schemas.posts.findMany({
			with: { author: true },
		})

		expect(postsWithAuthor.length).toBe(3)

		// Verify author is populated with system fields
		const post1 = postsWithAuthor.find((p) => p.title === 'Post 1')!
		expect(post1.author).toBeDefined()
		expect(post1.author._id).toBe(alice._id)
		expect(post1.author.name).toBe('Alice')
		expect(post1.author._createdAt).toBeDefined()
		expect(post1.author._updatedAt).toBeDefined()
	})

	test('one-to-many relation with findMany', () => {
		const db = defineSchema(
			({ createTable }) => ({
				users: createTable('users', {
					schema: { name: z.string() },
					seed: 0,
				}).table(),
				posts: createTable('posts', {
					schema: { title: z.string(), authorId: z.string() },
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

		// Insert test data
		const alice = db.schemas.users.insert({ name: 'Alice' })
		const bob = db.schemas.users.insert({ name: 'Bob' })
		db.schemas.posts.insert({ title: 'Post 1', authorId: alice._id })
		db.schemas.posts.insert({ title: 'Post 2', authorId: alice._id })
		db.schemas.posts.insert({ title: 'Post 3', authorId: bob._id })

		// Test one-to-many: users with posts
		const usersWithPosts = db.schemas.users.findMany({
			with: { posts: true },
		})

		expect(usersWithPosts.length).toBe(2)

		// Find Alice's data
		const aliceData = usersWithPosts.find((u) => u.name === 'Alice')!
		expect(aliceData.posts).toBeDefined()
		expect(aliceData.posts.length).toBe(2)
		expect(aliceData.posts[0]._id).toBeDefined()
		expect(aliceData.posts[0].title).toBeDefined()
		expect(aliceData.posts[0]._createdAt).toBeDefined()

		// Find Bob's data
		const bobData = usersWithPosts.find((u) => u.name === 'Bob')!
		expect(bobData.posts.length).toBe(1)
		expect(bobData.posts[0].title).toBe('Post 3')
	})

	test('relations are exposed on db._internals.relations', () => {
		const db = defineSchema(
			({ createTable }) => ({
				users: createTable('users', {
					schema: { name: z.string() },
					seed: 0,
				}).table(),
				posts: createTable('posts', {
					schema: { title: z.string(), authorId: z.string() },
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
				}),
			},
		)

		// Relations should be accessible for introspection via _internals
		expect(db._internals.relations).toBeDefined()
		expect(db._internals.relations.posts).toBeDefined()
		expect(db._internals.relations.posts?.author).toBeDefined()
		expect(db._internals.relations.posts?.author.__type).toBe('one')
		expect(db._internals.relations.posts?.author.__target).toBe('users')
	})

	test('seeding works with new relations API', () => {
		const db = defineSchema(
			({ createTable }) => ({
				users: createTable('users', {
					schema: { name: z.string() },
					seed: 5, // Seed 5 users
				}).table(),
				posts: createTable('posts', {
					schema: { title: z.string(), authorId: z.string() },
					seed: 0, // No seeding for posts
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

		// Check that users were seeded
		expect(db.schemas.users.size).toBe(5)
		expect(db.schemas.posts.size).toBe(0)

		// Users should have system fields
		const users = db.schemas.users.toArray()
		expect(users[0]._id).toBeDefined()
		expect(users[0]._createdAt).toBeDefined()
		expect(users[0].name).toBeDefined()
	})

	test('findFirst with relations', () => {
		const db = defineSchema(
			({ createTable }) => ({
				users: createTable('users', {
					schema: { name: z.string() },
					seed: 0,
				}).table(),
				posts: createTable('posts', {
					schema: { title: z.string(), authorId: z.string() },
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
				}),
			},
		)

		const alice = db.schemas.users.insert({ name: 'Alice' })
		db.schemas.posts.insert({ title: 'First Post', authorId: alice._id })

		const post = db.schemas.posts.findFirst({
			with: { author: true },
		})

		expect(post).toBeDefined()
		expect(post?.author).toBeDefined()
		expect(post?.author._id).toBe(alice._id)
		expect(post?.author.name).toBe('Alice')
	})

	test('null relation when no match found', () => {
		const db = defineSchema(
			({ createTable }) => ({
				users: createTable('users', {
					schema: { name: z.string() },
					seed: 0,
				}).table(),
				posts: createTable('posts', {
					schema: { title: z.string(), authorId: z.string() },
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
				}),
			},
		)

		// Create post with non-existent author
		db.schemas.posts.insert({
			title: 'Orphan Post',
			authorId: 'non-existent-id',
		})

		const posts = db.schemas.posts.findMany({
			with: { author: true },
		})

		expect(posts.length).toBe(1)
		expect(posts[0].author).toBeNull()
	})
})

describe('Seeding with Relations', () => {
	test('seeding works with explicit relations API', () => {
		const db = defineSchema(
			({ createTable }) => ({
				users: createTable('users', {
					schema: { name: z.string().meta({ type: 'fullname' }) },
					seed: 3,
				}).table(),
				posts: createTable('posts', {
					schema: (one) => ({
						title: z.string().meta({ type: 'sentence' }),
						authorId: one('users'),
					}),
					seed: 5,
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

		// Verify seeding created records
		expect(db.schemas.users.size).toBe(3)
		expect(db.schemas.posts.size).toBe(5)

		// Verify users have proper data
		const users = db.schemas.users.toArray()
		for (const user of users) {
			expect(user._id).toBeDefined()
			expect(user.name).toBeDefined()
			expect(typeof user.name).toBe('string')
		}

		// Verify posts have valid authorIds pointing to real users
		const posts = db.schemas.posts.toArray()
		const userIds = new Set(users.map((u) => u._id))
		for (const post of posts) {
			expect(post._id).toBeDefined()
			expect(post.title).toBeDefined()
			expect(post.authorId).toBeDefined()
			expect(userIds.has(post.authorId)).toBe(true)
		}

		// Verify relations work with seeded data
		const postsWithAuthor = db.schemas.posts.findMany({
			with: { author: true },
		})

		for (const post of postsWithAuthor) {
			expect(post.author).not.toBeNull()
			expect(post.author._id).toBe(post.authorId)
		}

		// Verify many relation works
		const usersWithPosts = db.schemas.users.findMany({
			with: { posts: true },
		})

		let totalPostsFromRelations = 0
		for (const user of usersWithPosts) {
			expect(Array.isArray(user.posts)).toBe(true)
			totalPostsFromRelations += user.posts.length
		}
		expect(totalPostsFromRelations).toBe(5)
	})
})

describe('Relation Inference', () => {
	test('automatically infers inverse many relation from one', () => {
		// Only define posts.author, users.posts should be inferred
		const db = defineSchema(
			({ createTable }) => ({
				users: createTable('users', {
					schema: { name: z.string() },
					seed: 0,
				}).table(),
				posts: createTable('posts', {
					schema: { title: z.string(), authorId: z.string() },
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
					// Note: users.posts is NOT defined, should be inferred
				}),
			},
		)

		// Insert test data
		const alice = db.schemas.users.insert({ name: 'Alice' })
		db.schemas.posts.insert({ title: 'Post 1', authorId: alice._id })
		db.schemas.posts.insert({ title: 'Post 2', authorId: alice._id })

		// Test that posts.author works (explicitly defined)
		const postsWithAuthor = db.schemas.posts.findMany({
			with: { author: true },
		})
		expect(postsWithAuthor[0].author.name).toBe('Alice')

		// Test that users.posts works (inferred from posts.author)
		const usersWithPosts = db.schemas.users.findMany({
			with: { posts: true },
		})
		expect(usersWithPosts[0].posts.length).toBe(2)
		expect(usersWithPosts[0].posts[0].title).toBeDefined()
	})

	test('does not override explicitly defined inverse relations', () => {
		const db = defineSchema(
			({ createTable }) => ({
				users: createTable('users', {
					schema: { name: z.string() },
					seed: 0,
				}).table(),
				posts: createTable('posts', {
					schema: {
						title: z.string(),
						authorId: z.string(),
						published: z.boolean(),
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
					// Explicitly define users.posts (should not be overridden by inference)
					users: {
						posts: r.many.posts({
							from: r.users._id,
							to: r.posts.authorId,
						}),
					},
				}),
			},
		)

		// Verify the explicit relation is used
		expect(db._internals.relations.users?.posts).toBeDefined()
		expect(db._internals.relations.users?.posts.__type).toBe('many')
	})

	test('infers one relation from many', () => {
		// Only define users.posts (many), posts.users should be inferred as one
		const db = defineSchema(
			({ createTable }) => ({
				users: createTable('users', {
					schema: { name: z.string() },
					seed: 0,
				}).table(),
				posts: createTable('posts', {
					schema: { title: z.string(), authorId: z.string() },
					seed: 0,
				}).table(),
			}),
			{
				relations: (r) => ({
					users: {
						posts: r.many.posts({
							from: r.users._id,
							to: r.posts.authorId,
						}),
					},
					// Note: posts.user is NOT defined, should be inferred
				}),
			},
		)

		// Insert test data
		const alice = db.schemas.users.insert({ name: 'Alice' })
		db.schemas.posts.insert({ title: 'Post 1', authorId: alice._id })

		// Test that users.posts works (explicitly defined)
		const usersWithPosts = db.schemas.users.findMany({
			with: { posts: true },
		})
		expect(usersWithPosts[0].posts.length).toBe(1)

		// Test that posts.user works (inferred - singular form)
		const postsWithUser = db.schemas.posts.findMany({
			with: { user: true },
		})
		expect(postsWithUser[0].user.name).toBe('Alice')
	})

	test('relation inference is available for introspection', () => {
		const db = defineSchema(
			({ createTable }) => ({
				users: createTable('users', {
					schema: { name: z.string() },
					seed: 0,
				}).table(),
				posts: createTable('posts', {
					schema: { title: z.string(), authorId: z.string() },
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
				}),
			},
		)

		// Both explicit and inferred relations should be available
		expect(db._internals.relations.posts?.author).toBeDefined()
		expect(db._internals.relations.posts?.author.__type).toBe('one')

		// Inferred relation
		expect(db._internals.relations.users?.posts).toBeDefined()
		expect(db._internals.relations.users?.posts.__type).toBe('many')
	})
})

describe('Faker Seeding with Relations', () => {
	test('faker metadata generates correct data types', () => {
		const db = defineSchema(
			({ createTable }) => ({
				users: createTable('users', {
					schema: {
						name: z.string().meta({ type: 'fullname' }),
						email: z.string().meta({ type: 'email' }),
					},
					seed: 3,
				}).table(),
				posts: createTable('posts', {
					schema: (one) => ({
						title: z.string().meta({ type: 'sentence' }),
						content: z.string().meta({ type: 'paragraph' }),
						authorId: one('users'),
					}),
					seed: 5,
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
				}),
			},
		)

		// Verify users were seeded with faker data
		const users = db.schemas.users.toArray()
		expect(users.length).toBe(3)
		for (const user of users) {
			// Name should be a string (faker fullname)
			expect(typeof user.name).toBe('string')
			expect(user.name.length).toBeGreaterThan(0)
			// Email should contain @
			expect(user.email).toContain('@')
		}

		// Verify posts were seeded with faker data
		const posts = db.schemas.posts.toArray()
		expect(posts.length).toBe(5)
		for (const post of posts) {
			// Title should be a string (faker sentence)
			expect(typeof post.title).toBe('string')
			// Content should be longer (faker paragraph)
			expect(typeof post.content).toBe('string')
			// authorId should reference a valid user
			const validUserIds = users.map((u) => u._id)
			expect(validUserIds).toContain(post.authorId)
		}
	})

	test('seeded relations can be queried', () => {
		const db = defineSchema(
			({ createTable }) => ({
				users: createTable('users', {
					schema: {
						name: z.string().meta({ type: 'fullname' }),
					},
					seed: 2,
				}).table(),
				posts: createTable('posts', {
					schema: (one) => ({
						title: z.string().meta({ type: 'sentence' }),
						authorId: one('users'),
					}),
					seed: 4,
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
					// users.posts will be inferred
				}),
			},
		)

		// Query posts with author
		const postsWithAuthor = db.schemas.posts.findMany({
			with: { author: true },
		})

		// All posts should have a valid author
		for (const post of postsWithAuthor) {
			expect(post.author).not.toBeNull()
			expect(post.author._id).toBe(post.authorId)
			expect(typeof post.author.name).toBe('string')
		}

		// Query users with posts (inferred relation)
		const usersWithPosts = db.schemas.users.findMany({
			with: { posts: true },
		})

		// Total posts from all users should equal total posts
		let totalPosts = 0
		for (const user of usersWithPosts) {
			totalPosts += user.posts.length
		}
		expect(totalPosts).toBe(4)
	})
})
