import {
	AlertTriangle,
	Clock,
	Monitor,
	RefreshCcw,
	User,
	Wifi,
	WifiOff,
} from 'lucide-react'
import * as React from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import type { CustomerInfo, SessionInfo } from '../hooks/use-pos-terminal'

interface TerminalHeaderProps {
	session: SessionInfo | null
	customer: CustomerInfo | null
	isOnline: boolean
	pendingSyncCount: number
	isSyncingQueue: boolean
	lastSyncError: string | null
	onSyncNow: () => void
}

export function TerminalHeader({
	session,
	customer,
	isOnline,
	pendingSyncCount,
	isSyncingQueue,
	lastSyncError,
	onSyncNow,
}: TerminalHeaderProps) {
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

			<Separator orientation='vertical' />

			<div className='flex items-center gap-2'>
				<Badge variant={isOnline ? 'success' : 'warning'}>
					{isOnline ? (
						<Wifi className='size-3.5' aria-hidden='true' />
					) : (
						<WifiOff className='size-3.5' aria-hidden='true' />
					)}
					{isOnline ? 'Online' : 'Offline'}
				</Badge>
				{pendingSyncCount > 0 ? (
					<Badge variant='warning'>
						{isSyncingQueue ? 'Syncing' : 'Queued'} {pendingSyncCount}
					</Badge>
				) : null}
				{isOnline && pendingSyncCount > 0 ? (
					<Button
						type='button'
						variant='outline'
						size='sm'
						onClick={onSyncNow}
						disabled={isSyncingQueue}
					>
						<RefreshCcw className='mr-1 size-3.5' aria-hidden='true' />
						Sync now
					</Button>
				) : null}
				{lastSyncError ? (
					<span className='flex max-w-[20rem] items-center gap-1.5 truncate text-amber-700 text-xs dark:text-amber-300'>
						<AlertTriangle className='size-3.5 shrink-0' aria-hidden='true' />
						{lastSyncError}
					</span>
				) : null}
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
