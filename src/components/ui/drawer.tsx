'use client'

import { cn } from '@lib/utils'
import type * as React from 'react'
import { Drawer as DrawerPrimitive } from 'ui-drawer'

function Drawer({
	...props
}: React.ComponentProps<typeof DrawerPrimitive.Root>) {
	return <DrawerPrimitive.Root data-slot='drawer' {...props} />
}

function DrawerTrigger({
	...props
}: React.ComponentProps<typeof DrawerPrimitive.Trigger>) {
	return <DrawerPrimitive.Trigger data-slot='drawer-trigger' {...props} />
}

function DrawerPortal({
	...props
}: React.ComponentProps<typeof DrawerPrimitive.Portal>) {
	return <DrawerPrimitive.Portal data-slot='drawer-portal' {...props} />
}

function DrawerClose({
	...props
}: React.ComponentProps<typeof DrawerPrimitive.Close>) {
	return <DrawerPrimitive.Close data-slot='drawer-close' {...props} />
}

function DrawerOverlay({
	className,
	...props
}: React.ComponentProps<typeof DrawerPrimitive.Overlay>) {
	return (
		<DrawerPrimitive.Overlay
			data-slot='drawer-overlay'
			className={cn(
				'data-closed:fade-out-0 data-open:fade-in-0 fixed inset-0 z-50 bg-black/80 data-closed:animate-out data-open:animate-in supports-backdrop-filter:backdrop-blur-xs',
				className,
			)}
			{...props}
		/>
	)
}

type DrawerContentProps = React.ComponentProps<
	typeof DrawerPrimitive.Content
> & {
	bodyClassName?: string
}

function DrawerContent({
	className,
	bodyClassName,
	children,
	...props
}: DrawerContentProps) {
	const slider = 'mx-auto mt-2 hidden h-1.5 w-25 shrink-0 rounded-full bg-muted'
	return (
		<DrawerPortal data-slot='drawer-portal'>
			<DrawerOverlay />
			<DrawerPrimitive.Content
				data-slot='drawer-content'
				className={cn(
					'scrollbar-background group/drawer-content z-50 flex flex-col overflow-visible bg-background text-sm shadow-lg outline-none',
					'data-[vaul-drawer-direction=bottom]:fixed data-[vaul-drawer-direction=bottom]:inset-x-0 data-[vaul-drawer-direction=bottom]:bottom-0 data-[vaul-drawer-direction=bottom]:max-h-[90vh] data-[vaul-drawer-direction=bottom]:rounded-t-xl',
					'data-[vaul-drawer-direction=top]:fixed data-[vaul-drawer-direction=top]:inset-x-0 data-[vaul-drawer-direction=top]:top-0 data-[vaul-drawer-direction=top]:max-h-[90vh] data-[vaul-drawer-direction=top]:rounded-b-xl',
					'data-[vaul-drawer-direction=left]:fixed data-[vaul-drawer-direction=left]:inset-y-0 data-[vaul-drawer-direction=left]:left-0 data-[vaul-drawer-direction=left]:w-[90vw] data-[vaul-drawer-direction=left]:max-w-sm data-[vaul-drawer-direction=left]:rounded-r-xl',
					'data-[vaul-drawer-direction=right]:fixed data-[vaul-drawer-direction=right]:inset-y-0 data-[vaul-drawer-direction=right]:right-0 data-[vaul-drawer-direction=right]:w-[90vw] data-[vaul-drawer-direction=right]:max-w-sm data-[vaul-drawer-direction=right]:rounded-l-xl',
					className,
				)}
				{...props}
			>
				<div
					className={cn(
						slider,
						'group-data-[vaul-drawer-direction=bottom]/drawer-content:block',
					)}
				/>
				<div
					className={cn(
						'min-h-0 flex-1 gap-3 overflow-y-auto overflow-x-hidden overscroll-contain p-4',
						bodyClassName,
					)}
				>
					{children}
				</div>
				<div
					className={cn(
						slider,
						'group-data-[vaul-drawer-direction=top]/drawer-content:block',
					)}
				/>
			</DrawerPrimitive.Content>
		</DrawerPortal>
	)
}

function DrawerHeader({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot='drawer-header'
			className={cn(
				'flex flex-col gap-1 p-4 group-data-[vaul-drawer-direction=bottom]/drawer-content:text-center group-data-[vaul-drawer-direction=top]/drawer-content:text-center md:text-left',
				className,
			)}
			{...props}
		/>
	)
}

function DrawerFooter({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot='drawer-footer'
			className={cn('mt-auto flex flex-col gap-2 p-4', className)}
			{...props}
		/>
	)
}

function DrawerTitle({
	className,
	...props
}: React.ComponentProps<typeof DrawerPrimitive.Title>) {
	return (
		<DrawerPrimitive.Title
			data-slot='drawer-title'
			className={cn('font-medium text-foreground text-sm', className)}
			{...props}
		/>
	)
}

function DrawerDescription({
	className,
	...props
}: React.ComponentProps<typeof DrawerPrimitive.Description>) {
	return (
		<DrawerPrimitive.Description
			data-slot='drawer-description'
			className={cn('text-muted-foreground text-xs/relaxed', className)}
			{...props}
		/>
	)
}

export {
	Drawer,
	DrawerClose,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerOverlay,
	DrawerPortal,
	DrawerTitle,
	DrawerTrigger,
}
