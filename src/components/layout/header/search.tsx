'use client'

import { useRouter } from '@tanstack/react-router'
import { Button } from '@ui/button'
import {
	Command,
	CommandDialog,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator,
} from '@ui/command'
import { CommandIcon, SearchIcon } from 'lucide-react'
import React, { useState } from 'react'
import { useAppSidebar } from '@/components/layout/sidebar/context'

type SearchEntry = {
	id: string
	group: string
	module: string
	title: string
	href: string
	icon?: React.ComponentType<{ className?: string }>
}

function getSearchEntries(
	items: ReturnType<typeof useAppSidebar>['items'],
): SearchEntry[] {
	const seen = new Set<string>()
	const entries: SearchEntry[] = []

	for (const group of items) {
		const modules =
			group.type === 'dynamic' ? group.dynamicItems() : group.items

		for (const module of modules) {
			for (const child of module.items ?? []) {
				if (!child.href || seen.has(child.href)) continue
				seen.add(child.href)
				entries.push({
					id: `${group.title}-${module.title}-${child.href}`,
					group: group.title,
					module: module.title,
					title: child.title,
					href: child.href,
					icon: child.icon ?? module.icon,
				})
			}
		}
	}

	return entries
}

export default function Search() {
	const [open, setOpen] = useState(false)
	const router = useRouter()
	const { items } = useAppSidebar()

	const entries = React.useMemo(() => getSearchEntries(items), [items])
	const groupedEntries = React.useMemo(() => {
		const map = new Map<string, SearchEntry[]>()
		for (const entry of entries) {
			const current = map.get(entry.group)
			if (current) {
				current.push(entry)
			} else {
				map.set(entry.group, [entry])
			}
		}
		return Array.from(map.entries())
	}, [entries])

	React.useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
				event.preventDefault()
				setOpen((current) => !current)
			}
		}
		window.addEventListener('keydown', onKeyDown)
		return () => window.removeEventListener('keydown', onKeyDown)
	}, [])

	return (
		<div className='lg:max-w-sm lg:flex-1'>
			<div className='relative hidden max-w-sm flex-1 lg:block'>
				<SearchIcon className='absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
				<Button
					variant='outline'
					className='h-9 w-full justify-start rounded-md border-border/70 bg-card/90 pr-14 pl-9 font-normal text-muted-foreground text-xs shadow-xs transition-colors hover:bg-card hover:text-foreground'
					onClick={() => setOpen(true)}
				>
					Search modules or pages...
				</Button>
				<div
					aria-hidden='true'
					className='absolute top-1/2 right-1 hidden -translate-y-1/2 items-center gap-1 rounded-sm border border-border/70 bg-muted/60 px-1.5 py-1 font-medium font-mono text-[10px] sm:flex'
				>
					<CommandIcon className='size-3' />
					<span>K</span>
				</div>
			</div>
			<div className='block lg:hidden'>
				<Button
					size='icon'
					variant='ghost'
					aria-label='Search'
					className='rounded-md border border-transparent hover:border-border/70 hover:bg-muted/60'
					onClick={() => setOpen(true)}
				>
					<SearchIcon />
				</Button>
			</div>
			<CommandDialog open={open} onOpenChange={setOpen}>
				<Command>
					<CommandInput placeholder='Jump to a page...' />
					<CommandList>
						<CommandEmpty>No results found.</CommandEmpty>
						{groupedEntries.map(([groupTitle, groupEntries], index) => (
							<React.Fragment key={groupTitle}>
								<CommandGroup heading={groupTitle}>
									{groupEntries.map((entry) => (
										<CommandItem
											key={entry.id}
											value={`${entry.group} ${entry.module} ${entry.title}`}
											onSelect={() => {
												setOpen(false)
												router.navigate({ to: entry.href })
											}}
										>
											{entry.icon && (
												<entry.icon className='me-2 h-4 w-4 text-muted-foreground' />
											)}
											<div className='min-w-0'>
												<p className='truncate'>{entry.title}</p>
												<p className='truncate text-muted-foreground text-xs'>
													{entry.module}
												</p>
											</div>
										</CommandItem>
									))}
								</CommandGroup>
								{index < groupedEntries.length - 1 && <CommandSeparator />}
							</React.Fragment>
						))}
					</CommandList>
				</Command>
			</CommandDialog>
		</div>
	)
}
