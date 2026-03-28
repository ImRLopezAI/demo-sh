'use client'

/**
 * Custom page renderer that extends @json-render/next's PageRenderer
 * with support for $computed functions.
 *
 * Uses JSONUIProvider from @json-render/react for full feature support
 * (state, visibility, validation, actions, functions) while maintaining
 * the same layout-with-slot rendering pattern as PageRenderer.
 */
import { useNextApp } from '@json-render/next'
import { Renderer } from '@json-render/react'
import { Fragment, type ReactNode, useMemo } from 'react'
import { computedFunctions } from './functions'

/* ── Stub Slot (replaced in layout rendering) ── */
function SlotComponent() {
	return null
}

/* ── Layout rendering with Slot injection ── */
function LayoutWithSlot({
	layoutSpec,
	registry,
	loading,
	children,
}: {
	layoutSpec: any
	registry: Record<string, any>
	loading?: boolean
	children: ReactNode
}) {
	const layoutRegistry = useMemo(
		() => ({
			...registry,
			Slot: function LayoutSlot() {
				return <Fragment>{children}</Fragment>
			},
		}),
		[registry, children],
	)
	return (
		<Renderer spec={layoutSpec} registry={layoutRegistry} loading={loading} />
	)
}

/* ── FunctionsContext provider ── */
// JSONUIProvider creates all providers (State, Visibility, Validation, Action)
// AND provides FunctionsContext. We recreate the PageRenderer pattern
// but inject computed functions so $computed expressions resolve.
import { JSONUIProvider } from '@json-render/react'

export function JsonRenderPage({
	spec,
	initialState,
	layoutSpec,
}: {
	spec: any
	initialState?: any
	layoutSpec?: any
}) {
	const { registry, handlers, navigate } = useNextApp()

	const augmentedRegistry = useMemo(
		() => ({
			...registry,
			Slot: SlotComponent,
		}),
		[registry],
	)

	const actionHandlers = useMemo(() => {
		const base: Record<string, any> = { ...handlers }
		base.navigate = (params: { href?: string }) => {
			if (params.href) navigate(params.href)
		}
		return base
	}, [handlers, navigate])

	const pageContent = <Renderer spec={spec} registry={augmentedRegistry} />

	const content = layoutSpec ? (
		<LayoutWithSlot layoutSpec={layoutSpec} registry={augmentedRegistry}>
			{pageContent}
		</LayoutWithSlot>
	) : (
		pageContent
	)

	return (
		<JSONUIProvider
			registry={augmentedRegistry}
			initialState={initialState}
			handlers={actionHandlers}
			navigate={navigate}
			functions={computedFunctions}
		>
			{content}
		</JSONUIProvider>
	)
}
