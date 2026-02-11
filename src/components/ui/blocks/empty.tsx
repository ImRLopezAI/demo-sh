import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from '@ui/empty'
import { AlertCircleIcon } from 'lucide-react'
import { Spinner } from '../spinner'

interface EmptyListProps {
	Icon: React.ReactNode
	title: string
	description: string
	content: React.ReactNode
}
export function EmptyList({
	Icon,
	title,
	description,
	content,
}: EmptyListProps) {
	return (
		<Empty>
			<EmptyHeader>
				<EmptyMedia variant='icon'>{Icon}</EmptyMedia>
				<EmptyTitle>{title}</EmptyTitle>
				<EmptyDescription>{description}</EmptyDescription>
			</EmptyHeader>
			<EmptyContent>{content}</EmptyContent>
		</Empty>
	)
}

interface ComingSoonEmptyProps {
	name: string
	description: string
	type: 'app' | 'feature' | 'page'
}

export function ComingSoonEmpty({
	name,
	description,
	type,
}: ComingSoonEmptyProps) {
	return (
		<div className='flex h-[90vh] items-center justify-center'>
			<div className='max-w-(--breakpoint-sm) space-y-4 lg:space-y-8'>
				<Empty>
					<EmptyHeader>
						<EmptyTitle className='mb-4 flex items-center gap-3'>
							<Spinner />
							<h1 className='text-xl'>{name}</h1>
						</EmptyTitle>
						<EmptyDescription>{description}</EmptyDescription>
					</EmptyHeader>
					<EmptyContent className='border-t pt-4'>
						<div className='flex items-center justify-center gap-2 text-muted-foreground text-sm'>
							<AlertCircleIcon className='size-4 text-orange-400' />
							This {type} is currently under construction.
						</div>
					</EmptyContent>
				</Empty>
			</div>
		</div>
	)
}
