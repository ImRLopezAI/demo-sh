import { $rpc, useMutation, useQuery, useQueryClient } from '@lib/rpc'
import { Plus, Save } from 'lucide-react'
import * as React from 'react'
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
import { useModuleData, useModuleList } from '../../hooks/use-data'
import { PageHeader } from '../_shared/page-header'
import { useRecordSearchState } from '../_shared/use-record-search-state'
import { TaskCard } from './components/task-card'

interface OperationTask {
	_id: string
	taskNo: string
	moduleId: string
	title: string
	description?: string | null
	status: 'OPEN' | 'IN_PROGRESS' | 'BLOCKED' | 'DONE'
	priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
	assigneeUserId?: string | null
	dueDate?: string | null
	slaTargetAt?: string | null
	slaStatus?: 'ON_TRACK' | 'AT_RISK' | 'BREACHED'
	escalationLevel?: 'NONE' | 'L1' | 'L2'
}

interface HubRole {
	_id: string
	roleCode: string
	name?: string | null
}

interface HubPermission {
	_id: string
	permissionCode: string
	moduleId: string
	action: string
}

interface HubRolePermission {
	_id: string
	roleId: string
	permissionId: string
}

export default function TasksList() {
	const queryClient = useQueryClient()
	const { close, openCreate, openDetail, selectedId } = useRecordSearchState()
	const [selectedRoleCode, setSelectedRoleCode] = React.useState('VIEWER')
	const [permissionCodesInput, setPermissionCodesInput] = React.useState('')

	const { DataGrid, windowSize } = useModuleData<'hub', OperationTask>(
		'hub',
		'operationTasks',
		'all',
	)

	const handleEdit = React.useCallback(
		(row: OperationTask) => openDetail(row._id),
		[openDetail],
	)

	const rolesQuery = useModuleList('hub', 'roles', { limit: 200 })
	const permissionsQuery = useModuleList('hub', 'permissions', { limit: 600 })

	const roleItems = (rolesQuery.data?.items ?? []) as HubRole[]
	const permissionItems = (permissionsQuery.data?.items ??
		[]) as HubPermission[]

	const availableRoleCodes = React.useMemo(() => {
		const set = new Set<string>(['VIEWER', 'AGENT', 'MANAGER', 'ADMIN'])
		for (const role of roleItems) {
			const normalized = role.roleCode?.trim().toUpperCase()
			if (!normalized) continue
			set.add(normalized)
		}
		return Array.from(set).sort()
	}, [roleItems])

	React.useEffect(() => {
		if (availableRoleCodes.length === 0) return
		if (availableRoleCodes.includes(selectedRoleCode)) return
		setSelectedRoleCode(availableRoleCodes[0] ?? 'VIEWER')
	}, [availableRoleCodes, selectedRoleCode])

	const selectedRole = React.useMemo(
		() =>
			roleItems.find(
				(role) =>
					role.roleCode?.trim().toUpperCase() ===
					selectedRoleCode.trim().toUpperCase(),
			),
		[roleItems, selectedRoleCode],
	)

	const rolePermissionsQuery = useQuery({
		...$rpc.hub.rolePermissions.list.queryOptions({
			input: {
				limit: 600,
				offset: 0,
				filters: selectedRole?._id ? { roleId: selectedRole._id } : undefined,
			},
		}),
		enabled: Boolean(selectedRole?._id),
	})
	const rolePermissionItems = (rolePermissionsQuery.data?.items ??
		[]) as HubRolePermission[]

	const permissionCodeById = React.useMemo(
		() =>
			new Map<string, string>(
				permissionItems.map((permission) => [
					permission._id,
					permission.permissionCode,
				]),
			),
		[permissionItems],
	)

	const currentPermissionCodes = React.useMemo<string[]>(
		() =>
			Array.from(
				new Set(
					rolePermissionItems
						.map((assignment) =>
							permissionCodeById.get(assignment.permissionId),
						)
						.filter((code): code is string => Boolean(code)),
				),
			).sort(),
		[permissionCodeById, rolePermissionItems],
	)

	React.useEffect(() => {
		setPermissionCodesInput(currentPermissionCodes.join(', '))
	}, [currentPermissionCodes])

	const setRolePermissions = useMutation({
		...$rpc.hub.roles.setRolePermissions.mutationOptions({
			onSuccess: () => {
				void queryClient.invalidateQueries({
					queryKey: $rpc.hub.rolePermissions.key(),
				})
				void queryClient.invalidateQueries({
					queryKey: $rpc.hub.permissions.key(),
				})
			},
		}),
	})

	const handleSaveRolePermissions = React.useCallback(async () => {
		const normalizedRoleCode = selectedRoleCode.trim().toUpperCase()
		if (!normalizedRoleCode) return
		const permissionCodes = Array.from(
			new Set(
				permissionCodesInput
					.split(/[,\n]/g)
					.map((permissionCode) => permissionCode.trim().toLowerCase())
					.filter(Boolean),
			),
		)
		await setRolePermissions.mutateAsync({
			roleCode: normalizedRoleCode,
			permissionCodes,
		})
	}, [permissionCodesInput, selectedRoleCode, setRolePermissions])

	if (selectedId !== null) {
		return (
			<div className='space-y-8 pb-8'>
				<TaskCard
					recordId={selectedId}
					open
					onOpenChange={(open) => {
						if (!open) close()
					}}
					presentation='page'
				/>
			</div>
		)
	}

	return (
		<div className='space-y-8 pb-8'>
			<PageHeader
				title='Operation Tasks'
				description='Manage cross-module operational tasks.'
				actions={
					<Button
						onClick={openCreate}
						className='shadow-sm transition-all hover:shadow-md'
					>
						<Plus data-icon='inline-start' />
						New
					</Button>
				}
			/>

			<div className='overflow-hidden rounded-xl border border-border/50 bg-background/50 shadow-sm backdrop-blur-xl'>
				<DataGrid
					variant='flat'
					height={Math.max(windowSize.height - 240, 400)}
				>
					<DataGrid.Header className='border-border/50 border-b bg-muted/20 px-6 py-4'>
						<DataGrid.Toolbar filter sort search export />
					</DataGrid.Header>
					<DataGrid.Columns>
						<DataGrid.Column<OperationTask>
							accessorKey='taskNo'
							title='Task No.'
							handleEdit={handleEdit}
						/>
						<DataGrid.Column<OperationTask>
							accessorKey='moduleId'
							title='Module'
						/>
						<DataGrid.Column<OperationTask> accessorKey='title' title='Title' />
						<DataGrid.Column<OperationTask>
							accessorKey='status'
							title='Status'
							cellVariant='select'
						/>
						<DataGrid.Column<OperationTask>
							accessorKey='priority'
							title='Priority'
							cellVariant='select'
						/>
						<DataGrid.Column<OperationTask>
							accessorKey='assigneeUserId'
							title='Assignee'
						/>
						<DataGrid.Column<OperationTask>
							accessorKey='dueDate'
							title='Due Date'
							formatter={(v, f) => f.date(v.dueDate, { format: 'P' })}
						/>
						<DataGrid.Column<OperationTask>
							accessorKey='slaStatus'
							title='SLA'
							cellVariant='select'
						/>
						<DataGrid.Column<OperationTask>
							accessorKey='escalationLevel'
							title='Escalation'
							cellVariant='select'
						/>
					</DataGrid.Columns>
				</DataGrid>
			</div>

			<Card className='shadow-sm transition-shadow duration-300 hover:shadow-md'>
				<CardHeader className='border-border/50 border-b bg-muted/20'>
					<CardTitle>Role Permission Matrix</CardTitle>
					<CardDescription>
						Configure permission codes granted to each Hub role.
					</CardDescription>
				</CardHeader>
				<CardContent className='space-y-4 pt-6'>
					<div className='grid gap-4 lg:grid-cols-[220px_1fr]'>
						<div className='space-y-1.5'>
							<Label htmlFor='hub-role-permission-role'>Role</Label>
							<Select
								value={selectedRoleCode}
								onValueChange={(value) =>
									setSelectedRoleCode(value ?? 'VIEWER')
								}
							>
								<SelectTrigger id='hub-role-permission-role'>
									<SelectValue placeholder='Select role' />
								</SelectTrigger>
								<SelectContent>
									{availableRoleCodes.map((roleCode) => (
										<SelectItem key={roleCode} value={roleCode}>
											{roleCode}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className='space-y-1.5'>
							<Label htmlFor='hub-role-permission-codes'>
								Permission Codes
							</Label>
							<Input
								id='hub-role-permission-codes'
								value={permissionCodesInput}
								onChange={(event) =>
									setPermissionCodesInput(event.target.value)
								}
								placeholder='hub.audit.read, market.cart.checkout, ledger.invoice.post'
							/>
							<p className='text-muted-foreground text-xs'>
								Use comma-separated permission codes.
							</p>
						</div>
					</div>

					<div className='flex flex-wrap items-center gap-2'>
						<Button
							onClick={() => {
								void handleSaveRolePermissions()
							}}
							disabled={setRolePermissions.isPending}
						>
							<Save className='mr-1.5 size-3.5' aria-hidden='true' />
							{setRolePermissions.isPending ? 'Saving...' : 'Save Matrix'}
						</Button>
					</div>

					{setRolePermissions.error ? (
						<p className='text-destructive text-sm'>
							Unable to save role permissions.
						</p>
					) : null}

					<div className='space-y-2'>
						<p className='font-medium text-sm'>Current effective set</p>
						{rolePermissionsQuery.isFetching ? (
							<p className='text-muted-foreground text-sm'>
								Loading current assignments...
							</p>
						) : currentPermissionCodes.length === 0 ? (
							<p className='text-muted-foreground text-sm'>
								No permissions assigned to this role.
							</p>
						) : (
							<ul className='grid gap-1 rounded-lg border border-border/40 bg-background/30 p-3 md:grid-cols-2'>
								{currentPermissionCodes.map((permissionCode) => (
									<li key={permissionCode} className='font-mono text-xs'>
										{permissionCode}
									</li>
								))}
							</ul>
						)}
					</div>
				</CardContent>
			</Card>
		</div>
	)
}
