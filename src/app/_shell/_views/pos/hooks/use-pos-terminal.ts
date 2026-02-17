import * as React from 'react'
import { useEntityMutations } from '../../_shared/use-entity'

// ── Types ─────────────────────────────────────────────────────

export interface CartItem {
	id: string
	itemId: string
	itemNo: string
	description: string
	quantity: number
	unitPrice: number
	discountPercent: number
	lineAmount: number
}

export interface SessionInfo {
	id: string
	sessionNo: string
	terminalName: string
	cashierId: string
}

export interface CustomerInfo {
	id: string
	customerNo: string
	name: string
}

export interface Totals {
	subtotal: number
	discountTotal: number
	taxAmount: number
	total: number
	lineCount: number
	itemCount: number
}

export interface TerminalState {
	session: SessionInfo | null
	sessionDialogOpen: boolean
	cart: CartItem[]
	selectedLineId: string | null
	customer: CustomerInfo | null
	numpadTarget: 'quantity' | 'price' | 'discount' | null
	numpadBuffer: string
	paymentDialogOpen: boolean
	searchQuery: string
	categoryFilter: 'ALL' | 'ITEM' | 'SERVICE' | 'BUNDLE'
}

// ── Actions ───────────────────────────────────────────────────

type Action =
	| { type: 'SET_SESSION'; session: SessionInfo }
	| { type: 'OPEN_SESSION_DIALOG' }
	| { type: 'CLOSE_SESSION_DIALOG' }
	| {
			type: 'ADD_ITEM'
			item: {
				itemId: string
				itemNo: string
				description: string
				unitPrice: number
			}
	  }
	| { type: 'REMOVE_LINE'; lineId: string }
	| { type: 'UPDATE_LINE_QUANTITY'; lineId: string; quantity: number }
	| { type: 'UPDATE_LINE_PRICE'; lineId: string; unitPrice: number }
	| { type: 'UPDATE_LINE_DISCOUNT'; lineId: string; discountPercent: number }
	| { type: 'SELECT_LINE'; lineId: string | null }
	| { type: 'SET_CUSTOMER'; customer: CustomerInfo | null }
	| { type: 'SET_NUMPAD_TARGET'; target: TerminalState['numpadTarget'] }
	| { type: 'NUMPAD_INPUT'; key: string }
	| { type: 'NUMPAD_BACKSPACE' }
	| { type: 'NUMPAD_CLEAR' }
	| { type: 'NUMPAD_ENTER' }
	| { type: 'OPEN_PAYMENT' }
	| { type: 'CLOSE_PAYMENT' }
	| { type: 'COMPLETE_SALE' }
	| { type: 'VOID_TRANSACTION' }
	| { type: 'SET_SEARCH'; query: string }
	| { type: 'SET_CATEGORY'; category: TerminalState['categoryFilter'] }
	| { type: 'CLEAR_CART' }

// ── Helpers ───────────────────────────────────────────────────

function calcLineAmount(qty: number, price: number, disc: number): number {
	return qty * price * (1 - disc / 100)
}

// ── Reducer ───────────────────────────────────────────────────

const initialState: TerminalState = {
	session: null,
	sessionDialogOpen: true,
	cart: [],
	selectedLineId: null,
	customer: null,
	numpadTarget: null,
	numpadBuffer: '',
	paymentDialogOpen: false,
	searchQuery: '',
	categoryFilter: 'ALL',
}

function reducer(state: TerminalState, action: Action): TerminalState {
	switch (action.type) {
		case 'SET_SESSION':
			return { ...state, session: action.session, sessionDialogOpen: false }

		case 'OPEN_SESSION_DIALOG':
			return { ...state, sessionDialogOpen: true }

		case 'CLOSE_SESSION_DIALOG':
			return { ...state, sessionDialogOpen: false }

		case 'ADD_ITEM': {
			const existing = state.cart.find((l) => l.itemId === action.item.itemId)
			if (existing) {
				return {
					...state,
					cart: state.cart.map((l) =>
						l.id === existing.id
							? {
									...l,
									quantity: l.quantity + 1,
									lineAmount: calcLineAmount(
										l.quantity + 1,
										l.unitPrice,
										l.discountPercent,
									),
								}
							: l,
					),
				}
			}
			const newLine: CartItem = {
				id: crypto.randomUUID(),
				itemId: action.item.itemId,
				itemNo: action.item.itemNo,
				description: action.item.description,
				quantity: 1,
				unitPrice: action.item.unitPrice,
				discountPercent: 0,
				lineAmount: action.item.unitPrice,
			}
			return { ...state, cart: [...state.cart, newLine] }
		}

		case 'REMOVE_LINE':
			return {
				...state,
				cart: state.cart.filter((l) => l.id !== action.lineId),
				selectedLineId:
					state.selectedLineId === action.lineId ? null : state.selectedLineId,
			}

		case 'UPDATE_LINE_QUANTITY':
			return {
				...state,
				cart: state.cart.map((l) =>
					l.id === action.lineId
						? {
								...l,
								quantity: Math.max(1, action.quantity),
								lineAmount: calcLineAmount(
									Math.max(1, action.quantity),
									l.unitPrice,
									l.discountPercent,
								),
							}
						: l,
				),
			}

		case 'UPDATE_LINE_PRICE':
			return {
				...state,
				cart: state.cart.map((l) =>
					l.id === action.lineId
						? {
								...l,
								unitPrice: Math.max(0, action.unitPrice),
								lineAmount: calcLineAmount(
									l.quantity,
									Math.max(0, action.unitPrice),
									l.discountPercent,
								),
							}
						: l,
				),
			}

		case 'UPDATE_LINE_DISCOUNT':
			return {
				...state,
				cart: state.cart.map((l) =>
					l.id === action.lineId
						? {
								...l,
								discountPercent: Math.min(
									100,
									Math.max(0, action.discountPercent),
								),
								lineAmount: calcLineAmount(
									l.quantity,
									l.unitPrice,
									Math.min(100, Math.max(0, action.discountPercent)),
								),
							}
						: l,
				),
			}

		case 'SELECT_LINE':
			return {
				...state,
				selectedLineId: action.lineId,
				numpadTarget: null,
				numpadBuffer: '',
			}

		case 'SET_CUSTOMER':
			return { ...state, customer: action.customer }

		case 'SET_NUMPAD_TARGET':
			return { ...state, numpadTarget: action.target, numpadBuffer: '' }

		case 'NUMPAD_INPUT':
			return { ...state, numpadBuffer: state.numpadBuffer + action.key }

		case 'NUMPAD_BACKSPACE':
			return { ...state, numpadBuffer: state.numpadBuffer.slice(0, -1) }

		case 'NUMPAD_CLEAR':
			return { ...state, numpadBuffer: '' }

		case 'NUMPAD_ENTER': {
			if (!state.selectedLineId || !state.numpadTarget || !state.numpadBuffer)
				return state
			const value = Number.parseFloat(state.numpadBuffer)
			if (Number.isNaN(value)) return { ...state, numpadBuffer: '' }
			const lineId = state.selectedLineId
			const lineAction: Action =
				state.numpadTarget === 'quantity'
					? { type: 'UPDATE_LINE_QUANTITY', lineId, quantity: value }
					: state.numpadTarget === 'price'
						? { type: 'UPDATE_LINE_PRICE', lineId, unitPrice: value }
						: { type: 'UPDATE_LINE_DISCOUNT', lineId, discountPercent: value }
			const updated = reducer(state, lineAction)
			return { ...updated, numpadBuffer: '', numpadTarget: null }
		}

		case 'OPEN_PAYMENT':
			return { ...state, paymentDialogOpen: true }

		case 'CLOSE_PAYMENT':
			return { ...state, paymentDialogOpen: false }

		case 'COMPLETE_SALE':
			return {
				...state,
				cart: [],
				selectedLineId: null,
				customer: null,
				numpadTarget: null,
				numpadBuffer: '',
				paymentDialogOpen: false,
				searchQuery: '',
			}

		case 'VOID_TRANSACTION':
			return {
				...state,
				cart: [],
				selectedLineId: null,
				customer: null,
				numpadTarget: null,
				numpadBuffer: '',
				searchQuery: '',
			}

		case 'SET_SEARCH':
			return { ...state, searchQuery: action.query }

		case 'SET_CATEGORY':
			return { ...state, categoryFilter: action.category }

		case 'CLEAR_CART':
			return {
				...state,
				cart: [],
				selectedLineId: null,
				numpadTarget: null,
				numpadBuffer: '',
			}

		default:
			return state
	}
}

// ── Hook ──────────────────────────────────────────────────────

export function usePosTerminal() {
	const [state, dispatch] = React.useReducer(reducer, initialState)

	const { create: createTransaction, transitionStatus } = useEntityMutations(
		'pos',
		'posTransactions',
	)
	const { create: createLine } = useEntityMutations(
		'pos',
		'posTransactionLines',
	)

	const totals = React.useMemo<Totals>(() => {
		const subtotal = state.cart.reduce(
			(sum, l) => sum + l.quantity * l.unitPrice,
			0,
		)
		const discountTotal = state.cart.reduce(
			(sum, l) => sum + l.quantity * l.unitPrice * (l.discountPercent / 100),
			0,
		)
		const afterDiscount = subtotal - discountTotal
		const taxAmount = afterDiscount * 0.16
		return {
			subtotal,
			discountTotal,
			taxAmount,
			total: afterDiscount + taxAmount,
			lineCount: state.cart.length,
			itemCount: state.cart.reduce((sum, l) => sum + l.quantity, 0),
		}
	}, [state.cart])

	const addItem = React.useCallback(
		(item: {
			itemId: string
			itemNo: string
			description: string
			unitPrice: number
		}) => {
			dispatch({ type: 'ADD_ITEM', item })
		},
		[],
	)

	const removeSelectedLine = React.useCallback(() => {
		if (state.selectedLineId) {
			dispatch({ type: 'REMOVE_LINE', lineId: state.selectedLineId })
		}
	}, [state.selectedLineId])

	const clearCart = React.useCallback(() => {
		dispatch({ type: 'CLEAR_CART' })
	}, [])

	const voidTransaction = React.useCallback(() => {
		dispatch({ type: 'VOID_TRANSACTION' })
	}, [])

	const completeSale = React.useCallback(
		async (paymentMethod: 'CASH' | 'CARD' | 'MOBILE') => {
			if (!state.session || state.cart.length === 0) return

			const header = await createTransaction.mutateAsync({
				posSessionId: state.session.id,
				customerId: state.customer?.id ?? undefined,
				totalAmount: totals.total,
				taxAmount: totals.taxAmount,
				discountAmount: totals.discountTotal,
				paidAmount: totals.total,
				paymentMethod,
			})

			const headerId = (header as { id: string }).id

			for (const line of state.cart) {
				await createLine.mutateAsync({
					transactionId: headerId,
					itemId: line.itemId,
					description: line.description,
					quantity: line.quantity,
					unitPrice: line.unitPrice,
					discountPercent: line.discountPercent,
					lineAmount: line.lineAmount,
				})
			}

			await transitionStatus.mutateAsync({
				id: headerId,
				toStatus: 'COMPLETED',
			})

			dispatch({ type: 'COMPLETE_SALE' })
		},
		[
			state.session,
			state.cart,
			state.customer,
			totals,
			createTransaction,
			createLine,
			transitionStatus,
		],
	)

	return {
		state,
		dispatch,
		totals,
		addItem,
		removeSelectedLine,
		clearCart,
		completeSale,
		voidTransaction,
	}
}
