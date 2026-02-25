import { stringifyRouterSearch } from '@lib/router/search'
import { useNavigate, useRouterState } from '@tanstack/react-router'
import * as React from 'react'

export type RecordSearchMode = 'new' | 'detail'

interface RecordSearchState {
	mode?: RecordSearchMode
	recordId?: string
}

interface RecordSearchKeys {
	modeKey: string
	recordIdKey: string
	scopeKey: string
}

interface UseRecordSearchStateOptions {
	modeKey?: string
	recordIdKey?: string
	scopeKey?: string
}

function asSearchRecord(value: unknown): Record<string, unknown> {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		return {}
	}

	return value as Record<string, unknown>
}

function readRecordSearchState(
	search: unknown,
	keys: RecordSearchKeys,
	expectedScope: string,
): RecordSearchState {
	const searchRecord = asSearchRecord(search)
	const scopeValue = searchRecord[keys.scopeKey]

	if (typeof scopeValue === 'string' && scopeValue !== expectedScope) {
		return {}
	}

	const modeValue = searchRecord[keys.modeKey]
	const recordIdValue = searchRecord[keys.recordIdKey]

	const recordId =
		typeof recordIdValue === 'string' && recordIdValue.trim().length > 0
			? recordIdValue
			: undefined

	if (modeValue === 'new') {
		return { mode: 'new' }
	}

	if (modeValue === 'detail') {
		return recordId ? { mode: 'detail', recordId } : {}
	}

	if (recordId) {
		return { mode: 'detail', recordId }
	}

	return {}
}

function mergeRecordSearchState(
	previous: unknown,
	nextState: RecordSearchState,
	keys: RecordSearchKeys,
	scope: string,
): Record<string, unknown> {
	const searchRecord = asSearchRecord(previous)
	const nextSearchRecord = { ...searchRecord }

	if (nextState.mode) {
		nextSearchRecord[keys.modeKey] = nextState.mode
		nextSearchRecord[keys.scopeKey] = scope
	} else {
		delete nextSearchRecord[keys.modeKey]
		delete nextSearchRecord[keys.scopeKey]
	}

	if (nextState.recordId) {
		nextSearchRecord[keys.recordIdKey] = nextState.recordId
	} else {
		delete nextSearchRecord[keys.recordIdKey]
	}

	return nextSearchRecord
}

export function useRecordSearchState(
	options: UseRecordSearchStateOptions = {},
) {
	const keys = React.useMemo<RecordSearchKeys>(
		() => ({
			modeKey: options.modeKey ?? 'mode',
			recordIdKey: options.recordIdKey ?? 'recordId',
			scopeKey: options.scopeKey ?? '_recordScope',
		}),
		[options.modeKey, options.recordIdKey, options.scopeKey],
	)

	const navigate = useNavigate()
	const location = useRouterState({ select: (state) => state.location })
	const search = location.search

	const recordSearchState = React.useMemo(
		() => readRecordSearchState(search, keys, location.pathname),
		[keys, location.pathname, search],
	)

	const selectedId =
		recordSearchState.mode === 'new'
			? 'new'
			: recordSearchState.mode === 'detail'
				? (recordSearchState.recordId ?? null)
				: null

	const setRecordSearchState = React.useCallback(
		(nextState: RecordSearchState) => {
			const nextSearch = mergeRecordSearchState(
				search,
				nextState,
				keys,
				location.pathname,
			)
			const searchString = stringifyRouterSearch(nextSearch)
			const hash = location.hash ?? ''

			void navigate({
				href: `${location.pathname}${searchString}${hash}`,
			})
		},
		[keys, location.hash, location.pathname, navigate, search],
	)

	const openCreate = React.useCallback(() => {
		setRecordSearchState({ mode: 'new' })
	}, [setRecordSearchState])

	const openDetail = React.useCallback(
		(recordId: string) => {
			if (!recordId) return

			setRecordSearchState({
				mode: 'detail',
				recordId,
			})
		},
		[setRecordSearchState],
	)

	const close = React.useCallback(() => {
		setRecordSearchState({})
	}, [setRecordSearchState])

	return {
		mode: recordSearchState.mode,
		recordId: recordSearchState.recordId,
		selectedId,
		isOpen: selectedId !== null,
		openCreate,
		openDetail,
		close,
	}
}
