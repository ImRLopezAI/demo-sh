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
		<section
			className={cn(
				'space-y-6 rounded-xl border border-border/40 bg-background/30 p-6 shadow-sm',
				className,
			)}
		>
			<div className='space-y-1.5 border-border/40 border-b pb-4'>
				<h3 className='text-balance font-semibold text-foreground text-lg tracking-tight'>
					{title}
				</h3>
				{description ? (
					<p className='text-muted-foreground text-sm leading-relaxed'>
						{description}
					</p>
				) : null}
			</div>
			<div className='pt-2'>{children}</div>
		</section>
	)
}
