import { cva, type VariantProps } from 'class-variance-authority'

export const dataGridContainerVariants = cva('w-full', {
	variants: {
		variant: {
			default:
				'overflow-hidden rounded-md border border-border/75 bg-card/85 shadow-xs',
			minimal: 'overflow-hidden rounded-sm border border-border/40',
			striped:
				'overflow-hidden rounded-md border border-border/75 bg-card/85 shadow-xs',
			bordered:
				'overflow-hidden rounded-md border-2 border-border/75 bg-card/90 shadow-xs',
			compact:
				'overflow-hidden rounded-md border border-border/75 bg-card/85 shadow-xs',
			card:
				'overflow-hidden rounded-md border border-border/70 bg-card/90 shadow-xs',
			dense: 'overflow-hidden rounded-sm border border-border/70 bg-card/90',
			relaxed:
				'overflow-hidden rounded-lg border border-border/75 bg-card/90 shadow-sm',
			flat: 'overflow-hidden rounded-sm border border-border/40 bg-transparent',
			lined:
				'overflow-hidden rounded-md border border-border/75 bg-card/88 shadow-xs',
			simple: 'overflow-hidden rounded-sm border border-border/65 bg-card/85',
		},
	},
	defaultVariants: {
		variant: 'default',
	},
})

export const dataGridHeaderVariants = cva('border-border', {
	variants: {
		variant: {
			default: 'border-b border-border/75 bg-muted/45',
			minimal: 'border-border/50 border-b',
			striped: 'border-b border-border/75 bg-muted/40',
			bordered: 'border-b border-border/75 bg-muted/50',
			compact: 'border-b border-border/75 bg-muted/50',
			card: 'border-b border-border/70 bg-background/30',
			dense: 'border-b border-border/70 bg-muted/55',
			relaxed: 'border-b border-border/75 bg-muted/35',
			flat: 'border-border/40 border-b',
			lined: 'border-border/80 border-b-2 bg-background/40',
			simple: 'border-b border-border/65 bg-muted/35',
		},
	},
	defaultVariants: {
		variant: 'default',
	},
})

export const dataGridRowVariants = cva(
	'transition-colors hover:bg-muted/45 data-[state=selected]:bg-primary/12',
	{
		variants: {
			variant: {
				default: 'border-border/65 border-b',
				minimal: 'border-border/35 border-b hover:bg-muted/30',
				striped: 'border-border/65 border-b odd:bg-muted/20 hover:bg-muted/50',
				bordered: 'border-border/75 border-b',
				compact: 'border-border/65 border-b',
				card: 'border-border/65 border-b hover:bg-muted/45',
				dense: 'border-border/50 border-b',
				relaxed: 'border-border/65 border-b',
				flat: 'border-border/30 border-b hover:bg-muted/25',
				lined: 'border-border/75 border-b last:border-b-0',
				simple: 'border-border/60 border-b hover:bg-muted/30',
			},
		},
		defaultVariants: {
			variant: 'default',
		},
	},
)

export const dataGridHeaderCellVariants = cva(
	'relative flex h-8 items-center text-left font-medium text-secondary-foreground/85 text-sm rtl:text-right',
	{
		variants: {
			variant: {
				default: 'bg-muted/40 px-3',
				minimal: 'bg-transparent px-2',
				striped: 'bg-transparent px-3',
				bordered: 'bg-muted/40 px-3',
				compact: 'h-7 bg-muted/40 px-2.5',
				card: 'bg-background/10 px-3',
				dense: 'h-6 bg-muted/40 px-2 text-xs',
				relaxed: 'bg-muted/30 px-5',
				flat: 'bg-transparent px-3',
				lined: 'bg-transparent px-3 font-medium',
				simple: 'bg-transparent px-3',
			},
		},
		defaultVariants: {
			variant: 'default',
		},
	},
)

export const dataGridCellVariants = cva('align-middle', {
	variants: {
		variant: {
			default: 'px-3 py-1.5',
			minimal: 'px-2 py-1.5',
			striped: 'px-3 py-1',
			bordered: 'px-3 py-1',
			compact: 'px-2.5 py-1',
			card: 'px-3 py-1',
			dense: 'px-2 py-1.5 text-xs',
			relaxed: 'px-5 py-3',
			flat: 'px-3 py-1.5',
			lined: 'px-3 py-1.5',
			simple: 'px-3 py-1.5',
		},
	},
	defaultVariants: {
		variant: 'default',
	},
})

export type TableVariant = NonNullable<
	VariantProps<typeof dataGridContainerVariants>['variant']
>
