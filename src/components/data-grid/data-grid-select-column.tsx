'use client'

import type {
	CellContext,
	ColumnDef,
	HeaderContext,
} from '@tanstack/react-table'
import * as React from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'

type HitboxSize = 'default' | 'sm' | 'lg'

interface DataGridSelectHitboxProps {
	htmlFor: string
	children: React.ReactNode
	size?: HitboxSize
	debug?: boolean
	onHitboxClick?: React.MouseEventHandler<HTMLLabelElement>
}

function DataGridSelectHitbox({
	htmlFor,
	children,
	size,
	debug,
	onHitboxClick,
}: DataGridSelectHitboxProps) {
	return (
		<div
			className={cn(
				'group relative flex h-full w-full items-center justify-center',
				size === 'default' && 'p-0',
				size === 'sm' && 'p-0',
				size === 'lg' && 'p-0.5',
			)}
		>
			{children}
			<label
				htmlFor={htmlFor}
				className={cn(
					'absolute inset-0 cursor-pointer',
					debug && 'border border-red-500 border-dashed bg-red-500/20',
				)}
				onClick={onHitboxClick}
			/>
		</div>
	)
}

interface DataGridSelectCheckboxProps
	extends Omit<React.ComponentProps<typeof Checkbox>, 'id'> {
	rowNumber?: number
	hitboxSize?: HitboxSize
	debug?: boolean
	onHitboxClick?: React.MouseEventHandler<HTMLLabelElement>
}

function DataGridSelectCheckbox({
	rowNumber,
	hitboxSize,
	debug,
	checked,
	className,
	onHitboxClick,
	...props
}: DataGridSelectCheckboxProps) {
	const id = React.useId()

	if (rowNumber !== undefined) {
		return (
			<DataGridSelectHitbox
				htmlFor={id}
				size={hitboxSize}
				debug={debug}
				onHitboxClick={onHitboxClick}
			>
				<div
					aria-hidden='true'
					className={cn(
						'pointer-events-none absolute inset-0 flex items-center justify-center text-muted-foreground text-xs tabular-nums transition-opacity group-hover:opacity-0',
						checked && 'opacity-0',
					)}
				>
					{rowNumber}
				</div>
				<Checkbox
					id={id}
					className={cn(
						'relative transition-[shadow,border,opacity] hover:border-primary/40',
						'opacity-0 group-hover:opacity-100 data-checked:opacity-100',
						className,
					)}
					checked={checked}
					{...props}
				/>
			</DataGridSelectHitbox>
		)
	}

	return (
		<DataGridSelectHitbox
			htmlFor={id}
			size={hitboxSize}
			debug={debug}
			onHitboxClick={onHitboxClick}
		>
			<Checkbox
				id={id}
				className={cn(
					'relative transition-[shadow,border] hover:border-primary/40',
					className,
				)}
				checked={checked}
				{...props}
			/>
		</DataGridSelectHitbox>
	)
}

interface DataGridSelectHeaderProps<TData>
	extends Pick<HeaderContext<TData, unknown>, 'table'> {
	hitboxSize?: HitboxSize
	readOnly?: boolean
	debug?: boolean
}

function DataGridSelectHeader<TData>({
	table,
	hitboxSize,
	readOnly,
	debug,
}: DataGridSelectHeaderProps<TData>) {
	const onCheckedChange = React.useCallback(
		(value: boolean) => table.toggleAllPageRowsSelected(value),
		[table],
	)

	if (readOnly) {
		return (
			<div className='flex size-full items-center justify-center text-muted-foreground text-xs'>
				#
			</div>
		)
	}

	return (
		<DataGridSelectCheckbox
			aria-label='Select all'
			checked={table.getIsAllPageRowsSelected()}
			indeterminate={
				table.getIsSomePageRowsSelected() && !table.getIsAllPageRowsSelected()
			}
			onCheckedChange={onCheckedChange}
			hitboxSize={hitboxSize}
			debug={debug}
		/>
	)
}

interface DataGridSelectCellProps<TData>
	extends Pick<CellContext<TData, unknown>, 'row' | 'table'> {
	hitboxSize?: HitboxSize
	enableRowMarkers?: boolean
	readOnly?: boolean
	debug?: boolean
}

function DataGridSelectCell<TData>({
	row,
	table,
	hitboxSize,
	enableRowMarkers,
	readOnly,
	debug,
}: DataGridSelectCellProps<TData>) {
	const meta = table.options.meta
	const rowNumber = enableRowMarkers
		? (meta?.getVisualRowIndex?.(row.id) ?? row.index + 1)
		: undefined

	const onCheckedChange = React.useCallback(
		(value: boolean) => {
			if (meta?.onRowSelect) {
				meta.onRowSelect(row.index, value, false)
			} else {
				row.toggleSelected(value)
			}
		},
		[meta, row],
	)

	const onClick = React.useCallback<
		NonNullable<React.ComponentProps<typeof Checkbox>['onClick']>
	>(
		(event) => {
			if (event.shiftKey) {
				event.preventDefault()
				meta?.onRowSelect?.(row.index, !row.getIsSelected(), true)
			}
		},
		[meta, row],
	)

	const onHitboxClick = React.useCallback(
		(event: React.MouseEvent<HTMLLabelElement>) => {
			if (event.shiftKey) {
				event.preventDefault()
				meta?.onRowSelect?.(row.index, !row.getIsSelected(), true)
			}
		},
		[meta, row],
	)

	if (readOnly) {
		return (
			<div className='flex size-full items-center justify-center text-muted-foreground text-xs tabular-nums'>
				{rowNumber ?? row.index + 1}
			</div>
		)
	}

	return (
		<DataGridSelectCheckbox
			aria-label={rowNumber ? `Select row ${rowNumber}` : 'Select row'}
			checked={row.getIsSelected()}
			onCheckedChange={onCheckedChange}
			onClick={onClick}
			onHitboxClick={onHitboxClick}
			rowNumber={rowNumber}
			hitboxSize={hitboxSize}
			debug={debug}
		/>
	)
}

interface GetDataGridSelectColumnOptions<TData>
	extends Omit<Partial<ColumnDef<TData>>, 'id' | 'header' | 'cell'> {
	enableRowMarkers?: boolean
	readOnly?: boolean
	hitboxSize?: HitboxSize
	debug?: boolean
}

export function getDataGridSelectColumn<TData>({
	size,
	hitboxSize = 'default',
	enableHiding = false,
	enableResizing = false,
	enableSorting = false,
	enableRowMarkers = false,
	readOnly = false,
	debug = false,
	...props
}: GetDataGridSelectColumnOptions<TData> = {}): ColumnDef<TData> {
	const resolvedSize = size ?? (enableRowMarkers ? 40 : 32)

	return {
		id: 'select',
		meta: {
			customCell: true,
			...(props.meta ?? {}),
		},
		header: ({ table }) => (
			<DataGridSelectHeader
				table={table}
				hitboxSize={hitboxSize}
				readOnly={readOnly}
				debug={debug}
			/>
		),
		cell: ({ row, table }) => (
			<DataGridSelectCell
				row={row}
				table={table}
				enableRowMarkers={enableRowMarkers}
				readOnly={readOnly}
				hitboxSize={hitboxSize}
				debug={debug}
			/>
		),
		size: resolvedSize,
		minSize: resolvedSize,
		maxSize: enableResizing ? undefined : resolvedSize,
		enableHiding,
		enableResizing,
		enableSorting,
		...props,
	}
}
