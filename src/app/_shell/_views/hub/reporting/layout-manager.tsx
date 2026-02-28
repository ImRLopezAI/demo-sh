import { Copy, Edit, Loader2, Star } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

type LayoutItem = {
	id: string
	key: string | null
	name: string
	pageSize: 'A4' | 'LETTER' | 'THERMAL'
	orientation: 'portrait' | 'landscape'
	blockCount: number
	source: 'SYSTEM' | 'CUSTOM'
	moduleId?: string
	entityId?: string
	active?: boolean
	versionNo?: number
	isDefault?: boolean
}

export function LayoutManager({
	layouts,
	isLoading,
	onEdit,
	onSetDefault,
	onDuplicate,
	defaultLoading,
}: {
	layouts: LayoutItem[]
	isLoading: boolean
	onEdit: (layout: LayoutItem) => void
	onSetDefault: (layout: LayoutItem) => void
	onDuplicate: (layout: LayoutItem) => void
	defaultLoading: boolean
}) {
	if (isLoading) {
		return (
			<div className='flex h-40 items-center justify-center'>
				<Loader2 className='size-5 animate-spin text-muted-foreground' aria-hidden='true' />
			</div>
		)
	}

	if (layouts.length === 0) {
		return (
			<div className='flex h-40 items-center justify-center rounded-lg border border-border/60 border-dashed'>
				<p className='text-muted-foreground text-sm'>
					No saved layouts yet. Create one from the Builder tab.
				</p>
			</div>
		)
	}

	return (
		<div className='space-y-4'>
			<div>
				<h3 className='font-medium text-sm'>Saved Layouts</h3>
				<p className='text-muted-foreground text-xs'>
					Manage your custom and system report layouts.
				</p>
			</div>

			<div className='rounded-lg border border-border/60'>
				<table className='w-full text-xs'>
					<thead>
						<tr className='border-b border-border/60 text-left text-muted-foreground'>
							<th className='px-3 py-2 font-medium'>Name</th>
							<th className='px-3 py-2 font-medium'>Source</th>
							<th className='hidden px-3 py-2 font-medium sm:table-cell'>
								Page
							</th>
							<th className='hidden px-3 py-2 font-medium sm:table-cell'>
								Blocks
							</th>
							<th className='hidden px-3 py-2 font-medium md:table-cell'>
								Version
							</th>
							<th className='px-3 py-2 font-medium'>Status</th>
							<th className='px-3 py-2 text-right font-medium'>Actions</th>
						</tr>
					</thead>
					<tbody>
						{layouts.map((layout) => (
							<tr
								key={layout.id}
								className='border-b border-border/40 last:border-0'
							>
								<td className='px-3 py-2 font-medium'>{layout.name}</td>
								<td className='px-3 py-2'>
									<Badge
										variant={
											layout.source === 'SYSTEM' ? 'outline' : 'secondary'
										}
										className='text-[10px]'
									>
										{layout.source}
									</Badge>
								</td>
								<td className='hidden px-3 py-2 text-muted-foreground sm:table-cell'>
									{layout.pageSize} / {layout.orientation}
								</td>
								<td className='hidden px-3 py-2 text-muted-foreground sm:table-cell'>
									{layout.blockCount}
								</td>
								<td className='hidden px-3 py-2 text-muted-foreground md:table-cell'>
									{layout.versionNo ? `v${layout.versionNo}` : '-'}
								</td>
								<td className='px-3 py-2'>
									{layout.isDefault && (
										<Badge variant='default' className='text-[10px]'>
											Default
										</Badge>
									)}
								</td>
								<td className='px-3 py-2'>
									<div className='flex items-center justify-end gap-1'>
										{layout.source === 'CUSTOM' && (
											<Button
												type='button'
												variant='ghost'
												size='sm'
												onClick={() => onEdit(layout)}
												className='h-7 w-7 p-0'
												title='Edit layout'
											>
												<Edit
													className='size-3.5'
													aria-hidden='true'
												/>
											</Button>
										)}
										<Button
											type='button'
											variant='ghost'
											size='sm'
											onClick={() => onSetDefault(layout)}
											disabled={layout.isDefault || defaultLoading}
											className='h-7 w-7 p-0'
											title='Set as default'
										>
											<Star
												className='size-3.5'
												aria-hidden='true'
											/>
										</Button>
										<Button
											type='button'
											variant='ghost'
											size='sm'
											onClick={() => onDuplicate(layout)}
											className='h-7 w-7 p-0'
											title='Duplicate layout'
										>
											<Copy
												className='size-3.5'
												aria-hidden='true'
											/>
										</Button>
									</div>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	)
}
