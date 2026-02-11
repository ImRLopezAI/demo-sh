import { Link as BaseLink } from '@tanstack/react-router'
import type { VariantProps } from 'class-variance-authority'
import type * as React from 'react'
import { cn } from '@/lib/utils'
import { buttonVariants } from './button'

function Link({
	className,
	variant,
	size,
	...props
}: React.ComponentProps<typeof BaseLink> &
	VariantProps<typeof buttonVariants> & {}) {
	return (
		<BaseLink
			data-slot='link'
			className={cn(buttonVariants({ variant, size, className }))}
			{...props}
		/>
	)
}

export { Link }
