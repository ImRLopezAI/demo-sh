import { Progress as ProgressPrimitive } from '@base-ui/react/progress'

import { cn } from '@/lib/utils'

function Progress({
	className,
	children,
	value,
	asRoot = false,
	...props
}: ProgressPrimitive.Root.Props & {
	asRoot?: boolean
}) {
	const Component = (props: ProgressPrimitive.Root.Props) => {
		return <ProgressPrimitive.Root {...props} />
	}

	if (asRoot) {
		return (
			<Component
				value={value}
				data-slot='progress'
				className={cn('flex flex-wrap gap-3', className)}
				{...props}
			>
				{children}
			</Component>
		)
	}
	return (
		<Component
			value={value}
			data-slot='progress'
			className={cn('flex flex-wrap gap-3', className)}
			{...props}
		>
			{children}
			<ProgressTrack>
				<ProgressIndicator />
			</ProgressTrack>
		</Component>
	)
}

function ProgressTrack({ className, ...props }: ProgressPrimitive.Track.Props) {
	return (
		<ProgressPrimitive.Track
			className={cn(
				'relative flex h-1 w-full items-center overflow-x-hidden rounded-md bg-muted',
				className,
			)}
			data-slot='progress-track'
			{...props}
		/>
	)
}

function ProgressIndicator({
	className,
	...props
}: ProgressPrimitive.Indicator.Props) {
	return (
		<ProgressPrimitive.Indicator
			data-slot='progress-indicator'
			className={cn('h-full bg-primary transition-all', className)}
			{...props}
		/>
	)
}

function ProgressLabel({ className, ...props }: ProgressPrimitive.Label.Props) {
	return (
		<ProgressPrimitive.Label
			className={cn('font-medium text-xs/relaxed', className)}
			data-slot='progress-label'
			{...props}
		/>
	)
}

function ProgressValue({ className, ...props }: ProgressPrimitive.Value.Props) {
	return (
		<ProgressPrimitive.Value
			className={cn(
				'ml-auto text-muted-foreground text-xs/relaxed tabular-nums',
				className,
			)}
			data-slot='progress-value'
			{...props}
		/>
	)
}

export {
	Progress,
	ProgressIndicator,
	ProgressLabel,
	ProgressTrack,
	ProgressValue,
}
