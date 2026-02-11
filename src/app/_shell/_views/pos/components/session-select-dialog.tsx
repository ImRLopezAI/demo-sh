import { Monitor, Plus } from 'lucide-react'
import * as React from 'react'
import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { useModuleData, useModuleList } from '../../../hooks/use-data'
import { StatusBadge } from '../../_shared/status-badge'
import type { SessionInfo } from '../hooks/use-pos-terminal'
import type { Action } from './terminal-types'

interface SessionSelectDialogProps {
	open: boolean
	dispatch: React.Dispatch<Action>
}

interface PosSession {
	_id: string
	sessionNo?: string
	posTerminalId?: string
	terminalName?: string
	cashierId?: string
	status?: string
	openingBalance?: number
}

interface PosTerminal {
	_id: string
	terminalCode?: string
	name?: string
}

export function SessionSelectDialog({
	open,
	dispatch,
}: SessionSelectDialogProps) {
	const { items: sessions, isLoading: sessionsLoading } = useModuleData<
		'pos',
		PosSession
	>('pos', 'sessions', 'all')
	const { data: terminalsData, isLoading: terminalsLoading } = useModuleList(
		'pos',
		'terminals',
		{
			limit: 50,
		},
	)

	const terminals =
		(terminalsData as unknown as { items?: PosTerminal[] })?.items ?? []
	const openSessions = sessions.filter((s) => s.status === 'OPEN')

	const [showNew, setShowNew] = React.useState(false)
	const [selectedTerminal, setSelectedTerminal] = React.useState('')
	const [openingBalance, setOpeningBalance] = React.useState('')

	const handleSelectSession = (session: PosSession) => {
		const info: SessionInfo = {
			id: session._id,
			sessionNo: session.sessionNo ?? session._id.slice(0, 8),
			terminalName: session.terminalName ?? 'Terminal',
			cashierId: session.cashierId ?? '',
		}
		dispatch({ type: 'SET_SESSION', session: info })
	}

	const handleCreateSession = () => {
		if (!selectedTerminal) return
		const terminal = terminals.find((t) => t._id === selectedTerminal)
		const info: SessionInfo = {
			id: `new-${Date.now()}`,
			sessionNo: `SESS-${Date.now().toString(36).toUpperCase()}`,
			terminalName: terminal?.name ?? terminal?.terminalCode ?? 'Terminal',
			cashierId: '',
		}
		dispatch({ type: 'SET_SESSION', session: info })
	}

	return (
		<Dialog open={open}>
			<DialogContent showCloseButton={false} className='sm:max-w-md'>
				<DialogHeader>
					<DialogTitle>Select Session</DialogTitle>
					<DialogDescription>
						Choose an existing session or start a new one.
					</DialogDescription>
				</DialogHeader>

				{!showNew ? (
					<div className='space-y-3'>
						{sessionsLoading ? (
							<div className='space-y-2'>
								{Array.from({ length: 3 }).map((_, i) => (
									<div
										key={`s-${i}`}
										className='h-14 rounded-lg bg-muted motion-safe:animate-pulse'
									/>
								))}
							</div>
						) : openSessions.length > 0 ? (
							<ScrollArea className='max-h-[300px]'>
								<div className='space-y-2'>
									{openSessions.map((session) => (
										<button
											key={session._id}
											type='button'
											className='flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted/50'
											onClick={() => handleSelectSession(session)}
										>
											<Monitor
												className='size-5 shrink-0 text-muted-foreground'
												aria-hidden='true'
											/>
											<div className='flex-1'>
												<p className='font-medium text-sm'>
													{session.sessionNo ?? session._id.slice(0, 8)}
												</p>
												<p className='text-muted-foreground text-xs'>
													{session.terminalName ?? 'Terminal'}
												</p>
											</div>
											<StatusBadge status={session.status} />
										</button>
									))}
								</div>
							</ScrollArea>
						) : (
							<div className='py-6 text-center text-muted-foreground text-sm'>
								No open sessions available
							</div>
						)}

						<Separator />

						<Button
							variant='outline'
							className='w-full'
							onClick={() => setShowNew(true)}
						>
							<Plus className='mr-2 size-4' aria-hidden='true' />
							Start New Session
						</Button>
					</div>
				) : (
					<div className='space-y-4'>
						<div className='space-y-2'>
							<label htmlFor='session-terminal' className='font-medium text-sm'>
								Terminal
							</label>
							{terminalsLoading ? (
								<div className='h-7 rounded bg-muted motion-safe:animate-pulse' />
							) : (
								<select
									id='session-terminal'
									name='terminal'
									aria-label='Select terminal'
									className='h-7 w-full rounded-md border border-input bg-input/20 px-3 text-sm'
									value={selectedTerminal}
									onChange={(e) => setSelectedTerminal(e.target.value)}
								>
									<option value=''>Select terminal\u2026</option>
									{terminals.map((t) => (
										<option key={t._id} value={t._id}>
											{t.name ?? t.terminalCode}
										</option>
									))}
								</select>
							)}
						</div>

						<div className='space-y-2'>
							<label htmlFor='opening-balance' className='font-medium text-sm'>
								Opening Balance
							</label>
							<Input
								id='opening-balance'
								name='openingBalance'
								type='number'
								step='0.01'
								min={0}
								autoComplete='off'
								placeholder='0.00'
								value={openingBalance}
								onChange={(e) => setOpeningBalance(e.target.value)}
							/>
						</div>

						<div className='flex gap-2'>
							<Button
								variant='outline'
								className='flex-1'
								onClick={() => setShowNew(false)}
							>
								Back
							</Button>
							<Button
								className='flex-1'
								disabled={!selectedTerminal}
								onClick={handleCreateSession}
							>
								Start Session
							</Button>
						</div>
					</div>
				)}
			</DialogContent>
		</Dialog>
	)
}
