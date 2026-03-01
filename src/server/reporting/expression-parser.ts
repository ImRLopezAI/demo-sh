export type ExpressionAst =
	| { type: 'Literal'; value: string | number | boolean | null }
	| { type: 'IdentifierPath'; path: string[] }
	| {
			type: 'Binary'
			operator:
				| '+'
				| '-'
				| '*'
				| '/'
				| '=='
				| '!='
				| '>'
				| '>='
				| '<'
				| '<='
				| '&&'
				| '||'
			left: ExpressionAst
			right: ExpressionAst
	  }
	| {
			type: 'Unary'
			operator: '-' | '!'
			argument: ExpressionAst
	  }
	| {
			type: 'Call'
			callee: string
			args: ExpressionAst[]
	  }

export interface ParseExpressionResult {
	ast: ExpressionAst
	normalized: string
}

type TokenType =
	| 'number'
	| 'string'
	| 'identifier'
	| 'operator'
	| 'paren-open'
	| 'paren-close'
	| 'comma'
	| 'dot'
	| 'eof'

interface Token {
	type: TokenType
	value: string
	index: number
}

const TWO_CHAR_OPERATORS = new Set(['==', '!=', '>=', '<=', '&&', '||'])
const ONE_CHAR_OPERATORS = new Set(['+', '-', '*', '/', '>', '<', '!'])

function isWhitespace(char: string): boolean {
	return /\s/.test(char)
}

function isDigit(char: string): boolean {
	return /[0-9]/.test(char)
}

function isIdentifierStart(char: string): boolean {
	return /[A-Za-z_]/.test(char)
}

function isIdentifierPart(char: string): boolean {
	return /[A-Za-z0-9_]/.test(char)
}

function tokenize(input: string): Token[] {
	const tokens: Token[] = []
	let index = 0

	while (index < input.length) {
		const char = input[index]
		if (!char) break

		if (isWhitespace(char)) {
			index += 1
			continue
		}

		const twoChar = input.slice(index, index + 2)
		if (TWO_CHAR_OPERATORS.has(twoChar)) {
			tokens.push({ type: 'operator', value: twoChar, index })
			index += 2
			continue
		}

		if (ONE_CHAR_OPERATORS.has(char)) {
			tokens.push({ type: 'operator', value: char, index })
			index += 1
			continue
		}

		if (char === '(') {
			tokens.push({ type: 'paren-open', value: char, index })
			index += 1
			continue
		}
		if (char === ')') {
			tokens.push({ type: 'paren-close', value: char, index })
			index += 1
			continue
		}
		if (char === ',') {
			tokens.push({ type: 'comma', value: char, index })
			index += 1
			continue
		}
		if (char === '.') {
			tokens.push({ type: 'dot', value: char, index })
			index += 1
			continue
		}

		if (char === '"' || char === "'") {
			const quote = char
			let cursor = index + 1
			let value = ''
			while (cursor < input.length) {
				const current = input[cursor]
				if (current === '\\') {
					const next = input[cursor + 1]
					if (!next) {
						throw new Error(
							`Unterminated escape sequence at position ${cursor}`,
						)
					}
					value += next
					cursor += 2
					continue
				}
				if (current === quote) {
					tokens.push({ type: 'string', value, index })
					index = cursor + 1
					value = ''
					break
				}
				value += current
				cursor += 1
			}
			if (value.length > 0 && input[index + value.length + 1] !== quote) {
				throw new Error(`Unterminated string literal at position ${index}`)
			}
			continue
		}

		if (isDigit(char)) {
			let cursor = index + 1
			while (cursor < input.length && /[0-9.]/.test(input[cursor] ?? '')) {
				cursor += 1
			}
			const value = input.slice(index, cursor)
			tokens.push({ type: 'number', value, index })
			index = cursor
			continue
		}

		if (isIdentifierStart(char)) {
			let cursor = index + 1
			while (cursor < input.length && isIdentifierPart(input[cursor] ?? '')) {
				cursor += 1
			}
			const value = input.slice(index, cursor)
			tokens.push({ type: 'identifier', value, index })
			index = cursor
			continue
		}

		throw new Error(`Unexpected token "${char}" at position ${index}`)
	}

	tokens.push({ type: 'eof', value: '', index: input.length })
	return tokens
}

const PRECEDENCE: Record<string, number> = {
	'||': 1,
	'&&': 2,
	'==': 3,
	'!=': 3,
	'>': 4,
	'>=': 4,
	'<': 4,
	'<=': 4,
	'+': 5,
	'-': 5,
	'*': 6,
	'/': 6,
}

class Parser {
	private readonly tokens: Token[]
	private cursor = 0

	constructor(tokens: Token[]) {
		this.tokens = tokens
	}

	parse(): ExpressionAst {
		const expression = this.parseExpression(0)
		const current = this.peek()
		if (current.type !== 'eof') {
			throw new Error(
				`Unexpected token "${current.value}" at position ${current.index}`,
			)
		}
		return expression
	}

	private parseExpression(minPrecedence: number): ExpressionAst {
		let left = this.parseUnary()

		while (true) {
			const operator = this.peek()
			if (operator.type !== 'operator') break
			const precedence = PRECEDENCE[operator.value]
			if (!precedence || precedence < minPrecedence) break

			this.next() // consume operator
			const right = this.parseExpression(precedence + 1)
			left = {
				type: 'Binary',
				operator: operator.value as
					| '+'
					| '-'
					| '*'
					| '/'
					| '=='
					| '!='
					| '>'
					| '>='
					| '<'
					| '<='
					| '&&'
					| '||',
				left,
				right,
			}
		}

		return left
	}

	private parseUnary(): ExpressionAst {
		const token = this.peek()
		if (
			token.type === 'operator' &&
			(token.value === '-' || token.value === '!')
		) {
			this.next()
			return {
				type: 'Unary',
				operator: token.value as '-' | '!',
				argument: this.parseUnary(),
			}
		}
		return this.parsePrimary()
	}

	private parsePrimary(): ExpressionAst {
		const token = this.peek()
		if (token.type === 'number') {
			this.next()
			return { type: 'Literal', value: Number(token.value) }
		}
		if (token.type === 'string') {
			this.next()
			return { type: 'Literal', value: token.value }
		}
		if (token.type === 'identifier') {
			return this.parseIdentifierOrCall()
		}
		if (token.type === 'paren-open') {
			this.next()
			const expression = this.parseExpression(0)
			this.expect('paren-close')
			return expression
		}
		throw new Error(
			`Unexpected token "${token.value}" at position ${token.index}`,
		)
	}

	private parseIdentifierOrCall(): ExpressionAst {
		const path: string[] = []
		const first = this.expect('identifier')
		path.push(first.value)

		while (this.peek().type === 'dot') {
			this.next() // dot
			const segment = this.expect('identifier')
			path.push(segment.value)
		}

		if (this.peek().type === 'paren-open') {
			this.next() // (
			const args: ExpressionAst[] = []
			while (this.peek().type !== 'paren-close') {
				args.push(this.parseExpression(0))
				if (this.peek().type === 'comma') {
					this.next()
					continue
				}
				break
			}
			this.expect('paren-close')
			return { type: 'Call', callee: path.join('.'), args }
		}

		if (path.length === 1) {
			const identifier = path[0]
			if (identifier === 'true') return { type: 'Literal', value: true }
			if (identifier === 'false') return { type: 'Literal', value: false }
			if (identifier === 'null') return { type: 'Literal', value: null }
		}

		return { type: 'IdentifierPath', path }
	}

	private peek(): Token {
		return (
			this.tokens[this.cursor] ?? {
				type: 'eof',
				value: '',
				index: this.tokens.length,
			}
		)
	}

	private next(): Token {
		const current = this.peek()
		this.cursor += 1
		return current
	}

	private expect(type: TokenType): Token {
		const current = this.peek()
		if (current.type !== type) {
			throw new Error(
				`Expected ${type} but found ${current.type} at position ${current.index}`,
			)
		}
		this.cursor += 1
		return current
	}
}

function normalizeExpression(expression: string): string {
	const trimmed = expression.trim()
	if (!trimmed) throw new Error('Expression cannot be empty')
	return trimmed.startsWith('=') ? trimmed.slice(1).trim() : trimmed
}

export function parseExpression(expression: string): ParseExpressionResult {
	const normalized = normalizeExpression(expression)
	const tokens = tokenize(normalized)
	const ast = new Parser(tokens).parse()
	return { ast, normalized }
}

export function validateExpression(expression: string): string | null {
	try {
		parseExpression(expression)
		return null
	} catch (error) {
		return error instanceof Error ? error.message : 'Invalid expression'
	}
}

export function extractLegacyTemplatePaths(template: string): string[] {
	const matches = template.match(/\{\{([^}]+)\}\}/g) ?? []
	const paths = matches
		.map((match) => match.replace(/^\{\{/, '').replace(/\}\}$/, '').trim())
		.filter(Boolean)
	return Array.from(new Set(paths))
}
