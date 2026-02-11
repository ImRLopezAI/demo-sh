'use client'

import { ChevronRightIcon, MenuIcon } from 'lucide-react'
import { useState } from 'react'
import { useAppSidebar } from '@/components/layout/sidebar/context'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

export function MobileNav() {
	const { items, pathname, navigate } = useAppSidebar()
	const [open, setOpen] = useState(false)

	return (
		<Sheet open={open} onOpenChange={setOpen}>
			<SheetTrigger
				render={
					<Button
						variant='ghost'
						size='icon'
						className='rounded-md border border-transparent lg:hidden hover:border-border/70 hover:bg-muted/60'
					/>
				}
			>
				<MenuIcon className='size-5' />
				<span className='sr-only'>Toggle navigation</span>
			</SheetTrigger>
			<SheetContent
				side='left'
				className='w-72 overflow-y-auto border-border/80 bg-card/95 p-0'
			>
				<SheetHeader className='border-border/70 border-b px-4 py-3'>
					<div className='flex items-center gap-2'>
						<div className='flex size-7 items-center justify-center rounded-sm border border-primary/35 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground'>
							<span className='font-bold text-xs'>U</span>
						</div>
						<SheetTitle className='text-sm'>Uplink</SheetTitle>
					</div>
				</SheetHeader>
				<nav className='flex flex-col gap-1 p-2'>
					{items.map((group) => {
						const groupItems =
							group.type === 'dynamic' ? group.dynamicItems() : group.items

						return (
							<div key={group.title}>
								<p className='px-3 py-2 font-medium text-[10px] text-muted-foreground uppercase tracking-wider'>
									{group.title}
								</p>
								{groupItems.map((module) => (
									<Collapsible
										key={module.title}
										defaultOpen={module.items?.some((c) => c.href === pathname)}
									>
										<CollapsibleTrigger className='flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm transition-colors hover:bg-muted/70'>
											{module.icon && (
												<module.icon className='size-4 text-muted-foreground' />
											)}
											<span className='flex-1 text-left font-medium'>
												{module.title}
											</span>
											<ChevronRightIcon className='size-3.5 text-muted-foreground transition-transform [[data-panel-open]>&]:rotate-90' />
										</CollapsibleTrigger>
										<CollapsibleContent>
											<ul className='ml-6 space-y-0.5 border-l py-1 pl-2'>
												{module.items?.map((child) => (
													<li key={child.href}>
														<button
															type='button'
															className={cn(
																'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs transition-colors hover:bg-muted',
																pathname === child.href &&
																	'bg-muted font-medium',
															)}
															onClick={() => {
																if (child.href) navigate(child.href)
																setOpen(false)
															}}
														>
															{child.icon && (
																<child.icon className='size-3.5 text-muted-foreground' />
															)}
															<span>{child.title}</span>
															{child.badge && (
																<Badge
																	variant='secondary'
																	className='ml-auto text-[9px]'
																>
																	{child.badge}
																</Badge>
															)}
														</button>
													</li>
												))}
											</ul>
										</CollapsibleContent>
									</Collapsible>
								))}
							</div>
						)
					})}
				</nav>
			</SheetContent>
		</Sheet>
	)
}
