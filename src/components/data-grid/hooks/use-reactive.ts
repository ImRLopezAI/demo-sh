import type { TableState } from '@tanstack/react-table'
import { useCallback, useMemo, useReducer, useRef } from 'react'

type DispatchAction<T> = Partial<T> | ((prev: T) => Partial<T>)

const RESET_ACTION = Symbol('RESET_ACTION')

// ============================================================================
// useProxyState - Main hook for reactive state with Proxy API
// Benefits from React's automatic batching for better performance
//
// Usage:
//   const [state, dispatch, { reset, proxy }] = useProxyState({ count: 0 })
//   dispatch({ count: 1 })                    // partial update
//   dispatch(prev => ({ count: prev.count + 1 }))  // functional update
//   reset()                                   // reset to initial
//   proxy.count = 5                           // direct assignment
// ============================================================================

export type UseProxyStateActions<T extends object> = {
	reset: () => void
	proxy: T
}

export type UseProxyStateReturn<T extends object> = [
	state: T,
	dispatch: (action: DispatchAction<T>) => void,
	actions: UseProxyStateActions<T>,
]

type ReducerAction<T> =
	| { type: typeof RESET_ACTION }
	| { type: 'update'; payload: DispatchAction<T> }

export function useProxyState<T extends object>(
	initialState: T | (() => T),
): UseProxyStateReturn<T> {
	const initialRef = useRef<T | null>(null)
	if (initialRef.current === null) {
		initialRef.current =
			typeof initialState === 'function' ? initialState() : initialState
	}

	const [state, reducerDispatch] = useReducer(
		(prev: T, action: ReducerAction<T>): T => {
			if (action.type === RESET_ACTION) {
				return initialRef.current as T
			}

			const updates =
				typeof action.payload === 'function'
					? action.payload(prev)
					: action.payload

			return { ...prev, ...updates }
		},
		initialRef.current,
	)

	const dispatch = useCallback((action: DispatchAction<T>) => {
		reducerDispatch({ type: 'update', payload: action })
	}, [])

	const reset = useCallback(() => {
		reducerDispatch({ type: RESET_ACTION })
	}, [])

	// Use refs to maintain stable proxy identity across renders
	const stateRef = useRef(state)
	stateRef.current = state
	const dispatchRef = useRef(dispatch)
	dispatchRef.current = dispatch

	const proxyRef = useRef<T | null>(null)
	if (proxyRef.current === null) {
		proxyRef.current = new Proxy({} as T, {
			get(_target, prop) {
				if (typeof prop === 'symbol') return undefined
				return stateRef.current[prop as keyof T]
			},
			set(_target, prop, value) {
				if (typeof prop === 'symbol') return false
				dispatchRef.current({ [prop]: value } as Partial<T>)
				return true
			},
			has(_target, prop) {
				if (typeof prop === 'symbol') return false
				return prop in stateRef.current
			},
			ownKeys() {
				return Reflect.ownKeys(stateRef.current)
			},
			getOwnPropertyDescriptor(_target, prop) {
				if (typeof prop === 'symbol') return undefined
				if (prop in stateRef.current) {
					return {
						enumerable: true,
						configurable: true,
						value: stateRef.current[prop as keyof T],
					}
				}
				return undefined
			},
		})
	}

	const actions = useMemo(
		() => ({ reset, proxy: proxyRef.current as T }),
		[reset],
	)

	return [state, dispatch, actions]
}

// ============================================================================
// Proxy Utilities - For creating observable/lazy objects
// ============================================================================

export interface LazyProxyOptions {
	/** If true, invalidates cache when target properties change */
	trackDependencies?: boolean
}

export function createLazyProxy<T extends object>(
	target: T,
	computedGetters: Partial<Record<keyof T, () => unknown>>,
	options: LazyProxyOptions = {},
): T & { invalidateCache: (key?: keyof T) => void } {
	const cache = new Map<keyof T, unknown>()
	const { trackDependencies = false } = options

	let targetVersion = 0
	let lastSeenVersion = -1

	const invalidateCache = (key?: keyof T) => {
		if (key !== undefined) {
			cache.delete(key)
		} else {
			cache.clear()
		}
	}

	const bumpVersion = () => {
		targetVersion++
	}

	const invalidateIfStale = () => {
		if (targetVersion !== lastSeenVersion) {
			cache.clear()
			lastSeenVersion = targetVersion
		}
	}

	const proxy = new Proxy(target, {
		get(obj, prop) {
			if (prop === 'invalidateCache') return invalidateCache
			if (prop === '_bumpVersion') return bumpVersion
			if (typeof prop === 'symbol') return Reflect.get(obj, prop)

			const key = prop as keyof T
			if (key in computedGetters) {
				if (trackDependencies) {
					invalidateIfStale()
				}
				if (!cache.has(key)) {
					cache.set(key, computedGetters[key]?.())
				}
				return cache.get(key)
			}
			return Reflect.get(obj, prop)
		},
		set(obj, prop, value) {
			const result = Reflect.set(obj, prop, value)
			if (trackDependencies && result) {
				targetVersion++
			}
			return result
		},
		has(obj, prop) {
			if (prop === 'invalidateCache') return true
			return Reflect.has(obj, prop)
		},
		ownKeys(obj) {
			return Reflect.ownKeys(obj)
		},
		getOwnPropertyDescriptor(obj, prop) {
			return Reflect.getOwnPropertyDescriptor(obj, prop)
		},
	})

	return proxy as T & { invalidateCache: (key?: keyof T) => void }
}

export function createObservableData<T extends object>(
	data: T,
	onMutate: (prop: keyof T, newValue: T[keyof T], oldValue: T[keyof T]) => void,
): T {
	const clone = { ...data }

	return new Proxy(clone, {
		set(target, prop, value) {
			if (typeof prop === 'symbol') return false
			const key = prop as keyof T
			const oldValue = target[key]
			if (oldValue !== value) {
				target[key] = value
				onMutate(key, value, oldValue)
			}
			return true
		},
		get(target, prop) {
			return Reflect.get(target, prop)
		},
		has(target, prop) {
			return Reflect.has(target, prop)
		},
		ownKeys(target) {
			return Reflect.ownKeys(target)
		},
		getOwnPropertyDescriptor(target, prop) {
			return Reflect.getOwnPropertyDescriptor(target, prop)
		},
	})
}

// ============================================================================
// Table State Proxy - For direct table state manipulation
// ============================================================================

export function createTableStateProxy(
	getState: () => TableState,
	setState: <K extends keyof TableState>(key: K, value: TableState[K]) => void,
): TableState {
	return new Proxy({} as TableState, {
		get(_target, prop) {
			if (typeof prop === 'symbol') return undefined
			return getState()[prop as keyof TableState]
		},
		set(_target, prop, value) {
			if (typeof prop === 'symbol') return false
			setState(prop as keyof TableState, value)
			return true
		},
		has(_target, prop) {
			if (typeof prop === 'symbol') return false
			return prop in getState()
		},
		ownKeys() {
			return Reflect.ownKeys(getState())
		},
		getOwnPropertyDescriptor(_target, prop) {
			if (typeof prop === 'symbol') return undefined
			const state = getState()
			if (prop in state) {
				return {
					enumerable: true,
					configurable: true,
					value: state[prop as keyof TableState],
				}
			}
			return undefined
		},
	})
}
