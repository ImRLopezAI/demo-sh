import { mergeProps } from '@base-ui/react/merge-props'
import { useRender } from '@base-ui/react/use-render'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const badgeVariants = cva(
	'group/badge inline-flex h-6 w-fit shrink-0 items-center justify-center gap-1.5 overflow-hidden whitespace-nowrap rounded-full border border-transparent px-2.5 py-0.5 font-medium text-[0.6875rem] tracking-wide transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3!',
	{
		variants: {
			variant: {
				default: 'bg-primary text-primary-foreground [a]:hover:bg-primary/80',
				secondary:
					'bg-secondary text-secondary-foreground [a]:hover:bg-secondary/80',
				destructive:
					'bg-destructive/10 text-destructive focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:focus-visible:ring-destructive/40 [a]:hover:bg-destructive/20',
				outline:
					'border-border bg-input/20 text-foreground dark:bg-input/30 [a]:hover:bg-muted [a]:hover:text-muted-foreground',
				ghost:
					'hover:bg-muted hover:text-muted-foreground dark:hover:bg-muted/50',
				link: 'text-primary underline-offset-4 hover:underline',
				success:
					'border-green-500/20 bg-green-500/15 text-green-700 focus-visible:ring-green-500/20 dark:border-green-500/30 dark:bg-green-500/20 dark:text-green-300 dark:focus-visible:ring-green-500/40 [a]:hover:bg-green-500/20',
				warning:
					'border-yellow-500/20 bg-yellow-500/15 text-yellow-700 focus-visible:ring-yellow-500/20 dark:border-yellow-500/30 dark:bg-yellow-500/20 dark:text-yellow-300 dark:focus-visible:ring-yellow-500/40 [a]:hover:bg-yellow-500/20',
				error:
					'border-red-500/20 bg-red-500/15 text-red-700 focus-visible:ring-red-500/20 dark:border-red-500/30 dark:bg-red-500/20 dark:text-red-300 dark:focus-visible:ring-red-500/40 [a]:hover:bg-red-500/20',
				info: 'border-blue-500/20 bg-blue-500/15 text-blue-700 focus-visible:ring-blue-500/20 dark:border-blue-500/30 dark:bg-blue-500/20 dark:text-blue-300 dark:focus-visible:ring-blue-500/40 [a]:hover:bg-blue-500/20',
				inverted:
					'border-purple-500/20 bg-purple-500/15 text-purple-700 focus-visible:ring-purple-500/20 dark:border-purple-500/30 dark:bg-purple-500/20 dark:text-purple-300 dark:focus-visible:ring-purple-500/40 [a]:hover:bg-purple-500/20',
			},
		},
		defaultVariants: {
			variant: 'default',
		},
	},
)

function Badge({
	className,
	variant = 'default',
	render,
	...props
}: useRender.ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
	return useRender({
		defaultTagName: 'span',
		props: mergeProps<'span'>(
			{
				className: cn(badgeVariants({ className, variant })),
			},
			props,
		),
		render,
		state: {
			slot: 'badge',
			variant,
		},
	})
}

export { Badge, badgeVariants }
