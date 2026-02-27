type RouterHistoryAction = (href: string) => void

const noopAction: RouterHistoryAction = () => {}

export interface AppRouterInstance {
	back(): void
	forward(): void
	refresh(): void
	push: RouterHistoryAction
	replace: RouterHistoryAction
	prefetch: RouterHistoryAction
}

const router: AppRouterInstance = {
	back: () => {},
	forward: () => {},
	refresh: () => {},
	push: noopAction,
	replace: noopAction,
	prefetch: noopAction,
}

export function useRouter(): AppRouterInstance {
	return router
}

export function usePathname(): string {
	if (typeof window === 'undefined') {
		return '/'
	}

	return window.location.pathname || '/'
}

export function useSearchParams(): URLSearchParams {
	if (typeof window === 'undefined') {
		return new URLSearchParams()
	}

	return new URLSearchParams(window.location.search)
}
