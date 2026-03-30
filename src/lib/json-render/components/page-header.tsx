import type * as React from 'react'

export function PageHeader({
	title,
	description,
	actions,
}: {
	title: string
	description?: string
	actions?: React.ReactNode
}) {
	return (
		<header className='relative overflow-hidden rounded-xl border border-border/50 bg-background/50 px-6 py-5 shadow-sm backdrop-blur-xl sm:px-8 sm:py-6'>
			<div className='relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
				<div className='space-y-1.5'>
					<h1 className='text-balance font-semibold text-2xl text-foreground tracking-tight sm:text-3xl'>
						{title}
					</h1>
					{description && (
						<p className='max-w-3xl text-muted-foreground text-sm leading-relaxed sm:text-base'>
							{description}
						</p>
					)}
				</div>
				{actions && (
					<div className='flex items-center gap-3 self-start sm:self-auto'>
						{actions}
					</div>
				)}
			</div>
		</header>
	)
}
