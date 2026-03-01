import type { ExpressionContext, ExpressionResult } from './designer-contracts'
import {
	type ExpressionAst,
	extractLegacyTemplatePaths,
	parseExpression,
} from './expression-parser'

const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype'])

function safePathRead(root: unknown, path: string[]): unknown {
	let cursor: unknown = root
	for (const segment of path) {
		if (FORBIDDEN_KEYS.has(segment)) return undefined
		if (typeof cursor !== 'object' || cursor === null) return undefined
		cursor = (cursor as Record<string, unknown>)[segment]
	}
	return cursor
}

function toNumber(value: unknown): number {
	if (typeof value === 'number') return value
	if (typeof value === 'boolean') return value ? 1 : 0
	if (value === null || value === undefined || value === '') return 0
	const numeric = Number(value)
	return Number.isFinite(numeric) ? numeric : 0
}

function truthy(value: unknown): boolean {
	if (Array.isArray(value)) return value.length > 0
	return Boolean(value)
}

function compare(left: unknown, right: unknown): number {
	if (typeof left === 'number' || typeof right === 'number') {
		return toNumber(left) - toNumber(right)
	}
	const a = String(left ?? '')
	const b = String(right ?? '')
	if (a === b) return 0
	return a > b ? 1 : -1
}

function evaluateIdentifier(
	path: string[],
	context: ExpressionContext,
): unknown {
	if (path.length === 0) return undefined
	const [first, ...rest] = path
	if (first === 'Fields') return safePathRead(context.Fields, rest)
	if (first === 'Summary') return safePathRead(context.Summary ?? {}, rest)
	if (first === 'Globals') return safePathRead(context.Globals ?? {}, rest)

	const record = {
		Fields: context.Fields,
		Summary: context.Summary,
		Globals: context.Globals,
	}
	return safePathRead(record, path)
}

function mapRows(args: ExpressionAst[], context: ExpressionContext): unknown[] {
	if (!context.rows?.length) return []
	if (args.length === 0) return context.rows
	const first = args[0]
	if (first.type === 'IdentifierPath' && first.path[0] === 'Fields') {
		const fieldPath = first.path.slice(1)
		return context.rows.map((row) => safePathRead(row, fieldPath))
	}
	return context.rows.map((row) =>
		evaluateAst(args[0], { ...context, Fields: row, rows: context.rows }),
	)
}

function callFunction(
	callee: string,
	args: ExpressionAst[],
	context: ExpressionContext,
): unknown {
	const name = callee.toLowerCase()
	if (name === 'sum') {
		return mapRows(args, context).reduce<number>(
			(acc, item) => acc + toNumber(item),
			0,
		)
	}
	if (name === 'count') {
		if (args.length === 0) return context.rows?.length ?? 0
		return mapRows(args, context).filter(
			(item) => item !== null && item !== undefined,
		).length
	}
	if (name === 'avg') {
		const values = mapRows(args, context).map((item) => toNumber(item))
		if (values.length === 0) return 0
		return values.reduce((acc, value) => acc + value, 0) / values.length
	}
	if (name === 'min') {
		const values = mapRows(args, context).map((item) => toNumber(item))
		return values.length === 0 ? 0 : Math.min(...values)
	}
	if (name === 'max') {
		const values = mapRows(args, context).map((item) => toNumber(item))
		return values.length === 0 ? 0 : Math.max(...values)
	}
	if (name === 'iif') {
		const [condition, whenTrue, whenFalse] = args
		return truthy(evaluateAst(condition, context))
			? evaluateAst(whenTrue, context)
			: evaluateAst(whenFalse, context)
	}
	if (name === 'format') {
		const value = args[0] ? evaluateAst(args[0], context) : undefined
		const formatType = args[1]
			? String(evaluateAst(args[1], context)).toLowerCase()
			: ''
		if (formatType === 'currency') {
			return new Intl.NumberFormat('en-US', {
				style: 'currency',
				currency: 'USD',
				maximumFractionDigits: 2,
			}).format(toNumber(value))
		}
		if (formatType === 'number') {
			return new Intl.NumberFormat('en-US', {
				maximumFractionDigits: 2,
			}).format(toNumber(value))
		}
		if (formatType === 'date') {
			const date = new Date(String(value ?? ''))
			if (Number.isNaN(date.getTime())) return ''
			return date.toISOString().slice(0, 10)
		}
		return String(value ?? '')
	}
	if (name === 'upper') {
		return String(args[0] ? evaluateAst(args[0], context) : '').toUpperCase()
	}
	if (name === 'lower') {
		return String(args[0] ? evaluateAst(args[0], context) : '').toLowerCase()
	}
	if (name === 'trim') {
		return String(args[0] ? evaluateAst(args[0], context) : '').trim()
	}
	if (name === 'left') {
		const value = String(args[0] ? evaluateAst(args[0], context) : '')
		const size = toNumber(args[1] ? evaluateAst(args[1], context) : 0)
		return value.slice(0, Math.max(0, size))
	}
	if (name === 'right') {
		const value = String(args[0] ? evaluateAst(args[0], context) : '')
		const size = toNumber(args[1] ? evaluateAst(args[1], context) : 0)
		if (size <= 0) return ''
		return value.slice(-size)
	}
	if (name === 'dateformat') {
		const value = args[0] ? evaluateAst(args[0], context) : undefined
		const pattern = args[1]
			? String(evaluateAst(args[1], context))
			: 'yyyy-MM-dd'
		const date = new Date(String(value ?? ''))
		if (Number.isNaN(date.getTime())) return ''
		if (pattern === 'yyyy-MM-dd') return date.toISOString().slice(0, 10)
		if (pattern === 'iso') return date.toISOString()
		return date.toLocaleDateString('en-US')
	}

	throw new Error(`Unknown expression function: ${callee}`)
}

function evaluateAst(ast: ExpressionAst, context: ExpressionContext): unknown {
	if (ast.type === 'Literal') return ast.value
	if (ast.type === 'IdentifierPath')
		return evaluateIdentifier(ast.path, context)
	if (ast.type === 'Unary') {
		const value = evaluateAst(ast.argument, context)
		if (ast.operator === '-') return -toNumber(value)
		return !truthy(value)
	}
	if (ast.type === 'Call') {
		return callFunction(ast.callee, ast.args, context)
	}
	if (ast.type === 'Binary') {
		const left = evaluateAst(ast.left, context)
		if (ast.operator === '&&') {
			return truthy(left) ? evaluateAst(ast.right, context) : left
		}
		if (ast.operator === '||') {
			return truthy(left) ? left : evaluateAst(ast.right, context)
		}
		const right = evaluateAst(ast.right, context)
		if (ast.operator === '+') {
			if (typeof left === 'string' || typeof right === 'string') {
				return `${String(left ?? '')}${String(right ?? '')}`
			}
			return toNumber(left) + toNumber(right)
		}
		if (ast.operator === '-') return toNumber(left) - toNumber(right)
		if (ast.operator === '*') return toNumber(left) * toNumber(right)
		if (ast.operator === '/') {
			const denominator = toNumber(right)
			if (denominator === 0) return 0
			return toNumber(left) / denominator
		}
		if (ast.operator === '==') return compare(left, right) === 0
		if (ast.operator === '!=') return compare(left, right) !== 0
		if (ast.operator === '>') return compare(left, right) > 0
		if (ast.operator === '>=') return compare(left, right) >= 0
		if (ast.operator === '<') return compare(left, right) < 0
		if (ast.operator === '<=') return compare(left, right) <= 0
	}
	return undefined
}

function resolveLegacyTemplate(
	template: string,
	context: ExpressionContext,
): string {
	if (!template.includes('{{')) return template
	const paths = extractLegacyTemplatePaths(template)
	let output = template
	for (const path of paths) {
		const value = safePathRead(
			{
				summary: context.Summary ?? {},
				fields: context.Fields,
				globals: context.Globals ?? {},
			},
			path.split('.'),
		)
		output = output.replaceAll(`{{${path}}}`, String(value ?? ''))
	}
	return output
}

export function evaluateExpression(
	expression: string,
	context: ExpressionContext,
): ExpressionResult {
	try {
		const trimmed = expression.trim()
		if (!trimmed) return { ok: true, value: '' }
		if (trimmed.includes('{{') && !trimmed.startsWith('=')) {
			return { ok: true, value: resolveLegacyTemplate(trimmed, context) }
		}
		if (!trimmed.startsWith('=')) {
			return { ok: true, value: trimmed }
		}
		const { ast } = parseExpression(trimmed)
		const value = evaluateAst(ast, context)
		return { ok: true, value }
	} catch (error) {
		return {
			ok: false,
			error:
				error instanceof Error ? error.message : 'Expression evaluation failed',
		}
	}
}

export function expressionToString(result: ExpressionResult): string {
	if (!result.ok) return ''
	if (result.value === null || result.value === undefined) return ''
	if (typeof result.value === 'number') return Number(result.value).toFixed(2)
	if (result.value instanceof Date) return result.value.toISOString()
	return String(result.value)
}
