import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { REPORT_META_VALUE_PATHS } from '../constants'

interface Pair {
	key: string
	valuePath: string
}

export function KeyValueGroupConfig({
	pairs,
	align,
	onChange,
	extraPaths,
}: {
	pairs: Pair[]
	align?: 'left' | 'right'
	onChange: (patch: { pairs?: Pair[]; align?: 'left' | 'right' }) => void
	extraPaths?: Array<{ value: string; label: string }>
}) {
	const hasDatasetPaths = extraPaths && extraPaths.length > 0
	const activeAlign = align ?? 'left'

	function addPair() {
		onChange({ pairs: [...pairs, { key: '', valuePath: '' }] })
	}

	function removePair(index: number) {
		onChange({ pairs: pairs.filter((_, i) => i !== index) })
	}

	function updatePair(index: number, patch: Partial<Pair>) {
		onChange({
			pairs: pairs.map((p, i) => (i === index ? { ...p, ...patch } : p)),
		})
	}

	return (
		<div className='space-y-3'>
			<div className='flex items-center justify-between'>
				<Label className='text-muted-foreground text-xs'>
					Pairs ({pairs.length})
				</Label>
				<Button
					type='button'
					variant='ghost'
					size='sm'
					onClick={addPair}
					className='h-7 gap-1 text-xs'
				>
					<Plus className='size-3' aria-hidden='true' />
					Add Pair
				</Button>
			</div>

			<div className='space-y-2'>
				{pairs.map((pair, i) => (
					<div key={i} className='flex items-center gap-2'>
						<Input
							value={pair.key}
							onChange={(e) => updatePair(i, { key: e.target.value })}
							placeholder='Label'
							className='h-8 text-xs'
						/>
						{hasDatasetPaths ? (
							<Select
								value={pair.valuePath}
								onValueChange={(val) => {
									if (val) updatePair(i, { valuePath: val })
								}}
							>
								<SelectTrigger className='h-8 text-xs'>
									<SelectValue placeholder='Select field' />
								</SelectTrigger>
								<SelectContent>
									<SelectGroup>
										<SelectLabel>Dataset Fields</SelectLabel>
										{extraPaths.map((opt) => (
											<SelectItem key={opt.value} value={opt.value}>
												{opt.label}
											</SelectItem>
										))}
									</SelectGroup>
									<SelectGroup>
										<SelectLabel>Report Info</SelectLabel>
										{REPORT_META_VALUE_PATHS.map((opt) => (
											<SelectItem key={opt.value} value={opt.value}>
												{opt.label}
											</SelectItem>
										))}
									</SelectGroup>
								</SelectContent>
							</Select>
						) : (
							<Input
								value={pair.valuePath}
								onChange={(e) => updatePair(i, { valuePath: e.target.value })}
								placeholder='valuePath'
								className='h-8 text-xs'
							/>
						)}
						<Button
							type='button'
							variant='ghost'
							size='sm'
							onClick={() => removePair(i)}
							className='h-8 w-8 shrink-0 p-0'
						>
							<Trash2
								className='size-3 text-muted-foreground'
								aria-hidden='true'
							/>
						</Button>
					</div>
				))}
				{pairs.length === 0 && (
					<p className='py-2 text-center text-muted-foreground text-xs'>
						No pairs. Click "Add Pair" to start.
					</p>
				)}
			</div>

			<div className='space-y-1.5'>
				<Label className='text-muted-foreground text-xs'>Value Alignment</Label>
				<ToggleGroup
					value={[activeAlign]}
					onValueChange={(values) => {
						const last = values[values.length - 1]
						if (last === 'left' || last === 'right') onChange({ align: last })
					}}
					variant='outline'
					size='sm'
				>
					<ToggleGroupItem value='left'>Left</ToggleGroupItem>
					<ToggleGroupItem value='right'>Right</ToggleGroupItem>
				</ToggleGroup>
			</div>
		</div>
	)
}
