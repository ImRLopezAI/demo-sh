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
										'grid gap-3 rounded-lg border border-border/75 bg-card p-4 shadow-md',
										groupItems.length === 1 && 'w-[300px] grid-cols-1',
										groupItems.length === 2 && 'w-[560px] grid-cols-2',
										groupItems.length >= 3 && 'w-[760px] grid-cols-3',
									)}
								>
									{groupItems.map((module) => (
										<div
											key={module.title}
											className='rounded-md border border-border/70 bg-background/80 p-3'
										>
											<div className='mb-2 flex items-center gap-2 border-border/70 border-b pb-2'>
												{module.icon && (
													<div className='flex size-6 items-center justify-center rounded-md bg-primary/12 text-primary'>
														<module.icon className='size-3.5' />
													</div>
												)}
												<span className='font-semibold text-sm tracking-tight'>
													{module.title}
												</span>
											</div>
											<ul className='space-y-1'>
												{module.items?.map((child) => (
													<li key={child.href ?? child.title}>
														<NavigationMenuLink
															href={child.href ?? '#'}
															active={isActiveRoute(pathname, child.href)}
															closeOnClick
															className={cn(
																'flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors hover:bg-muted/70',
																isActiveRoute(pathname, child.href) &&
																	'bg-primary/14 font-medium text-foreground',
															)}
															onClick={(event) => {
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
