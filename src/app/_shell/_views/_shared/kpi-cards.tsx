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
				'grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4',
				className,
			)}
		>
			{cards.length === 0 && (
				<p className='col-span-full text-center text-muted-foreground text-sm'>
					No data available
				</p>
			)}
			{cards.map((card) => (
				<Card key={card.title} size='sm' className='relative'>
					<CardHeader>
						<div className='flex items-center justify-between'>
							<CardDescription>{card.title}</CardDescription>
							{card.icon && (
								<card.icon
									className='size-4 text-muted-foreground'
									aria-hidden='true'
								/>
							)}
						</div>
						<CardTitle className='text-lg tabular-nums'>{card.value}</CardTitle>
					</CardHeader>
					{card.description && (
						<CardContent>
							<p className='text-muted-foreground text-xs'>
								{card.description}
							</p>
						</CardContent>
					)}
				</Card>
			))}
		</div>
	)
}
