'use client'

import { useIsTablet } from '@hooks/use-mobile'
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	useSidebar,
} from '@ui/sidebar'
import * as React from 'react'
import { NavMain } from '@/components/layout/sidebar/nav-main'
import { ScrollArea } from '@/components/ui/scroll-area'

import {
	AppSidebarContext,
	type SidebarContextProps,
	useAppSidebar,
} from './context'

interface AppSidebarProps
	extends React.ComponentProps<typeof Sidebar>,
		SidebarContextProps {}

type AppSidebarHeaderProps = React.ComponentProps<typeof SidebarHeader>

function AppSidebarHeader({ ...props }: AppSidebarHeaderProps) {
	useAppSidebar()
	return <SidebarHeader {...props} />
}

type AppSidebarFooterProps = React.ComponentProps<typeof SidebarFooter>

function AppSidebarFooter({ ...props }: AppSidebarFooterProps) {
	useAppSidebar()
	return <SidebarFooter {...props} />
}
AppSidebarHeader.displayName = 'AppSidebarHeader'
AppSidebarFooter.displayName = 'AppSidebarFooter'

type SidebarChildSlots = {
	header?: React.ReactElement<AppSidebarHeaderProps>
	footer?: React.ReactElement<AppSidebarFooterProps>
	content: React.ReactNode[]
}

function getSidebarSlots(children: React.ReactNode): SidebarChildSlots {
	const slots: SidebarChildSlots = {
		content: [],
	}

	const collectSlot = (child: React.ReactNode) => {
		if (React.isValidElement(child)) {
			if (child.type === React.Fragment) {
				React.Children.forEach(
					(child.props as { children?: React.ReactNode }).children,
					collectSlot,
				)
				return
			}

			const elementType = child.type as {
				displayName?: string
				name?: string
			}
			const elementName = elementType.displayName ?? elementType.name
			if (
				child.type === AppSidebarHeader ||
				elementName === 'AppSidebarHeader'
			) {
				slots.header = child as React.ReactElement<AppSidebarHeaderProps>
				return
			}

			if (
				child.type === AppSidebarFooter ||
				elementName === 'AppSidebarFooter'
			) {
				slots.footer = child as React.ReactElement<AppSidebarFooterProps>
				return
			}
		}

		slots.content.push(child)
	}

	React.Children.forEach(children, collectSlot)

	return slots
}

function AppSidebarRoot({
	items,
	pathname,
	navigate,
	children,
	...props
}: AppSidebarProps) {
	const { setOpen, setOpenMobile, isMobile } = useSidebar()
	const isTablet = useIsTablet()
	const { header, footer, content } = getSidebarSlots(children)

	React.useEffect(() => {
		if (isMobile) setOpenMobile(false)
	}, [pathname])

	React.useEffect(() => {
		setOpen(!isTablet)
	}, [isTablet])

	return (
		<AppSidebarContext value={{ items, pathname, navigate }}>
			<Sidebar
				collapsible='icon'
				className='border-border/50 border-r bg-background/50 backdrop-blur-xl'
				{...props}
			>
				{header}
				<ScrollArea className='h-full'>
					<SidebarContent>
						<NavMain />
					</SidebarContent>
				</ScrollArea>
				{footer}
			</Sidebar>
			{content}
		</AppSidebarContext>
	)
}

type AppSidebarComponent = typeof AppSidebarRoot & {
	Header: typeof AppSidebarHeader
	Footer: typeof AppSidebarFooter
}

export const AppSidebar = Object.assign(AppSidebarRoot, {
	Header: AppSidebarHeader,
	Footer: AppSidebarFooter,
}) as AppSidebarComponent
