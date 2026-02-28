import { $rpc, useMutation, useQueryClient } from '@lib/rpc'
import {
	useAsyncRateLimitedCallback,
	useAsyncThrottler,
	useDebouncedCallback,
} from '@tanstack/react-pacer'
import * as React from 'react'
import { toast } from 'sonner'
import { downloadBinaryPayload } from '@/lib/download-file'
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

export type PaymentMethod = 'CASH' | 'CARD' | 'MOBILE'

export interface OfflineQueuedSale {
	idempotencyKey: string
	sessionId: string
	customerId?: string
	paymentMethod: PaymentMethod
	totalAmount: number
	taxAmount: number
	discountAmount: number
	paidAmount: number
	cart: CartItem[]
	queuedAt: string
}

interface ProcessOfflineQueueArgs {
	queuedSales: OfflineQueuedSale[]
	initialProcessedKeys: Iterable<string>
	syncSale: (queuedSale: OfflineQueuedSale) => Promise<void>
}

interface ProcessOfflineQueueResult {
	remainingQueue: OfflineQueuedSale[]
	processedKeys: string[]
	lastError: string | null
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

const OFFLINE_QUEUE_STORAGE_KEY = 'uplink.pos.offline.queue.v1'
const PROCESSED_SALES_STORAGE_KEY = 'uplink.pos.offline.processed.v1'

function isBrowser() {
	return typeof window !== 'undefined'
}

function parseJsonArray<T>(raw: string | null): T[] {
	if (!raw) return []
	try {
		const parsed = JSON.parse(raw) as unknown
		return Array.isArray(parsed) ? (parsed as T[]) : []
	} catch {
		return []
	}
}

function getErrorMessage(error: unknown, fallback: string) {
	return error instanceof Error ? error.message : fallback
}

export function readOfflineQueue(): OfflineQueuedSale[] {
	if (!isBrowser()) return []
	return parseJsonArray<OfflineQueuedSale>(
		window.localStorage.getItem(OFFLINE_QUEUE_STORAGE_KEY),
	)
}

export function writeOfflineQueue(queue: OfflineQueuedSale[]) {
	if (!isBrowser()) return
	window.localStorage.setItem(OFFLINE_QUEUE_STORAGE_KEY, JSON.stringify(queue))
}

export function readProcessedOfflineSales(): string[] {
	if (!isBrowser()) return []
	return parseJsonArray<string>(
		window.localStorage.getItem(PROCESSED_SALES_STORAGE_KEY),
	)
}

export function writeProcessedOfflineSales(keys: string[]) {
	if (!isBrowser()) return
	window.localStorage.setItem(PROCESSED_SALES_STORAGE_KEY, JSON.stringify(keys))
}

export function createOfflineIdempotencyKey(sessionId: string): string {
	return `OFFLINE-${sessionId}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`
}

export function enqueueOfflineSale(
	existingQueue: OfflineQueuedSale[],
	entry: OfflineQueuedSale,
) {
	if (
		existingQueue.some(
			(queued) => queued.idempotencyKey === entry.idempotencyKey,
		)
	) {
		return existingQueue
	}
	return [...existingQueue, entry]
}

export function removeOfflineSaleByKey(
	existingQueue: OfflineQueuedSale[],
	idempotencyKey: string,
) {
	return existingQueue.filter(
		(queued) => queued.idempotencyKey !== idempotencyKey,
	)
}

export async function processOfflineQueueBatch({
	queuedSales,
	initialProcessedKeys,
	syncSale,
}: ProcessOfflineQueueArgs): Promise<ProcessOfflineQueueResult> {
	const processedKeys = new Set(initialProcessedKeys)
	const remainingQueue: OfflineQueuedSale[] = []
	let lastError: string | null = null

	for (const queuedSale of queuedSales) {
		if (processedKeys.has(queuedSale.idempotencyKey)) continue

		try {
			await syncSale(queuedSale)
			processedKeys.add(queuedSale.idempotencyKey)
		} catch (error) {
			remainingQueue.push(queuedSale)
			lastError = getErrorMessage(error, 'Unable to sync offline sale queue')
		}
	}

	return {
		remainingQueue,
		processedKeys: Array.from(processedKeys),
		lastError,
	}
}

export function resolveEntityId(
	entity: { _id?: string; id?: string } | null | undefined,
	entityLabel: string,
): string {
	const id = entity?._id ?? entity?.id
	if (!id) {
		throw new Error(`${entityLabel} creation did not return an id`)
	}
	return id
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
	const queryClient = useQueryClient()
	const syncInProgressRef = React.useRef(false)
	const [isOnline, setIsOnline] = React.useState<boolean>(() =>
		isBrowser() ? navigator.onLine : true,
	)
	const [pendingSyncCount, setPendingSyncCount] = React.useState<number>(
		() => readOfflineQueue().length,
	)
	const [isSyncingQueue, setIsSyncingQueue] = React.useState(false)
	const [lastSyncError, setLastSyncError] = React.useState<string | null>(null)

	const { create: createTransaction, transitionStatus } = useEntityMutations(
		'pos',
		'transactions',
		{ enableOptimistic: false },
	)
	const { create: createLine } = useEntityMutations('pos', 'transactionLines', {
		enableOptimistic: false,
	})
	const generateReceipt = useMutation(
		$rpc.pos.transactions.generateReceipt.mutationOptions(),
	)

	const syncSaleToBackend = React.useCallback(
		async (queuedSale: OfflineQueuedSale) => {
			const existingTransactions = await queryClient.fetchQuery(
				$rpc.pos.transactions.list.queryOptions({
					input: {
						limit: 1,
						offset: 0,
						filters: { receiptNo: queuedSale.idempotencyKey },
					},
				}),
			)
			const existingTransaction = existingTransactions.items[0] as
				| { _id: string; status?: string }
				| undefined

			const header =
				existingTransaction ??
				(await createTransaction.mutateAsync({
					receiptNo: queuedSale.idempotencyKey,
					posSessionId: queuedSale.sessionId,
					customerId: queuedSale.customerId ?? undefined,
					totalAmount: queuedSale.totalAmount,
					taxAmount: queuedSale.taxAmount,
					discountAmount: queuedSale.discountAmount,
					paidAmount: queuedSale.paidAmount,
					paymentMethod: queuedSale.paymentMethod,
				}))

			const headerId = resolveEntityId(
				header as { _id?: string; id?: string } | null | undefined,
				'POS transaction',
			)

			const existingLines = await queryClient.fetchQuery(
				$rpc.pos.transactionLines.list.queryOptions({
					input: {
						limit: 200,
						offset: 0,
						filters: { transactionId: headerId },
					},
				}),
			)
			const existingLineKeys = new Set(
				existingLines.items.map(
					(line) =>
						`${line.itemId}|${line.quantity}|${line.unitPrice}|${line.discountPercent}|${line.lineAmount}`,
				),
			)

			for (const line of queuedSale.cart) {
				const lineKey = `${line.itemId}|${line.quantity}|${line.unitPrice}|${line.discountPercent}|${line.lineAmount}`
				if (existingLineKeys.has(lineKey)) continue

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

			if ((header as { status?: string }).status !== 'COMPLETED') {
				await transitionStatus.mutateAsync({
					id: headerId,
					toStatus: 'COMPLETED',
				})
			}

			return {
				transactionId: headerId,
				receiptNo:
					(header as { receiptNo?: string }).receiptNo ??
					queuedSale.idempotencyKey,
			}
		},
		[createLine, createTransaction, queryClient, transitionStatus],
	)

	const rateLimitedSync = useAsyncRateLimitedCallback(syncSaleToBackend, {
		limit: 3,
		window: 10_000,
	})

	const invalidateTransactionQueries = useDebouncedCallback(
		() => {
			void queryClient.invalidateQueries({
				queryKey: $rpc.pos.transactions.key(),
			})
			void queryClient.invalidateQueries({
				queryKey: $rpc.pos.transactionLines.key(),
			})
		},
		{ wait: 1000 },
	)

	const flushOfflineQueue = React.useCallback(async () => {
		if (!isOnline || syncInProgressRef.current) return
		const queuedSales = readOfflineQueue()
		if (queuedSales.length === 0) {
			setPendingSyncCount(0)
			setLastSyncError(null)
			return
		}

		syncInProgressRef.current = true
		setIsSyncingQueue(true)
		setLastSyncError(null)

		try {
			const result = await processOfflineQueueBatch({
				queuedSales,
				initialProcessedKeys: readProcessedOfflineSales(),
				syncSale: async (queuedSale) => {
					await rateLimitedSync(queuedSale)
				},
			})

			writeOfflineQueue(result.remainingQueue)
			writeProcessedOfflineSales(result.processedKeys.slice(-1000))
			setPendingSyncCount(result.remainingQueue.length)
			setLastSyncError(result.lastError)
			invalidateTransactionQueries()
		} finally {
			syncInProgressRef.current = false
			setIsSyncingQueue(false)
		}
	}, [isOnline, queryClient, rateLimitedSync, invalidateTransactionQueries])

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
		async (paymentMethod: PaymentMethod) => {
			if (!state.session || state.cart.length === 0) return
			const idempotencyKey = createOfflineIdempotencyKey(state.session.id)
			const queuedSale: OfflineQueuedSale = {
				idempotencyKey,
				sessionId: state.session.id,
				customerId: state.customer?.id ?? undefined,
				paymentMethod,
				totalAmount: totals.total,
				taxAmount: totals.taxAmount,
				discountAmount: totals.discountTotal,
				paidAmount: totals.total,
				cart: state.cart,
				queuedAt: new Date().toISOString(),
			}

			try {
				const synced = await syncSaleToBackend(queuedSale)
				const processedKeys = new Set(readProcessedOfflineSales())
				processedKeys.add(idempotencyKey)
				writeProcessedOfflineSales(Array.from(processedKeys).slice(-1000))
				const queueAfterSuccess = removeOfflineSaleByKey(
					readOfflineQueue(),
					idempotencyKey,
				)
				writeOfflineQueue(queueAfterSuccess)
				setPendingSyncCount(queueAfterSuccess.length)
				setLastSyncError(null)

				try {
					const receiptFile = await generateReceipt.mutateAsync({
						transactionId: synced.transactionId,
						builtInLayout: 'THERMAL_RECEIPT',
					})
					await downloadBinaryPayload(
						receiptFile,
						`ticket-${synced.receiptNo}.pdf`,
					)
					toast.success('Sale completed and ticket downloaded')
				} catch (receiptError) {
					toast.error('Sale completed but ticket download failed', {
						description: getErrorMessage(
							receiptError,
							'Use Transactions > Reprint receipt to retry',
						),
					})
				}
			} catch (error) {
				const updatedQueue = enqueueOfflineSale(readOfflineQueue(), queuedSale)
				writeOfflineQueue(updatedQueue)
				setPendingSyncCount(updatedQueue.length)
				setLastSyncError(
					getErrorMessage(
						error,
						'Sale queued for offline retry due to backend availability',
					),
				)
				toast.info('Sale queued for offline sync')
			}

			dispatch({ type: 'COMPLETE_SALE' })
		},
		[
			state.session,
			state.cart,
			state.customer,
			totals,
			syncSaleToBackend,
			generateReceipt,
		],
	)

	React.useEffect(() => {
		if (!isBrowser()) return

		const onOnline = () => {
			setIsOnline(true)
		}
		const onOffline = () => {
			setIsOnline(false)
		}

		window.addEventListener('online', onOnline)
		window.addEventListener('offline', onOffline)
		return () => {
			window.removeEventListener('online', onOnline)
			window.removeEventListener('offline', onOffline)
		}
	}, [])

	const flushThrottler = useAsyncThrottler(flushOfflineQueue, {
		wait: 5000,
		leading: true,
		trailing: true,
	})

	React.useEffect(() => {
		if (!isOnline || pendingSyncCount === 0) return
		void flushThrottler.maybeExecute()
		const id = window.setInterval(() => {
			void flushThrottler.maybeExecute()
		}, 5000)
		return () => window.clearInterval(id)
	}, [isOnline, pendingSyncCount, flushThrottler])

	return {
		state,
		dispatch,
		totals,
		addItem,
		removeSelectedLine,
		clearCart,
		completeSale,
		voidTransaction,
		isOnline,
		pendingSyncCount,
		isSyncingQueue,
		lastSyncError,
		syncOfflineQueueNow: flushOfflineQueue,
	}
}
