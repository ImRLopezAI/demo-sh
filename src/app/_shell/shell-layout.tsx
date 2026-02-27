'use client'

import { usePathname, useRouter } from 'next/navigation'
import type { PropsWithChildren } from 'react'
import { SiteHeader } from '@/components/layout/header'
import { AppSidebarContext } from '@/components/layout/sidebar/context'
import { ScrollInterceptor } from '@/components/ui/scroll-interceptor'
import { navGroups } from './nav-config'

export function ShellLayout({ children }: PropsWithChildren) {
	const router = useRouter()
	const pathname = usePathname() || '/'

	return (
		<AppSidebarContext
			value={{
				items: navGroups,
				pathname,
				navigate: (to) => router.push(to),
			}}
		>
			<div className='relative flex min-h-svh flex-col'>
				<SiteHeader />
				<ScrollInterceptor slots={['main-content', 'view-component']}>
					<main
						id='main-content'
						className='relative flex-1 overflow-auto bg-background/50 px-4 pt-4 pb-8 md:px-6 md:pt-6'
						data-slot='main-content'
					>
						<div
							aria-hidden
							className='pointer-events-none absolute inset-x-0 top-0 h-64 bg-linear-to-b from-primary/10 via-primary/5 to-transparent'
						/>
						{children}
					</main>
				</ScrollInterceptor>
			</div>
		</AppSidebarContext>
	)
}
