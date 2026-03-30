/**
 * Partial re-export shim — chart components moved to @/components/ui/json-render/dashboard-widgets.
 * DashboardStatsPanel and DashboardSectionGrid remain here until hub/flow dashboards are migrated.
 * Delete once all consumers import from the canonical paths.
 */

// ── Re-exports from canonical location ──────────────────────────────────────
export {
	DashboardDistributionChart,
	DashboardTrendChart,
} from '@/components/ui/json-render/dashboard-widgets'

// ── Kept locally until hub/flow dashboards are migrated ─────────────────────
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import { cn } from '@/lib/utils'

export type DashboardStatItem = {
	label: string
	value: string | number
	description?: string
}

export function DashboardStatsPanel({
	title,
	description,
	items,
	className,
}: {
	title: string
	description?: string
	items: DashboardStatItem[]
	className?: string
}) {
	return (
		<Card
			className={cn(
				'shadow-sm transition-shadow duration-300 hover:shadow-md',
				className,
			)}
		>
			<CardHeader className='border-border/50 border-b bg-muted/20'>
				<CardTitle>{title}</CardTitle>
				{description ? <CardDescription>{description}</CardDescription> : null}
			</CardHeader>
			<CardContent className='pt-4'>
				{items.length === 0 ? (
					<p className='py-8 text-center text-muted-foreground text-sm'>
						No data available.
					</p>
				) : (
					<dl className='grid gap-3'>
						{items.map((item) => (
							<div
								key={item.label}
								className='rounded-lg border border-border/40 bg-background/30 p-3 transition-colors hover:bg-muted/50'
							>
								<dt className='truncate text-muted-foreground text-xs'>
									{item.label}
								</dt>
								<dd className='mt-1 truncate font-semibold text-lg tabular-nums tracking-tight'>
									{item.value}
								</dd>
								{item.description ? (
									<dd className='mt-1 truncate text-muted-foreground text-xs'>
										{item.description}
									</dd>
								) : null}
							</div>
						))}
					</dl>
				)}
			</CardContent>
		</Card>
	)
}

export function DashboardSectionGrid({
	children,
	className,
}: {
	children: React.ReactNode
	className?: string
}) {
	return (
		<div className={cn('grid grid-cols-1 gap-4 xl:grid-cols-3', className)}>
			{children}
		</div>
	)
}
