import {
	AdapterNotReadyError,
	CheckConstraintError,
	CircularDependencyError,
	ConnectionError,
	ConstraintError,
	DatabaseError,
	DocumentNotFoundError,
	ForeignKeyError,
	NotImplementedError,
	NotNullConstraintError,
	RelationError,
	RequiredFieldError,
	RollbackError,
	SchemaError,
	StorageError,
	TableNotFoundError,
	TimeoutError,
	TransactionError,
	TypeMismatchError,
	UniqueConstraintError,
	ValidationError,
} from '@server/db/definitions/errors'
import { describe, expect, test } from 'vitest'

describe('errors', () => {
	describe('DatabaseError', () => {
		test('creates error with message and options', () => {
			const error = new DatabaseError('Something went wrong', {
				code: 'CUSTOM_ERROR',
				tableName: 'users',
				documentId: 'doc-1',
				operation: 'insert',
			})

			expect(error.message).toBe('Something went wrong')
			expect(error.code).toBe('CUSTOM_ERROR')
			expect(error.tableName).toBe('users')
			expect(error.documentId).toBe('doc-1')
			expect(error.operation).toBe('insert')
			expect(error.name).toBe('DatabaseError')
		})

		test('toJSON returns serializable object', () => {
			const error = new DatabaseError('Test error', {
				tableName: 'posts',
			})

			const json = error.toJSON()

			expect(json.name).toBe('DatabaseError')
			expect(json.message).toBe('Test error')
			expect(json.tableName).toBe('posts')
			expect(json.stack).toBeDefined()
		})

		test('captures cause error', () => {
			const cause = new Error('Original error')
			const error = new DatabaseError('Wrapped error', { cause })

			expect(error.cause).toBe(cause)
		})
	})

	describe('NotImplementedError', () => {
		test('creates error for missing feature', () => {
			const error = new NotImplementedError('Streaming queries')

			expect(error.message).toBe('Feature not implemented: Streaming queries')
			expect(error.code).toBe('NOT_IMPLEMENTED')
			expect(error.name).toBe('NotImplementedError')
		})
	})

	describe('TimeoutError', () => {
		test('includes timeout duration', () => {
			const error = new TimeoutError('Query timed out', 5000)

			expect(error.message).toBe('Query timed out')
			expect(error.code).toBe('TIMEOUT')
			expect(error.timeoutMs).toBe(5000)
		})
	})

	describe('StorageError', () => {
		test('includes adapter type', () => {
			const error = new StorageError('Failed to write', {
				adapterType: 'redis',
				tableName: 'cache',
			})

			expect(error.code).toBe('STORAGE_ERROR')
			expect(error.adapterType).toBe('redis')
			expect(error.tableName).toBe('cache')
		})
	})

	describe('ConnectionError', () => {
		test('includes host and port', () => {
			const error = new ConnectionError('Connection refused', {
				host: 'localhost',
				port: 6379,
				adapterType: 'redis',
			})

			expect(error.code).toBe('CONNECTION_ERROR')
			expect(error.host).toBe('localhost')
			expect(error.port).toBe(6379)
		})
	})

	describe('AdapterNotReadyError', () => {
		test('creates message with adapter type', () => {
			const error = new AdapterNotReadyError('redis')

			expect(error.message).toContain('redis')
			expect(error.message).toContain('init()')
			expect(error.code).toBe('ADAPTER_NOT_READY')
		})
	})

	describe('TransactionError', () => {
		test('includes operations list', () => {
			const error = new TransactionError('Transaction failed', {
				operations: [
					{ type: 'insert', tableName: 'users' },
					{ type: 'update', tableName: 'posts', documentId: 'p1' },
				],
			})

			expect(error.operations?.length).toBe(2)
			expect(error.code).toBe('TRANSACTION_ERROR')
		})
	})

	describe('RollbackError', () => {
		test('includes original error', () => {
			const original = new Error('Insert failed')
			const error = new RollbackError('Rollback failed', {
				originalError: original,
			})

			expect(error.originalError).toBe(original)
			expect(error.code).toBe('ROLLBACK_ERROR')
		})
	})

	describe('DocumentNotFoundError', () => {
		test('creates message with table and id', () => {
			const error = new DocumentNotFoundError('users', 'user-123')

			expect(error.message).toContain('user-123')
			expect(error.message).toContain('users')
			expect(error.tableName).toBe('users')
			expect(error.documentId).toBe('user-123')
			expect(error.code).toBe('DOCUMENT_NOT_FOUND')
		})
	})

	describe('TableNotFoundError', () => {
		test('creates message with table name', () => {
			const error = new TableNotFoundError('nonexistent')

			expect(error.message).toContain('nonexistent')
			expect(error.tableName).toBe('nonexistent')
			expect(error.code).toBe('TABLE_NOT_FOUND')
		})
	})

	describe('UniqueConstraintError', () => {
		test('creates error with field details', () => {
			const error = new UniqueConstraintError({
				constraintName: 'users_email_unique',
				tableName: 'users',
				fields: ['email'],
				values: { email: 'test@example.com' },
				existingDocumentId: 'user-456',
			})

			expect(error.message).toContain('users_email_unique')
			expect(error.fields).toEqual(['email'])
			expect(error.values).toEqual({ email: 'test@example.com' })
			expect(error.existingDocumentId).toBe('user-456')
			expect(error.code).toBe('UNIQUE_CONSTRAINT_ERROR')
		})

		test('creates message without constraint name', () => {
			const error = new UniqueConstraintError({
				tableName: 'users',
				fields: ['email', 'username'],
			})

			expect(error.message).toContain('email, username')
			expect(error.message).toContain('users')
		})
	})

	describe('ForeignKeyError', () => {
		test('creates error for missing reference', () => {
			const error = new ForeignKeyError({
				tableName: 'posts',
				field: 'authorId',
				referencedTable: 'users',
				referencedField: '_id',
				value: 'nonexistent-user',
				violationType: 'missing',
			})

			expect(error.message).toContain('posts.authorId')
			expect(error.message).toContain('users._id')
			expect(error.violationType).toBe('missing')
			expect(error.code).toBe('FOREIGN_KEY_ERROR')
		})

		test('creates error for restrict violation', () => {
			const error = new ForeignKeyError({
				tableName: 'posts',
				field: 'authorId',
				referencedTable: 'users',
				referencedField: '_id',
				violationType: 'restrict',
			})

			expect(error.message).toContain('Cannot delete')
			expect(error.message).toContain('restrict')
			expect(error.violationType).toBe('restrict')
		})
	})

	describe('CheckConstraintError', () => {
		test('includes expression', () => {
			const error = new CheckConstraintError('Age must be positive', {
				constraintName: 'age_positive',
				expression: 'age > 0',
			})

			expect(error.expression).toBe('age > 0')
			expect(error.code).toBe('CHECK_CONSTRAINT_ERROR')
		})
	})

	describe('NotNullConstraintError', () => {
		test('creates message with field name', () => {
			const error = new NotNullConstraintError({
				tableName: 'users',
				field: 'email',
			})

			expect(error.message).toContain('users.email')
			expect(error.message).toContain('cannot be null')
			expect(error.field).toBe('email')
			expect(error.code).toBe('NOT_NULL_CONSTRAINT_ERROR')
		})
	})

	describe('ValidationError', () => {
		test('includes field and expected/received', () => {
			const error = new ValidationError('Invalid email format', {
				field: 'email',
				expected: 'email format',
				received: 'not-an-email',
			})

			expect(error.field).toBe('email')
			expect(error.expected).toBe('email format')
			expect(error.received).toBe('not-an-email')
			expect(error.code).toBe('VALIDATION_ERROR')
		})
	})

	describe('SchemaError', () => {
		test('includes element and details', () => {
			const error = new SchemaError('Invalid schema', {
				tableName: 'users',
				element: 'email field',
				details: 'Missing type definition',
			})

			expect(error.element).toBe('email field')
			expect(error.details).toBe('Missing type definition')
			expect(error.code).toBe('SCHEMA_ERROR')
		})
	})

	describe('RelationError', () => {
		test('includes relation details', () => {
			const error = new RelationError('Invalid relation', {
				fromTable: 'posts',
				toTable: 'users',
				relationName: 'author',
			})

			expect(error.fromTable).toBe('posts')
			expect(error.toTable).toBe('users')
			expect(error.relationName).toBe('author')
			expect(error.code).toBe('RELATION_ERROR')
		})
	})

	describe('CircularDependencyError', () => {
		test('includes cycle path', () => {
			const error = new CircularDependencyError(['A', 'B', 'C', 'A'])

			expect(error.message).toContain('A -> B -> C -> A')
			expect(error.cycle).toEqual(['A', 'B', 'C', 'A'])
			expect(error.code).toBe('CIRCULAR_DEPENDENCY')
		})
	})

	describe('TypeMismatchError', () => {
		test('creates message with type info', () => {
			const error = new TypeMismatchError({
				tableName: 'users',
				field: 'age',
				expected: 'number',
				received: 'hello',
			})

			expect(error.message).toContain('age')
			expect(error.message).toContain('number')
			expect(error.message).toContain('string') // typeof 'hello'
			expect(error.code).toBe('TYPE_MISMATCH')
		})
	})

	describe('RequiredFieldError', () => {
		test('creates message with field name', () => {
			const error = new RequiredFieldError({
				tableName: 'users',
				field: 'name',
			})

			expect(error.message).toContain('name')
			expect(error.message).toContain('Required')
			expect(error.code).toBe('REQUIRED_FIELD')
		})
	})

	describe('Error inheritance', () => {
		test('all errors extend Error', () => {
			expect(new DatabaseError('test')).toBeInstanceOf(Error)
			expect(new StorageError('test')).toBeInstanceOf(Error)
			expect(new ConstraintError('test')).toBeInstanceOf(Error)
			expect(new ValidationError('test')).toBeInstanceOf(Error)
		})

		test('constraint errors extend DatabaseError', () => {
			expect(
				new UniqueConstraintError({ tableName: 't', fields: ['f'] }),
			).toBeInstanceOf(DatabaseError)
			expect(
				new ForeignKeyError({
					tableName: 't',
					field: 'f',
					referencedTable: 'r',
					referencedField: 'f',
					violationType: 'missing',
				}),
			).toBeInstanceOf(DatabaseError)
		})

		test('storage errors extend DatabaseError', () => {
			expect(new StorageError('test')).toBeInstanceOf(DatabaseError)
			expect(new ConnectionError('test')).toBeInstanceOf(DatabaseError)
			expect(new DocumentNotFoundError('t', 'id')).toBeInstanceOf(DatabaseError)
		})

		test('validation errors extend DatabaseError', () => {
			expect(new ValidationError('test')).toBeInstanceOf(DatabaseError)
			expect(new SchemaError('test')).toBeInstanceOf(DatabaseError)
			expect(
				new TypeMismatchError({
					tableName: 't',
					field: 'f',
					expected: 'e',
					received: 'r',
				}),
			).toBeInstanceOf(DatabaseError)
		})
	})
})
