'use client'

import * as React from 'react'

type ScrollInterceptorProps = {
	slots?: string[]
	children: React.ReactNode
}

const NON_VISIBLE_OVERFLOW = new Set(['hidden', 'auto', 'scroll', 'overlay'])
const DEFAULT_SLOTS = [
	'sheet-content',
	'dialog-content',
	'combobox-content',
	'command-list',
	'popover-content',
	'tooltip-content',
	'sidebar-content',
] as const

function toSlotSelector(slots: readonly string[]) {
	return slots.map((slot) => `[data-slot="${slot}"]`).join(',')
}

function isScrollable(element: HTMLElement) {
	const style = window.getComputedStyle(element)
	const canScrollY =
		NON_VISIBLE_OVERFLOW.has(style.overflowY) &&
		element.scrollHeight > element.clientHeight
	const canScrollX =
		NON_VISIBLE_OVERFLOW.has(style.overflowX) &&
		element.scrollWidth > element.clientWidth
	return canScrollY || canScrollX
}

function findScrollableAncestor(
	start: HTMLElement,
	boundary: HTMLElement | null,
) {
	let node: HTMLElement | null = start
	while (node && node !== boundary) {
		if (isScrollable(node)) return node
		node = node.parentElement
	}
	if (boundary && isScrollable(boundary)) return boundary
	return null
}

export function ScrollInterceptor({
	slots = [],
	children,
}: ScrollInterceptorProps) {
	const rootRef = React.useRef<HTMLDivElement>(null)
	const slotSelectorRef = React.useRef(toSlotSelector(DEFAULT_SLOTS))
	const mergedSlotSelector = React.useMemo(
		() => toSlotSelector([...new Set([...DEFAULT_SLOTS, ...slots])]),
		[slots],
	)
	slotSelectorRef.current = mergedSlotSelector

	const onWheel = React.useEffectEvent((event: WheelEvent) => {
		const target = event.target
		if (!(target instanceof HTMLElement)) return

		const root = rootRef.current
		if (root?.contains(target)) return

		const selector = slotSelectorRef.current
		if (!selector) return

		const slotElement = target.closest(selector)
		if (!slotElement || !(slotElement instanceof HTMLElement)) return

		const scrollable = findScrollableAncestor(target, slotElement)
		if (!scrollable) return

		scrollable.scrollTop += event.deltaY
		scrollable.scrollLeft += event.deltaX

		event.stopPropagation()
		if (event.cancelable) {
			event.preventDefault()
		}
	})

	React.useEffect(() => {
		document.addEventListener('wheel', onWheel, {
			capture: true,
			passive: false,
		})
		return () => {
			document.removeEventListener('wheel', onWheel, true)
		}
	}, [onWheel])

	return (
		<div ref={rootRef} className='contents' data-slot='scroll-interceptor'>
			{children}
		</div>
	)
}
