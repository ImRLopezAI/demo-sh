// Compatibility types for legacy sidebar components.
type StaticNavGroup = {
	type?: 'static'
	title: string
	items: NavItem[]
}

type DynamicNavGroup = {
	type: 'dynamic'
	title: string
	actions?: React.ReactNode | (() => React.ReactNode)
	dynamicItems: () => NavItem[]
}

export type NavGroup = StaticNavGroup | DynamicNavGroup

export type BadgeTypes = 'NEW' | 'COMING' | 'WIP' | 'UPDATED' | (string & {})

export type NavItem = {
	title: string
	href: React.ComponentProps<'a'>['href']
	icon?: React.ComponentType<{ className?: string }>
	badge?: BadgeTypes
	newTab?: boolean
	items?: NavItem[]
}
