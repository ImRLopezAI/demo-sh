'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { Suspense, useMemo } from 'react'
import { NotFoundComponent } from '@/components/layout/errors/not-found'
import { parseRouterSearch } from '@/lib/router/search'
import { ShellLayout } from './shell-layout'
import { isViewRouteKey, VIEW_COMPONENTS } from './view-components'

interface ModuleRoutePageProps {
	moduleId: string
	viewId: string
}

export function ModuleRoutePage({ moduleId, viewId }: ModuleRoutePageProps) {
	const pathname = usePathname() || '/'
	const searchParams = useSearchParams()
	const routeKey = `${moduleId}/${viewId}`
	const ViewComponent = isViewRouteKey(routeKey)
		? VIEW_COMPONENTS[routeKey]
		: null

	const search = useMemo(
		() => parseRouterSearch(searchParams.toString()),
		[searchParams],
	)

	const location = useMemo(
		() => ({
			pathname,
			search,
			hash: typeof window !== 'undefined' ? window.location.hash || '' : '',
		}),
		[pathname, search],
	)

	const routeProps = useMemo(
		() =>
			({
				params: { _splat: routeKey },
				search,
				location,
			}) as any,
		[location, routeKey, search],
	)

	if (!ViewComponent) {
		return <NotFoundComponent />
	}

	return (
		<ShellLayout>
			<Suspense fallback={<ViewSkeleton />}>
				<div data-slot='view-component'>
					<ViewComponent {...routeProps} />
				</div>
			</Suspense>
		</ShellLayout>
	)
}

function ViewSkeleton() {
	return (
		<div className='space-y-6'>
			<div className='h-8 w-48 animate-pulse rounded bg-muted' />
			<div className='grid grid-cols-4 gap-3'>
				{['a', 'b', 'c', 'd'].map((placeholderKey) => (
					<div
						key={`skeleton-${placeholderKey}`}
						className='h-20 animate-pulse rounded-lg bg-muted'
					/>
				))}
			</div>
			<div className='h-96 animate-pulse rounded-lg bg-muted' />
		</div>
	)
}
