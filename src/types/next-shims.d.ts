declare module 'next' {
	export interface Metadata {
		title?: string
		description?: string
	}
}

declare module 'next/link' {
	import type * as React from 'react'

	export interface LinkProps
		extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
		href: string | URL
		replace?: boolean
		scroll?: boolean
		prefetch?: boolean
	}

	const Link: React.ForwardRefExoticComponent<
		LinkProps & React.RefAttributes<HTMLAnchorElement>
	>

	export default Link
}

declare module 'next/navigation' {
	export interface AppRouterInstance {
		back(): void
		forward(): void
		refresh(): void
		push(href: string): void
		replace(href: string): void
		prefetch(href: string): void
	}

	export function useRouter(): AppRouterInstance
	export function usePathname(): string
	export function useSearchParams(): URLSearchParams
}
