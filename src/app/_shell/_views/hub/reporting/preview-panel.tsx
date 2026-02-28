import { Download, Eye, Loader2, RefreshCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function PreviewPanel({
	previewUrl,
	loading,
	onRefresh,
	onDownload,
}: {
	previewUrl: string | null
	loading: boolean
	onRefresh: () => void
	onDownload: () => void
}) {
	return (
		<div className='flex h-full flex-col'>
			<div className='flex items-center justify-between border-b border-border/60 px-4 py-2'>
				<span className='font-medium text-sm'>Preview</span>
				<div className='flex items-center gap-2'>
					<Button
						type='button'
						variant='ghost'
						size='sm'
						onClick={onRefresh}
						disabled={loading}
						className='h-7 gap-1.5 text-xs'
					>
						{loading ? (
							<Loader2
								className='size-3 animate-spin'
								aria-hidden='true'
							/>
						) : (
							<RefreshCcw className='size-3' aria-hidden='true' />
						)}
						Refresh
					</Button>
					<Button
						type='button'
						variant='outline'
						size='sm'
						onClick={onDownload}
						disabled={loading}
						className='h-7 gap-1.5 text-xs'
					>
						<Download className='size-3' aria-hidden='true' />
						Download PDF
					</Button>
				</div>
			</div>

			<div className='flex-1 p-4'>
				{loading ? (
					<div className='flex h-full items-center justify-center rounded-lg border border-border/60 border-dashed'>
						<div className='flex flex-col items-center gap-2 text-muted-foreground'>
							<Loader2 className='size-6 animate-spin' aria-hidden='true' />
							<span className='text-sm'>Generating preview...</span>
						</div>
					</div>
				) : previewUrl ? (
					<iframe
						title='Report preview'
						src={previewUrl}
						className='h-full w-full rounded-lg border border-border/60'
					/>
				) : (
					<div className='flex h-full items-center justify-center rounded-lg border border-border/60 border-dashed'>
						<div className='flex flex-col items-center gap-3 text-muted-foreground'>
							<Eye className='size-8 opacity-40' aria-hidden='true' />
							<div className='text-center'>
								<p className='font-medium text-sm'>No preview yet</p>
								<p className='text-xs'>
									Click "Refresh" to generate a PDF preview of your report.
								</p>
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	)
}
