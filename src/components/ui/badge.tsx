import { mergeProps } from '@base-ui/react/merge-props'
import { useRender } from '@base-ui/react/use-render'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const badgeVariants = cva(
	'group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden whitespace-nowrap rounded border border-transparent px-2 py-0.5 font-medium text-[0.625rem] transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-2.5!',
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
					'bg-green-400/10 text-green-700 focus-visible:ring-green-400/20 dark:bg-green-400/20 dark:text-green-300 dark:focus-visible:ring-green-400/40 [a]:hover:bg-green-400/20',
				warning:
					'bg-yellow-400/10 text-yellow-700 focus-visible:ring-yellow-400/20 dark:bg-yellow-400/20 dark:text-yellow-300 dark:focus-visible:ring-yellow-400/40 [a]:hover:bg-yellow-400/20',
				error:
					'bg-red-400/10 text-red-700 focus-visible:ring-red-400/20 dark:bg-red-400/20 dark:text-red-300 dark:focus-visible:ring-red-400/40 [a]:hover:bg-red-400/20',
				info: 'bg-blue-400/10 text-blue-700 focus-visible:ring-blue-400/20 dark:bg-blue-400/20 dark:text-blue-300 dark:focus-visible:ring-blue-400/40 [a]:hover:bg-blue-400/20',
				inverted:
					'bg-purple-400/10 text-purple-700 focus-visible:ring-purple-400/20 dark:bg-purple-400/20 dark:text-purple-300 dark:focus-visible:ring-purple-400/40 [a]:hover:bg-purple-400/20',
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
