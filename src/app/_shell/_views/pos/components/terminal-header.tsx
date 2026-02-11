import { Clock, Monitor, User } from 'lucide-react'
import * as React from 'react'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import type { CustomerInfo, SessionInfo } from '../hooks/use-pos-terminal'

interface TerminalHeaderProps {
	session: SessionInfo | null
	customer: CustomerInfo | null
}

export function TerminalHeader({ session, customer }: TerminalHeaderProps) {
	const [time, setTime] = React.useState(() => formatTime())

	React.useEffect(() => {
		const id = setInterval(() => setTime(formatTime()), 1000)
		return () => clearInterval(id)
	}, [])

	return (
		<div className='flex h-12 shrink-0 items-center gap-3 border-b bg-card px-4'>
			<div className='flex items-center gap-2 font-medium text-sm'>
				<Monitor className='size-4 text-muted-foreground' aria-hidden='true' />
				<span>{session?.terminalName ?? 'No Terminal'}</span>
			</div>

			<Separator orientation='vertical' />

			<div className='flex items-center gap-2 text-sm'>
				<span className='text-muted-foreground'>Session</span>
				{session ? (
					<Badge variant='info'>{session.sessionNo}</Badge>
				) : (
					<Badge variant='outline'>None</Badge>
				)}
			</div>

			<div className='flex-1' />

			{customer && (
				<>
					<div className='flex items-center gap-2 text-sm'>
						<User
							className='size-3.5 text-muted-foreground'
							aria-hidden='true'
						/>
						<span>{customer.name}</span>
					</div>
					<Separator orientation='vertical' />
				</>
			)}

			<div className='flex items-center gap-2 text-muted-foreground text-sm tabular-nums'>
				<Clock className='size-3.5' aria-hidden='true' />
				<span>{time}</span>
			</div>
		</div>
	)
}

function formatTime() {
	return new Date().toLocaleTimeString([], {
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
	})
}
