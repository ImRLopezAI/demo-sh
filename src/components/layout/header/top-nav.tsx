'use client'

import { useAppSidebar } from '@/components/layout/sidebar/context'
import { Badge } from '@/components/ui/badge'
import {
	NavigationMenu,
	NavigationMenuContent,
	NavigationMenuItem,
	NavigationMenuLink,
	NavigationMenuList,
	NavigationMenuTrigger,
} from '@/components/ui/navigation-menu'
import { cn } from '@/lib/utils'

function isActiveRoute(pathname: string, href?: string) {
	if (!href) return false
	return pathname === href || pathname.startsWith(`${href}/`)
}

export function TopNav() {
	const { items, pathname, navigate } = useAppSidebar()

	return (
		<NavigationMenu className='hidden lg:flex lg:flex-1'>
			<NavigationMenuList className='gap-1'>
				{items.map((group) => {
					const groupItems =
						group.type === 'dynamic' ? group.dynamicItems() : group.items

					return (
						<NavigationMenuItem key={group.title}>
							<NavigationMenuTrigger className='h-9 rounded-md border border-transparent px-2.5 py-1 text-muted-foreground text-xs transition-colors hover:border-border/60 hover:bg-muted/45 hover:text-foreground data-[popup-open]:border-border/60 data-[popup-open]:bg-muted/55 data-[popup-open]:text-foreground'>
								{group.title}
							</NavigationMenuTrigger>
							<NavigationMenuContent>
								<div
									className={cn(
										'grid gap-px p-1',
										groupItems.length === 1 && 'w-[260px] grid-cols-1',
										groupItems.length === 2 && 'w-[480px] grid-cols-2',
										groupItems.length >= 3 && 'w-[700px] grid-cols-3',
									)}
								>
									{groupItems.map((module) => (
										<div key={module.title} className='px-1 py-1'>
											<div className='mb-1 flex items-center gap-2 px-2 py-1'>
												{module.icon && (
													<div className='flex size-5 items-center justify-center rounded bg-primary/10 text-primary'>
														<module.icon className='size-3' />
													</div>
												)}
												<span className='font-medium text-[11px] text-muted-foreground uppercase tracking-wider'>
													{module.title}
												</span>
											</div>
											<ul className='space-y-0.5'>
												{module.items?.map((child) => (
													<li key={child.href ?? child.title}>
														<NavigationMenuLink
															href={child.href ?? '#'}
															active={isActiveRoute(pathname, child.href)}
															closeOnClick
															className={cn(
																'flex items-center gap-2 rounded px-2 py-1.5 text-xs transition-colors hover:bg-muted/50',
																isActiveRoute(pathname, child.href) &&
																	'bg-primary/12 font-medium text-foreground',
															)}
															onClick={(event) => {
																if (
																	event.metaKey ||
																	event.ctrlKey ||
																	event.shiftKey ||
																	event.button !== 0
																)
																	return
																event.preventDefault()
																if (child.href) navigate(child.href)
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
														</NavigationMenuLink>
													</li>
												))}
											</ul>
										</div>
									))}
								</div>
							</NavigationMenuContent>
						</NavigationMenuItem>
					)
				})}
			</NavigationMenuList>
		</NavigationMenu>
	)
}
