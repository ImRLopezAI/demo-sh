import {
	BarChart3,
	DollarSign,
	type LucideIcon,
	MapPin,
	Package,
} from 'lucide-react'
import type * as React from 'react'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { StatusBadge } from './status-badge'

const METRIC_ICON_MAP: Record<string, LucideIcon> = {
	package: Package,
	dollar: DollarSign,
	chart: BarChart3,
	map: MapPin,
}

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
					{description ? (
						<p className='max-w-3xl text-muted-foreground text-sm leading-relaxed sm:text-base'>
							{description}
						</p>
					) : null}
				</div>
				{actions ? (
					<div className='flex items-center gap-3 self-start sm:self-auto'>
						{actions}
					</div>
				) : null}
			</div>
		</header>
	)
}

export function DashboardPageStack({
	children,
}: {
	children?: React.ReactNode
}) {
	return <div className='space-y-5 pb-8'>{children}</div>
}

export function DashboardThreeColumnGrid({
	children,
}: {
	children?: React.ReactNode
}) {
	return <div className='grid grid-cols-1 gap-5 lg:grid-cols-3'>{children}</div>
}

export function MetricStrip({
	items,
}: {
	items: Array<{
		label: string
		value: string
		icon?: string | null
	}>
}) {
	return (
		<div className='grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6'>
			{items.map((item) => {
				const Icon = item.icon ? METRIC_ICON_MAP[item.icon] : null
				return (
					<div
						key={item.label}
						className='rounded-lg border border-border/40 bg-background/60 px-3 py-2.5'
					>
						<div className='flex items-center gap-1.5'>
							{Icon ? (
								<Icon className='size-3 text-muted-foreground/50' />
							) : null}
							<p className='truncate text-[10px] text-muted-foreground uppercase tracking-wider'>
								{item.label}
							</p>
						</div>
						<p className='mt-1 font-semibold text-base tabular-nums tracking-tight'>
							{item.value}
						</p>
					</div>
				)
			})}
		</div>
	)
}

export function StatRowsPanel({
	title,
	description,
	items,
}: {
	title: string
	description?: string
	items: Array<{
		label: string
		value: string
		description?: string
	}>
}) {
	return (
		<Card className='shadow-sm transition-shadow hover:shadow-md'>
			<CardHeader className='border-border/50 border-b bg-muted/20'>
				<CardTitle className='text-base'>{title}</CardTitle>
				{description ? <CardDescription>{description}</CardDescription> : null}
			</CardHeader>
			<CardContent className='space-y-0 p-0'>
				{items.map((item, index) => (
					<div
						key={item.label}
						className={cn(
							'px-4 py-3 transition-colors hover:bg-muted/30',
							index > 0 && 'border-border/30 border-t',
						)}
					>
						<div className='flex items-baseline justify-between'>
							<span className='text-muted-foreground text-xs'>
								{item.label}
							</span>
							<span className='font-semibold text-sm tabular-nums'>
								{item.value}
							</span>
						</div>
						{item.description ? (
							<p className='mt-0.5 text-[10px] text-muted-foreground/60'>
								{item.description}
							</p>
						) : null}
					</div>
				))}
			</CardContent>
		</Card>
	)
}

export function StackedDistributionPanel({
	title,
	description,
	items,
	colorMap,
	emptyMessage,
}: {
	title: string
	description?: string
	items: Array<{ name: string; value: number }>
	colorMap?: Record<string, string>
	emptyMessage: string
}) {
	const total = items.reduce((sum, item) => sum + item.value, 0)
	return (
		<Card className='shadow-sm transition-shadow hover:shadow-md'>
			<CardHeader className='border-border/50 border-b bg-muted/20'>
				<CardTitle className='text-base'>{title}</CardTitle>
				{description ? <CardDescription>{description}</CardDescription> : null}
			</CardHeader>
			<CardContent className='pt-5'>
				{items.length === 0 ? (
					<p className='py-6 text-center text-muted-foreground text-sm'>
						{emptyMessage}
					</p>
				) : (
					<div className='space-y-3'>
						<div className='flex h-4 w-full overflow-hidden rounded-lg'>
							{items.map((item) => (
								<div
									key={item.name}
									className={cn(
										colorMap?.[item.name] ?? 'bg-slate-400',
										'transition-all',
									)}
									style={{
										width: `${total > 0 ? (item.value / total) * 100 : 0}%`,
									}}
								/>
							))}
						</div>
						<div className='grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3'>
							{items.map((item) => {
								const percent =
									total > 0 ? ((item.value / total) * 100).toFixed(1) : '0'
								return (
									<div
										key={item.name}
										className='flex items-center gap-3 rounded-lg border border-border/30 bg-background/40 p-2.5'
									>
										<div
											className={cn(
												'h-3 w-3 shrink-0 rounded-sm',
												colorMap?.[item.name] ?? 'bg-slate-400',
											)}
										/>
										<div className='min-w-0 flex-1'>
											<p className='truncate text-xs'>
												{item.name.replace(/_/g, ' ')}
											</p>
											<p className='font-semibold text-sm tabular-nums'>
												{item.value.toLocaleString()}{' '}
												<span className='font-normal text-[10px] text-muted-foreground'>
													({percent}%)
												</span>
											</p>
										</div>
									</div>
								)
							})}
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	)
}

export function RecordListPanel({
	title,
	items,
	isLoading,
	emptyMessage,
	emptyIcon,
	metaBadges,
}: {
	title: string
	items: Array<{
		id: string
		title: string
		subtitle: string
		status?: string | null
		leadingBadge?: string | null
		leadingBadgeClassName?: string | null
	}>
	isLoading?: boolean
	emptyMessage: string
	emptyIcon?: React.ReactNode
	metaBadges?: Array<{ label: string; count: string }>
}) {
	return (
		<Card className='shadow-sm transition-shadow hover:shadow-md'>
			<CardHeader className='border-border/50 border-b bg-muted/20'>
				<div className='flex items-center justify-between gap-3'>
					<CardTitle className='text-base'>{title}</CardTitle>
					{metaBadges?.length ? (
						<div className='flex gap-2'>
							{metaBadges.map((badge) => (
								<span
									key={badge.label}
									className='rounded-md border border-border/40 bg-background/60 px-2 py-0.5 font-mono text-[10px]'
								>
									{badge.label}:{badge.count}
								</span>
							))}
						</div>
					) : null}
				</div>
			</CardHeader>
			<CardContent className='p-0'>
				{isLoading ? (
					<div className='space-y-0 p-4' role='status' aria-label='Loading'>
						{Array.from({ length: 5 }).map((_, i) => (
							<div
								key={`skeleton-${i}`}
								className='h-10 border-border/20 border-b bg-muted/30 motion-safe:animate-pulse'
							/>
						))}
					</div>
				) : items.length === 0 ? (
					<div className='flex flex-col items-center justify-center py-8 text-center'>
						{emptyIcon}
						<p className='text-muted-foreground text-sm'>{emptyMessage}</p>
					</div>
				) : (
					<div className='divide-y divide-border/30'>
						{items.map((item) => (
							<div
								key={item.id}
								className='flex items-center justify-between gap-2 px-4 py-2.5 transition-colors hover:bg-muted/20'
							>
								<div className='flex min-w-0 items-center gap-2.5'>
									{item.leadingBadge ? (
										<div
											className={cn(
												'flex h-7 w-7 shrink-0 items-center justify-center rounded-md font-bold text-[10px]',
												item.leadingBadgeClassName,
											)}
										>
											{item.leadingBadge}
										</div>
									) : null}
									<div className='min-w-0'>
										<p className='truncate text-sm'>{item.title}</p>
										<p className='truncate text-[10px] text-muted-foreground'>
											{item.subtitle}
										</p>
									</div>
								</div>
								{item.status ? <StatusBadge status={item.status} /> : null}
							</div>
						))}
					</div>
				)}
			</CardContent>
		</Card>
	)
}
