'use client'

import { AnimatedThemeToggler } from '@ui/animated-theme-toggler'
import { MobileNav } from '@/components/layout/header/mobile-nav'
import Search from '@/components/layout/header/search'
import { TopNav } from '@/components/layout/header/top-nav'
import { Separator } from '@/components/ui/separator'

export function SiteHeader() {
	return (
		<header className='sticky top-0 z-50 flex h-[var(--header-height)] shrink-0 items-center border-border/75 border-b bg-background/80 backdrop-blur-lg supports-[backdrop-filter]:bg-background/70'>
			<div className='mx-auto flex w-full max-w-[1680px] items-center gap-2 px-4 lg:gap-3 lg:px-6'>
				<div className='flex items-center gap-2.5'>
					<div className='flex size-9 items-center justify-center rounded-lg border border-primary/35 bg-linear-to-br from-primary to-primary/80 text-primary-foreground shadow-xs'>
						<span className='font-bold text-xs tracking-wider'>U</span>
					</div>
					<div className='hidden flex-col leading-none sm:flex'>
						<span className='font-semibold text-sm tracking-tight'>Uplink</span>
						<span className='text-[10px] text-muted-foreground uppercase tracking-[0.16em]'>
							Operations Suite
						</span>
					</div>
				</div>
				<Separator
					orientation='vertical'
					className='mx-2 hidden lg:block'
				/>
				<MobileNav />
				<TopNav />
				<div className='ml-auto flex items-center gap-2'>
					<Search />
					<AnimatedThemeToggler />
				</div>
			</div>
		</header>
	)
}
