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
		<header className='relative overflow-hidden rounded-lg border border-border/75 bg-card/92 px-4 py-3 shadow-xs sm:px-5 sm:py-4'>
			<div className='relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
				<div className='space-y-1'>
					<h1 className='text-balance font-semibold text-2xl tracking-tight sm:text-3xl'>
						{title}
					</h1>
					{description && (
						<p className='max-w-3xl text-muted-foreground text-sm sm:text-base'>
							{description}
						</p>
					)}
				</div>
				{actions && (
					<div className='flex items-center gap-2 self-start sm:self-auto'>
						{actions}
					</div>
				)}
			</div>
		</header>
	)
}
