import {
	createFileRoute,
	Outlet,
	useNavigate,
	useRouterState,
} from '@tanstack/react-router'
import { SiteHeader } from '@/components/layout/header'
import { AppSidebarContext } from '@/components/layout/sidebar/context'
import { ScrollInterceptor } from '@/components/ui/scroll-interceptor'
import { navGroups } from './nav-config'

export const Route = createFileRoute('/_shell')({
	component: ShellLayout,
})

function ShellLayout() {
	const navigate = useNavigate()
	const pathname = useRouterState({ select: (s) => s.location.pathname })

	return (
		<ScrollInterceptor slots={['main-content']}>
			<AppSidebarContext
				value={{
					items: navGroups,
					pathname,
					navigate: (to) => navigate({ to }),
				}}
			>
				<div className='relative flex min-h-svh flex-col'>
					<SiteHeader />
					<main className='relative flex-1 overflow-auto px-4 pb-8 pt-4 md:px-6 md:pt-6'>
						<div
							aria-hidden
							className='pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-primary/7 to-transparent'
						/>
						<div className='relative mx-auto flex w-full max-w-[1680px] flex-col gap-6 md:gap-8' data-slot='main-content'>
							<Outlet />
						</div>
					</main>
				</div>
			</AppSidebarContext>
		</ScrollInterceptor>
	)
}
