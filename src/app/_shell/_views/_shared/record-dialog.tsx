import { cva, type VariantProps } from 'class-variance-authority'
import { ChevronDownIcon } from 'lucide-react'
import type * as React from 'react'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

const recordDialogVariants = cva(
	'flex w-full flex-col gap-0 overflow-hidden border border-border/50 bg-background/95 p-0 shadow-2xl backdrop-blur-xl',
	{
		variants: {
			size: {
				sm: 'sm:w-[40vw] sm:max-w-lg',
				md: 'sm:w-[60vw] sm:max-w-3xl',
				lg: 'sm:w-[80vw] sm:max-w-none',
			},
			presentation: {
				dialog: 'h-dvh max-sm:rounded-none sm:rounded-xl md:h-[90dvh]',
				page: 'rounded-xl',
			},
		},
		defaultVariants: {
			size: 'lg',
			presentation: 'dialog',
		},
	},
)

export interface RecordDialogAction {
	label: string
	onClick: () => void
	icon?: React.ReactNode
	disabled?: boolean
	variant?: 'default' | 'destructive'
}

export interface RecordDialogActionGroup {
	label: string
	items: RecordDialogAction[]
}

export type RecordDialogPresentation = 'dialog' | 'page'

function ActionGroupBar({ groups }: { groups: RecordDialogActionGroup[] }) {
	const nonEmpty = groups.filter((g) => g.items.length > 0)
	if (nonEmpty.length === 0) return null

	return (
		<div className='flex items-center gap-1 border-border/50 border-b bg-muted/5 px-8 py-1.5'>
			{nonEmpty.map((group) => (
				<DropdownMenu key={group.label}>
					<DropdownMenuTrigger className='inline-flex items-center gap-1 rounded-md px-2.5 py-1 font-medium text-muted-foreground text-xs transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'>
						{group.label}
						<ChevronDownIcon className='size-3' />
					</DropdownMenuTrigger>
					<DropdownMenuContent align='start' sideOffset={4}>
						<DropdownMenuGroup>
							<DropdownMenuLabel>{group.label}</DropdownMenuLabel>
							<DropdownMenuSeparator />
							{group.items.map((action) => (
								<DropdownMenuItem
									key={action.label}
									disabled={action.disabled}
									variant={action.variant}
									onClick={action.onClick}
								>
									{action.icon}
									{action.label}
								</DropdownMenuItem>
							))}
						</DropdownMenuGroup>
					</DropdownMenuContent>
				</DropdownMenu>
			))}
		</div>
	)
}

export function RecordDialog({
	open,
	onOpenChange,
	title,
	description,
	children,
	footer,
	actionGroups,
	size = 'lg',
	presentation = 'dialog',
	className,
}: {
	open: boolean
	onOpenChange: (open: boolean) => void
	title: string
	description?: string
	children: React.ReactNode
	footer?: React.ReactNode
	actionGroups?: RecordDialogActionGroup[]
	className?: string
	presentation?: RecordDialogPresentation
} & VariantProps<typeof recordDialogVariants>) {
	if (!open) {
		return null
	}

	if (presentation === 'page') {
		return (
			<section
				className={cn(
					'flex w-full flex-col gap-0 overflow-hidden rounded-xl border border-border/50 bg-background/95 p-0 shadow-2xl backdrop-blur-xl',
					className,
				)}
			>
				<div className='shrink-0 border-border/50 border-b bg-muted/10 px-8 py-6'>
					<div className='flex items-start justify-between gap-6'>
						<div className='min-w-0 space-y-1.5'>
							<h2 className='text-balance font-semibold text-foreground text-xl tracking-tight'>
								{title}
							</h2>
							{description && (
								<p className='text-muted-foreground text-sm leading-relaxed'>
									{description}
								</p>
							)}
						</div>
						{footer && (
							<div className='flex shrink-0 items-center gap-3'>{footer}</div>
						)}
					</div>
				</div>
				{actionGroups && <ActionGroupBar groups={actionGroups} />}
				<div className='flex-1 overflow-auto px-8 py-6'>{children}</div>
			</section>
		)
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				showCloseButton
				className={cn(recordDialogVariants({ size, presentation, className }))}
			>
				<DialogHeader className='shrink-0 border-border/50 border-b bg-muted/10 px-8 py-6'>
					<div className='flex items-start justify-between gap-6'>
						<div className='min-w-0 space-y-1.5'>
							<DialogTitle className='text-balance font-semibold text-foreground text-xl tracking-tight'>
								{title}
							</DialogTitle>
							{description && (
								<DialogDescription className='text-muted-foreground text-sm leading-relaxed'>
									{description}
								</DialogDescription>
							)}
						</div>
						{footer && (
							<div className='flex shrink-0 items-center gap-3'>{footer}</div>
						)}
					</div>
				</DialogHeader>
				{actionGroups && <ActionGroupBar groups={actionGroups} />}
				<div className='flex-1 overflow-auto px-8 py-6'>{children}</div>
			</DialogContent>
		</Dialog>
	)
}

export { recordDialogVariants }
