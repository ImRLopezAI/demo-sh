import type * as React from 'react'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import { cn } from '@/lib/utils'

export interface KpiCardDef {
	title: string
	value: string | number
	description?: string
	icon?: React.ComponentType<{ className?: string }>
}

export function KpiCards({
	cards,
	className,
}: {
	cards: KpiCardDef[]
	className?: string
}) {
	return (
		<div
			className={cn(
				'grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4',
				className,
			)}
		>
			{cards.length === 0 && (
				<p className='col-span-full py-8 text-center text-muted-foreground text-sm'>
					No data available
				</p>
			)}
			{cards.map((card) => (
				<Card
					key={card.title}
					size='sm'
					className='group relative overflow-hidden border-border/50 bg-background/50 shadow-sm backdrop-blur-xl transition-all duration-300 hover:shadow-md'
				>
					<div className='absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100' />
					<CardHeader className='pb-2'>
						<div className='flex items-center justify-between'>
							<CardDescription className='font-medium text-muted-foreground/80'>
								{card.title}
							</CardDescription>
							{card.icon && (
								<div className='rounded-lg bg-primary/10 p-2 text-primary'>
									<card.icon className='size-4' aria-hidden='true' />
								</div>
							)}
						</div>
						<CardTitle className='mt-2 text-2xl tabular-nums tracking-tight'>
							{card.value}
						</CardTitle>
					</CardHeader>
					{card.description && (
						<CardContent>
							<p className='text-muted-foreground text-sm'>
								{card.description}
							</p>
						</CardContent>
					)}
				</Card>
			))}
		</div>
	)
}
