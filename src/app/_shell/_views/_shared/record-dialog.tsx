import { cva, type VariantProps } from 'class-variance-authority'
import type * as React from 'react'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
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

export type RecordDialogPresentation = 'dialog' | 'page'

export function RecordDialog({
	open,
	onOpenChange,
	title,
	description,
	children,
	footer,
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
				<div className='flex-1 overflow-auto px-8 py-6'>{children}</div>
			</DialogContent>
		</Dialog>
	)
}

export { recordDialogVariants }
