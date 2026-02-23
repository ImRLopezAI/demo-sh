import { $rpc, useMutation, useQueryClient } from '@lib/rpc'
import { AlertOctagon, BadgeCheck, HandCoins, ServerCrash } from 'lucide-react'
import * as React from 'react'
import { useGrid } from '@/components/data-grid/compound'
import { useWindowSize } from '@/components/data-grid/hooks/use-window-size'
import { Button } from '@/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import { useModuleList } from '../../hooks/use-data'
import { PageHeader } from '../_shared/page-header'
import { StatusBadge } from '../_shared/status-badge'
import { useEntityMutations } from '../_shared/use-entity'

type PosSession = {
	_id: string
	sessionNo: string
	terminalId: string
	terminalName?: string | null
	cashierId?: string | null
	status: 'OPEN' | 'PAUSED' | 'CLOSED'
	openingBalance: number
	closingBalance: number
	transactionCount: number
	totalSales: number
}

type PosTransaction = {
	_id: string
	receiptNo: string
	posSessionId: string
	status: 'OPEN' | 'COMPLETED' | 'VOIDED' | 'REFUNDED'
	totalAmount: number
	paymentMethod: 'CASH' | 'CARD' | 'MOBILE' | 'MIXED'
	transactionAt?: string | null
	statusReason?: string | null
}

type Terminal = {
	_id: string
	terminalCode: string
	name?: string | null
	locationCode?: string | null
	status: 'ONLINE' | 'OFFLINE' | 'MAINTENANCE'
	lastHeartbeat?: string | Date | null
}

const VARIANCE_APPROVAL_THRESHOLD = 20

export default function ShiftControlsView() {
	const queryClient = useQueryClient()
	const windowSize = useWindowSize({ defaultWidth: 1280, defaultHeight: 900 })

	const [terminalId, setTerminalId] = React.useState('')
	const [openingBalance, setOpeningBalance] = React.useState('100')
	const [selectedSessionId, setSelectedSessionId] = React.useState('')
	const [closingBalance, setClosingBalance] = React.useState('100')
	const [varianceReason, setVarianceReason] = React.useState('')
	const [managerSignoff, setManagerSignoff] = React.useState('')
	const [receiptLookup, setReceiptLookup] = React.useState('')
	const [refundReason, setRefundReason] = React.useState(
		'Refund approved in governance center',
	)
	const [governanceNotice, setGovernanceNotice] = React.useState<string | null>(
		null,
	)
	const [healthWindowMinutes, setHealthWindowMinutes] = React.useState('10')

	const sessionsQuery = useModuleList('pos', 'sessions', { limit: 300 })
	const transactionsQuery = useModuleList('pos', 'transactions', { limit: 400 })
	const terminalsQuery = useModuleList('pos', 'terminals', { limit: 100 })

	const sessions = (sessionsQuery.data?.items ?? []) as PosSession[]
	const transactions = (transactionsQuery.data?.items ?? []) as PosTransaction[]
	const terminals = (terminalsQuery.data?.items ?? []) as Terminal[]

	const selectedSession = sessions.find(
		(session) => session._id === selectedSessionId,
	)

	const startSession = useMutation({
		...$rpc.pos.sessions.startSession.mutationOptions({
			onSuccess: () => {
				invalidatePos()
			},
		}),
	})

	const closeShiftMutation = useMutation({
		...$rpc.pos.sessions.closeShift.mutationOptions({
			onSuccess: () => {
				invalidatePos()
			},
		}),
	})
	const governTransactionMutation = useMutation({
		...$rpc.pos.transactions.governTransaction.mutationOptions({
			onSuccess: () => {
				invalidatePos()
			},
		}),
	})
	const terminalMutations = useEntityMutations('pos', 'terminals')

	const invalidatePos = React.useCallback(() => {
		void queryClient.invalidateQueries({ queryKey: $rpc.pos.sessions.key() })
		void queryClient.invalidateQueries({
			queryKey: $rpc.pos.transactions.key(),
		})
		void queryClient.invalidateQueries({ queryKey: $rpc.pos.terminals.key() })
		void queryClient.invalidateQueries({
			queryKey: $rpc.hub.operationTasks.key(),
		})
		void queryClient.invalidateQueries({
			queryKey: $rpc.hub.notifications.key(),
		})
	}, [queryClient])

	const SessionsGrid = useGrid(
		() => ({
			data: sessions,
			isLoading: sessionsQuery.isLoading,
			readOnly: true,
			enableSearch: true,
		}),
		[sessions, sessionsQuery.isLoading],
	)

	const lookupTerm = receiptLookup.trim().toLowerCase()
	const filteredTransactions = transactions.filter((row) => {
		if (!lookupTerm) return true
		return row.receiptNo.toLowerCase().includes(lookupTerm)
	})

	const TransactionsGrid = useGrid(
		() => ({
			data: filteredTransactions,
			isLoading: transactionsQuery.isLoading,
			readOnly: true,
			enableSearch: true,
		}),
		[filteredTransactions, transactionsQuery.isLoading],
	)

	const terminalHealthRows = React.useMemo(() => {
		const now = Date.now()
		const staleWindowMs =
			Math.max(1, Number.parseInt(healthWindowMinutes, 10) || 10) * 60 * 1000
		return terminals.map((terminal) => {
			const heartbeat = terminal.lastHeartbeat
				? new Date(terminal.lastHeartbeat).getTime()
				: Number.NaN
			const heartbeatAgeMs = Number.isNaN(heartbeat)
				? Number.POSITIVE_INFINITY
				: now - heartbeat
			const stale = heartbeatAgeMs > staleWindowMs
			const healthState =
				terminal.status === 'MAINTENANCE'
					? 'PERSISTENT_DEGRADED'
					: terminal.status === 'OFFLINE'
						? 'PERSISTENT_DEGRADED'
						: stale
							? 'TRANSIENT_DEGRADED'
							: 'HEALTHY'

			return {
				...terminal,
				healthState,
				heartbeatAgeMinutes:
					Number.isFinite(heartbeatAgeMs) && heartbeatAgeMs >= 0
						? Number((heartbeatAgeMs / 60000).toFixed(1))
						: null,
			}
		})
	}, [healthWindowMinutes, terminals])

	const HealthGrid = useGrid(
		() => ({
			data: terminalHealthRows,
			isLoading: terminalsQuery.isLoading,
			readOnly: true,
			enableSearch: true,
		}),
		[terminalHealthRows, terminalsQuery.isLoading],
	)

	const replayCandidates = React.useMemo(() => {
		const sessionsById = new Map(
			sessions.map((session) => [session._id, session]),
		)
		const terminalsById = new Map(
			terminals.map((terminal) => [terminal._id, terminal]),
		)
		return transactions
			.filter((tx) => ['OPEN', 'COMPLETED'].includes(tx.status))
			.map((tx) => {
				const session = sessionsById.get(tx.posSessionId)
				const terminal = session
					? terminalsById.get(session.terminalId)
					: undefined
				return {
					transaction: tx,
					session,
					terminal,
					needsReplayReview:
						(terminal?.status === 'OFFLINE' ||
							terminal?.status === 'MAINTENANCE') &&
						tx.status === 'COMPLETED',
				}
			})
			.filter((row) => row.needsReplayReview)
	}, [sessions, terminals, transactions])

	const openSession = React.useCallback(async () => {
		if (!terminalId) return
		await startSession.mutateAsync({
			terminalId,
			openingBalance: Math.max(0, Number.parseFloat(openingBalance) || 0),
			reuseOpenSession: true,
		})
	}, [openingBalance, startSession, terminalId])

	const closeShift = React.useCallback(async () => {
		if (!selectedSession) return
		const variance = Number(
			(
				Number.parseFloat(closingBalance) -
				Number(selectedSession.openingBalance)
			).toFixed(2),
		)
		const requiresManager = Math.abs(variance) >= VARIANCE_APPROVAL_THRESHOLD
		if (requiresManager && (!varianceReason.trim() || !managerSignoff.trim())) {
			return
		}
		await closeShiftMutation.mutateAsync({
			sessionId: selectedSession._id,
			closingBalance: Number.parseFloat(closingBalance) || 0,
			varianceReason: varianceReason.trim() || undefined,
			managerSignoffUserId: managerSignoff.trim() || undefined,
			approvalVarianceThreshold: VARIANCE_APPROVAL_THRESHOLD,
		})
	}, [
		closingBalance,
		closeShiftMutation,
		managerSignoff,
		selectedSession,
		varianceReason,
	])

	const transitionRefund = React.useCallback(
		async (transactionId: string) => {
			const result = await governTransactionMutation.mutateAsync({
				transactionId,
				action: 'REFUND',
				reason:
					refundReason.trim() || 'Refund authorized in POS governance center',
				idempotencyKey: `refund-${transactionId}`,
				offlineOperationId: `offline-refund-${transactionId}`,
			})
			setGovernanceNotice(
				result.conflict
					? `${result.conflict.type}: ${result.conflict.remediation}`
					: result.idempotent
						? 'Refund replay skipped (idempotent).'
						: 'Refund action applied.',
			)
		},
		[governTransactionMutation, refundReason],
	)

	const transitionVoid = React.useCallback(
		async (transactionId: string) => {
			const result = await governTransactionMutation.mutateAsync({
				transactionId,
				action: 'VOID',
				reason:
					refundReason.trim() || 'Void authorized in POS governance center',
				idempotencyKey: `void-${transactionId}`,
				offlineOperationId: `offline-void-${transactionId}`,
			})
			setGovernanceNotice(
				result.conflict
					? `${result.conflict.type}: ${result.conflict.remediation}`
					: result.idempotent
						? 'Void replay skipped (idempotent).'
						: 'Void action applied.',
			)
		},
		[governTransactionMutation, refundReason],
	)

	const changeTerminalState = React.useCallback(
		async (id: string, toStatus: 'ONLINE' | 'OFFLINE' | 'MAINTENANCE') => {
			await terminalMutations.transitionStatus.mutateAsync({
				id,
				toStatus,
				reason: `Status changed from shift controls to ${toStatus}`,
			})
		},
		[terminalMutations.transitionStatus],
	)

	const variance = selectedSession
		? Number(
				(
					Number.parseFloat(closingBalance || '0') -
					Number(selectedSession.openingBalance)
				).toFixed(2),
			)
		: 0
	const managerRequired = Math.abs(variance) >= VARIANCE_APPROVAL_THRESHOLD

	return (
		<div className='space-y-8 pb-8'>
			<PageHeader
				title='Shift Controls & Refund Governance'
				description='Close shifts with policy checks, govern refund/void actions, and monitor terminal health with replay safety.'
			/>

			<div className='grid gap-6 xl:grid-cols-2'>
				<Card className='border-orange-500/30 bg-gradient-to-br from-orange-500/10 via-background to-background'>
					<CardHeader>
						<CardTitle className='flex items-center gap-2'>
							<HandCoins className='size-4' />
							Shift Reconciliation
						</CardTitle>
						<CardDescription>
							Open/close sessions with variance reason capture and manager
							sign-off when thresholds are exceeded.
						</CardDescription>
					</CardHeader>
					<CardContent className='space-y-4'>
						<div className='grid gap-3 md:grid-cols-2'>
							<div className='space-y-2'>
								<Label>Terminal</Label>
								<Select
									value={terminalId}
									onValueChange={(value) => setTerminalId(value ?? '')}
								>
									<SelectTrigger>
										<SelectValue placeholder='Select terminal' />
									</SelectTrigger>
									<SelectContent>
										{terminals.map((terminal) => (
											<SelectItem key={terminal._id} value={terminal._id}>
												{terminal.terminalCode} · {terminal.name ?? 'Terminal'}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div className='space-y-2'>
								<Label>Opening Balance</Label>
								<Input
									type='number'
									value={openingBalance}
									onChange={(event) => setOpeningBalance(event.target.value)}
								/>
							</div>
						</div>

						<Button
							onClick={() => {
								void openSession()
							}}
							disabled={!terminalId || startSession.isPending}
						>
							Open / Reuse Session
						</Button>

						<div className='grid gap-3 md:grid-cols-2'>
							<div className='space-y-2'>
								<Label>Selected Session</Label>
								<Select
									value={selectedSessionId}
									onValueChange={(value) => setSelectedSessionId(value ?? '')}
								>
									<SelectTrigger>
										<SelectValue placeholder='Select session' />
									</SelectTrigger>
									<SelectContent>
										{sessions.map((session) => (
											<SelectItem key={session._id} value={session._id}>
												{session.sessionNo} · {session.status}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div className='space-y-2'>
								<Label>Closing Balance</Label>
								<Input
									type='number'
									value={closingBalance}
									onChange={(event) => setClosingBalance(event.target.value)}
								/>
							</div>
						</div>

						<div className='grid gap-3 md:grid-cols-2'>
							<div className='space-y-2'>
								<Label>Variance Reason</Label>
								<Input
									value={varianceReason}
									onChange={(event) => setVarianceReason(event.target.value)}
									placeholder='Required for high variance closes'
								/>
							</div>
							<div className='space-y-2'>
								<Label>Manager Sign-off</Label>
								<Input
									value={managerSignoff}
									onChange={(event) => setManagerSignoff(event.target.value)}
									placeholder='manager-id or initials'
								/>
							</div>
						</div>

						<div className='rounded-lg border border-border/60 bg-background/80 p-3 text-sm'>
							<p>
								Variance: <strong>{variance.toFixed(2)}</strong>
							</p>
							<p className='text-muted-foreground text-xs'>
								Manager sign-off required at ±
								{VARIANCE_APPROVAL_THRESHOLD.toFixed(2)}.
							</p>
						</div>

						<Button
							variant='outline'
							onClick={() => {
								void closeShift()
							}}
							disabled={
								!selectedSession ||
								selectedSession.status === 'CLOSED' ||
								closeShiftMutation.isPending ||
								(managerRequired &&
									(!varianceReason.trim() || !managerSignoff.trim()))
							}
						>
							Close Shift
						</Button>
					</CardContent>
				</Card>

				<Card className='border-rose-500/30 bg-gradient-to-br from-rose-500/10 via-background to-background'>
					<CardHeader>
						<CardTitle className='flex items-center gap-2'>
							<AlertOctagon className='size-4' />
							Refund / Void Governance Center
						</CardTitle>
						<CardDescription>
							Receipt lookup with explicit approval reasons and idempotent
							transaction transitions.
						</CardDescription>
					</CardHeader>
					<CardContent className='space-y-4'>
						<div className='grid gap-3 md:grid-cols-2'>
							<div className='space-y-2'>
								<Label>Receipt Lookup</Label>
								<Input
									value={receiptLookup}
									onChange={(event) => setReceiptLookup(event.target.value)}
									placeholder='RCP...'
								/>
							</div>
							<div className='space-y-2'>
								<Label>Reason</Label>
								<Input
									value={refundReason}
									onChange={(event) => setRefundReason(event.target.value)}
								/>
							</div>
						</div>

						<div className='overflow-hidden rounded-xl border border-border/60'>
							<TransactionsGrid
								variant='flat'
								height={Math.max(windowSize.height - 410, 240)}
							>
								<TransactionsGrid.Header className='border-border/50 border-b bg-muted/20 px-4 py-3'>
									<TransactionsGrid.Toolbar filter sort search />
								</TransactionsGrid.Header>
								<TransactionsGrid.Columns>
									<TransactionsGrid.Column
										accessorKey='receiptNo'
										title='Receipt'
									/>
									<TransactionsGrid.Column
										accessorKey='status'
										title='Status'
										cell={({ row }) => (
											<StatusBadge status={row.original.status} />
										)}
									/>
									<TransactionsGrid.Column
										accessorKey='totalAmount'
										title='Total'
										cellVariant='number'
										formatter={(value, formatter) =>
											formatter.currency(value.totalAmount)
										}
									/>
									<TransactionsGrid.Column
										accessorKey='paymentMethod'
										title='Payment'
									/>
									<TransactionsGrid.Column
										id='actions'
										title='Actions'
										cell={({ row }) => (
											<div className='flex flex-wrap gap-1'>
												<Button
													size='sm'
													variant='outline'
													onClick={() => {
														void transitionVoid(row.original._id)
													}}
													disabled={
														row.original.status !== 'OPEN' ||
														governTransactionMutation.isPending
													}
												>
													Void
												</Button>
												<Button
													size='sm'
													variant='outline'
													onClick={() => {
														void transitionRefund(row.original._id)
													}}
													disabled={
														row.original.status !== 'COMPLETED' ||
														governTransactionMutation.isPending
													}
												>
													Refund
												</Button>
											</div>
										)}
									/>
								</TransactionsGrid.Columns>
							</TransactionsGrid>
						</div>
						{governanceNotice ? (
							<p className='text-muted-foreground text-xs'>
								{governanceNotice}
							</p>
						) : null}
					</CardContent>
				</Card>
			</div>

			<div className='grid gap-6 xl:grid-cols-2'>
				<Card>
					<CardHeader>
						<CardTitle className='flex items-center gap-2'>
							<BadgeCheck className='size-4' />
							Shift Session Ledger
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className='overflow-hidden rounded-xl border border-border/60'>
							<SessionsGrid
								variant='flat'
								height={Math.max(windowSize.height - 360, 280)}
							>
								<SessionsGrid.Header className='border-border/50 border-b bg-muted/20 px-4 py-3'>
									<SessionsGrid.Toolbar filter sort search export />
								</SessionsGrid.Header>
								<SessionsGrid.Columns>
									<SessionsGrid.Column
										accessorKey='sessionNo'
										title='Session'
									/>
									<SessionsGrid.Column
										accessorKey='terminalName'
										title='Terminal'
									/>
									<SessionsGrid.Column
										accessorKey='status'
										title='Status'
										cell={({ row }) => (
											<StatusBadge status={row.original.status} />
										)}
									/>
									<SessionsGrid.Column
										accessorKey='openingBalance'
										title='Open'
										cellVariant='number'
										formatter={(value, formatter) =>
											formatter.currency(value.openingBalance)
										}
									/>
									<SessionsGrid.Column
										accessorKey='closingBalance'
										title='Close'
										cellVariant='number'
										formatter={(value, formatter) =>
											formatter.currency(value.closingBalance)
										}
									/>
									<SessionsGrid.Column
										id='select'
										title='Select'
										cell={({ row }) => (
											<Button
												size='sm'
												variant='outline'
												onClick={() => setSelectedSessionId(row.original._id)}
											>
												Select
											</Button>
										)}
									/>
								</SessionsGrid.Columns>
							</SessionsGrid>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className='flex items-center gap-2'>
							<ServerCrash className='size-4' />
							Device Health + Offline Replay Queue
						</CardTitle>
						<CardDescription>
							Differentiate transient heartbeat lag from persistent terminal
							outages and guard replay-sensitive refunds.
						</CardDescription>
					</CardHeader>
					<CardContent className='space-y-4'>
						<div className='flex items-end gap-2'>
							<div className='space-y-2'>
								<Label>Heartbeat Stale Window (minutes)</Label>
								<Input
									type='number'
									value={healthWindowMinutes}
									onChange={(event) =>
										setHealthWindowMinutes(event.target.value)
									}
									className='w-36'
								/>
							</div>
						</div>
						<div className='overflow-hidden rounded-xl border border-border/60'>
							<HealthGrid
								variant='flat'
								height={Math.max(windowSize.height - 470, 220)}
							>
								<HealthGrid.Header className='border-border/50 border-b bg-muted/20 px-4 py-3'>
									<HealthGrid.Toolbar filter sort search />
								</HealthGrid.Header>
								<HealthGrid.Columns>
									<HealthGrid.Column
										accessorKey='terminalCode'
										title='Terminal'
									/>
									<HealthGrid.Column
										accessorKey='status'
										title='Status'
										cell={({ row }) => (
											<StatusBadge status={row.original.status} />
										)}
									/>
									<HealthGrid.Column
										accessorKey='healthState'
										title='Health'
										cell={({ row }) => (
											<StatusBadge status={row.original.healthState} />
										)}
									/>
									<HealthGrid.Column
										accessorKey='heartbeatAgeMinutes'
										title='Heartbeat Age (m)'
										cellVariant='number'
									/>
									<HealthGrid.Column
										id='actions'
										title='Actions'
										cell={({ row }) => (
											<div className='flex flex-wrap gap-1'>
												<Button
													size='sm'
													variant='outline'
													onClick={() => {
														void changeTerminalState(row.original._id, 'ONLINE')
													}}
													disabled={row.original.status === 'ONLINE'}
												>
													Online
												</Button>
												<Button
													size='sm'
													variant='outline'
													onClick={() => {
														void changeTerminalState(
															row.original._id,
															'OFFLINE',
														)
													}}
													disabled={row.original.status === 'OFFLINE'}
												>
													Offline
												</Button>
												<Button
													size='sm'
													variant='outline'
													onClick={() => {
														void changeTerminalState(
															row.original._id,
															'MAINTENANCE',
														)
													}}
													disabled={row.original.status === 'MAINTENANCE'}
												>
													Maint.
												</Button>
											</div>
										)}
									/>
								</HealthGrid.Columns>
							</HealthGrid>
						</div>

						<div className='rounded-lg border border-border/60 bg-background/80 p-3'>
							<p className='font-medium text-sm'>Offline Replay Candidates</p>
							<ul className='mt-2 space-y-1 text-xs'>
								{replayCandidates.slice(0, 8).map((row) => (
									<li key={row.transaction._id}>
										{row.transaction.receiptNo} ·{' '}
										{row.terminal?.terminalCode ?? 'unknown terminal'} ·{' '}
										{row.transaction.status}
									</li>
								))}
								{replayCandidates.length === 0 ? (
									<li className='text-muted-foreground'>
										No replay-sensitive rows detected.
									</li>
								) : null}
							</ul>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	)
}
