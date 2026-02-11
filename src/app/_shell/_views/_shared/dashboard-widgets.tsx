import {
	Bar,
	BarChart,
	CartesianGrid,
	Cell,
	Pie,
	PieChart,
	XAxis,
	YAxis,
} from 'recharts'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import {
	ChartContainer,
	ChartLegend,
	ChartLegendContent,
	ChartTooltip,
	ChartTooltipContent,
	type ChartConfig,
} from '@/components/ui/chart'
import { cn } from '@/lib/utils'
import type { CategorySeriesPoint, MonthlySeriesPoint } from './dashboard-utils'

const PIE_COLORS = [
	'var(--color-chart-1)',
	'var(--color-chart-2)',
	'var(--color-chart-3)',
	'var(--color-chart-4)',
	'var(--color-chart-5)',
] as const

export type DashboardStatItem = {
	label: string
	value: string | number
	description?: string
}

export function DashboardTrendChart({
	title,
	description,
	data,
	metricKey,
	metricLabel,
	className,
}: {
	title: string
	description?: string
	data: MonthlySeriesPoint[]
	metricKey: 'count' | 'amount'
	metricLabel: string
	className?: string
}) {
	const chartConfig = {
		[metricKey]: {
			label: metricLabel,
			color: metricKey === 'amount' ? 'var(--color-chart-2)' : 'var(--color-chart-1)',
		},
	} as ChartConfig

	return (
		<Card className={className}>
			<CardHeader className='border-b'>
				<CardTitle>{title}</CardTitle>
				{description && <CardDescription>{description}</CardDescription>}
			</CardHeader>
			<CardContent className='pt-4'>
				<ChartContainer config={chartConfig} className='h-[260px] w-full'>
					<BarChart data={data} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
						<CartesianGrid vertical={false} strokeDasharray='3 3' />
						<XAxis
							dataKey='month'
							tickLine={false}
							axisLine={false}
							tickMargin={8}
						/>
						<YAxis tickLine={false} axisLine={false} width={32} />
						<ChartTooltip
							cursor={false}
							content={<ChartTooltipContent indicator='line' />}
						/>
						<Bar
							dataKey={metricKey}
							fill={`var(--color-${metricKey})`}
							radius={[8, 8, 2, 2]}
							maxBarSize={40}
						/>
					</BarChart>
				</ChartContainer>
			</CardContent>
		</Card>
	)
}

export function DashboardDistributionChart({
	title,
	description,
	data,
	emptyMessage = 'No distribution data available.',
	className,
}: {
	title: string
	description?: string
	data: CategorySeriesPoint[]
	emptyMessage?: string
	className?: string
}) {
	const chartConfig = Object.fromEntries(
		data.map((entry, index) => [
			entry.name,
			{
				label: entry.name,
				color: PIE_COLORS[index % PIE_COLORS.length],
			},
		]),
	) as ChartConfig

	return (
		<Card className={className}>
			<CardHeader className='border-b'>
				<CardTitle>{title}</CardTitle>
				{description && <CardDescription>{description}</CardDescription>}
			</CardHeader>
			<CardContent className='pt-4'>
				{data.length === 0 ? (
					<p className='py-12 text-center text-muted-foreground text-sm'>
						{emptyMessage}
					</p>
				) : (
					<ChartContainer config={chartConfig} className='h-[260px] w-full'>
						<PieChart>
							<Pie
								data={data}
								dataKey='value'
								nameKey='name'
								innerRadius={52}
								outerRadius={86}
								stroke='var(--color-background)'
								strokeWidth={2}
							>
								{data.map((entry, index) => (
									<Cell
										key={`${entry.name}-${index}`}
										fill={PIE_COLORS[index % PIE_COLORS.length]}
									/>
								))}
							</Pie>
							<ChartTooltip
								cursor={false}
								content={<ChartTooltipContent hideLabel />}
							/>
							<ChartLegend
								content={<ChartLegendContent className='flex-wrap gap-2' />}
							/>
						</PieChart>
					</ChartContainer>
				)}
			</CardContent>
		</Card>
	)
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
		<Card className={className}>
			<CardHeader className='border-b'>
				<CardTitle>{title}</CardTitle>
				{description && <CardDescription>{description}</CardDescription>}
			</CardHeader>
			<CardContent className='pt-4'>
				<div className='grid gap-3'>
					{items.map((item) => (
						<div
							key={item.label}
							className='rounded-lg border border-border/70 bg-background/45 p-3'
						>
							<p className='text-muted-foreground text-xs'>{item.label}</p>
							<p className='mt-1 font-semibold text-lg tracking-tight'>{item.value}</p>
							{item.description && (
								<p className='mt-1 text-muted-foreground text-xs'>
									{item.description}
								</p>
							)}
						</div>
					))}
				</div>
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
