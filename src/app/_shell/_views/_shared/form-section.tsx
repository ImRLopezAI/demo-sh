import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface FormSectionProps {
	title: string
	description?: string
	className?: string
	children: ReactNode
}

export function FormSection({
	title,
	description,
	className,
	children,
}: FormSectionProps) {
	return (
		<section className={cn('space-y-4', className)}>
			<div className='space-y-1'>
				<h3 className='text-balance font-bold text-lg leading-tight'>
					{title}
				</h3>
				{description ? (
					<p className='text-muted-foreground text-sm'>{description}</p>
				) : null}
			</div>
			{children}
		</section>
	)
}
