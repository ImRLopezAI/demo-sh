import type { VariantProps } from 'class-variance-authority'
import NextLink from 'next/link'
import type * as React from 'react'
import { cn } from '@/lib/utils'
import { buttonVariants } from './button'

type LegacyLinkParams = {
	_splat?: string
	[key: string]: string | number | undefined
}

type LinkProps = Omit<React.ComponentProps<typeof NextLink>, 'href'> &
	VariantProps<typeof buttonVariants> & {
		href?: React.ComponentProps<typeof NextLink>['href']
		to?: string
		params?: LegacyLinkParams
	}

function resolveHref(
	href: LinkProps['href'],
	to: LinkProps['to'],
	params: LinkProps['params'],
) {
	if (href) {
		return href
	}

	if (!to) {
		return '#'
	}

	if (to === '/$') {
		const splat = params?._splat
		if (typeof splat === 'string' && splat.trim().length > 0) {
			return `/${splat.replace(/^\/+/, '')}`
		}
	}

	if (params && to.includes('$')) {
		let resolved = to
		for (const [key, value] of Object.entries(params)) {
			if (value === undefined) continue
			resolved = resolved.replace(`$${key}`, encodeURIComponent(String(value)))
		}
		return resolved
	}

	return to
}

function Link({
	className,
	variant,
	size,
	href,
	to,
	params,
	...props
}: LinkProps) {
	const resolvedHref = resolveHref(href, to, params)

	return (
		<NextLink
			href={resolvedHref}
			data-slot='link'
			className={cn(buttonVariants({ variant, size, className }))}
			{...props}
		/>
	)
}

export { Link }
