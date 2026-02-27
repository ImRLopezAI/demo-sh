'use client'

import { AnimatedThemeToggler } from '@ui/animated-theme-toggler'
import { ArrowUpRight } from 'lucide-react'
import { MobileNav } from '@/components/layout/header/mobile-nav'
import Search from '@/components/layout/header/search'
import { TopNav } from '@/components/layout/header/top-nav'
import { Link } from '@/components/ui/link'
import { Separator } from '@/components/ui/separator'

export function SiteHeader() {
	return (
		<header className='sticky top-0 z-50 flex h-(--header-height) shrink-0 items-center border-border/50 border-b bg-background/50 backdrop-blur-xl supports-backdrop-filter:bg-background/40'>
			<div className='mx-auto flex w-full max-w-420 items-center gap-2 px-4 lg:gap-3 lg:px-6'>
				<Link
					to='/'
					className='flex items-center gap-2.5 rounded-md bg-transparent hover:bg-transparent'
				>
					<div className='flex items-center gap-3'>
						<div className='flex size-7 items-center justify-center rounded-xl bg-linear-to-br from-white to-zinc-400'>
							<div className='flex size-5 items-center justify-center rounded-lg bg-black'>
								<ArrowUpRight className='size-3 text-white' />
							</div>
						</div>
						<span className='font-extrabold text-foreground text-sm'>
							Uplink
						</span>
					</div>
				</Link>
				<Separator orientation='vertical' className='mx-2 hidden lg:block' />
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
