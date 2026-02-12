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
	'flex h-dvh w-full flex-col gap-0 overflow-hidden p-0 max-sm:rounded-none sm:rounded-md md:h-[90dvh]',
	{
		variants: {
			size: {
				sm: 'sm:w-[40vw] sm:max-w-lg',
				md: 'sm:w-[60vw] sm:max-w-3xl',
				lg: 'sm:w-[80vw] sm:max-w-none',
			},
		},
		defaultVariants: {
			size: 'lg',
		},
	},
)

export function RecordDialog({
	open,
	onOpenChange,
	title,
	description,
	children,
	footer,
	size = 'lg',
	className,
}: {
	open: boolean
	onOpenChange: (open: boolean) => void
	title: string
	description?: string
	children: React.ReactNode
	footer?: React.ReactNode
	className?: string
} & VariantProps<typeof recordDialogVariants>) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				showCloseButton
				className={cn(recordDialogVariants({ size, className }))}
			>
				<DialogHeader className='shrink-0 border-b px-6 py-4'>
					<div className='flex items-start justify-between gap-4'>
						<div className='min-w-0'>
							<DialogTitle className='text-balance'>{title}</DialogTitle>
							{description && (
								<DialogDescription>{description}</DialogDescription>
							)}
						</div>
						{footer && (
							<div className='flex shrink-0 items-center gap-2'>{footer}</div>
						)}
					</div>
				</DialogHeader>
				<div className='flex-1 overflow-auto px-6 py-4'>{children}</div>
			</DialogContent>
		</Dialog>
	)
}

export { recordDialogVariants }
