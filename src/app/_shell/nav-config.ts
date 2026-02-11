import {
	ArrowRightLeft,
	BarChart3,
	Bell,
	BookOpen,
	Boxes,
	Building2,
	ClipboardList,
	CreditCard,
	DollarSign,
	FileText,
	Landmark,
	LayoutDashboard,
	MapPin,
	Monitor,
	Package,
	Receipt,
	ScrollText,
	Ship,
	ShoppingCart,
	Store,
	Timer,
	Truck,
	UserCheck,
	Users,
	Wallet,
	Warehouse,
} from 'lucide-react'
import type { NavGroup } from '@/components/layout/sidebar/items'

export const navGroups: NavGroup[] = [
	{
		title: 'Control',
		items: [
			{
				title: 'Hub',
				href: '/hub/dashboard',
				icon: LayoutDashboard,
				items: [
					{ title: 'Dashboard', href: '/hub/dashboard', icon: LayoutDashboard },
					{ title: 'Operation Tasks', href: '/hub/tasks', icon: ClipboardList },
					{ title: 'Notifications', href: '/hub/notifications', icon: Bell },
				],
			},
		],
	},
	{
		title: 'Commerce',
		items: [
			{
				title: 'Market',
				href: '/market/dashboard',
				icon: Store,
				items: [
					{
						title: 'Dashboard',
						href: '/market/dashboard',
						icon: LayoutDashboard,
					},
					{
						title: 'Sales Orders',
						href: '/market/sales-orders',
						icon: ScrollText,
					},
					{ title: 'Items', href: '/market/items', icon: Package },
					{ title: 'Customers', href: '/market/customers', icon: Users },
					{ title: 'Carts', href: '/market/carts', icon: ShoppingCart },
				],
			},
			{
				title: 'POS',
				href: '/pos/dashboard',
				icon: CreditCard,
				items: [
					{ title: 'Dashboard', href: '/pos/dashboard', icon: LayoutDashboard },
					{ title: 'Transactions', href: '/pos/transactions', icon: Receipt },
					{ title: 'Terminals', href: '/pos/terminals', icon: Monitor },
					{ title: 'Sessions', href: '/pos/sessions', icon: Timer },
					{ title: 'Terminal', href: '/pos/terminal', icon: Store },
				],
			},
		],
	},
	{
		title: 'Supply Chain',
		items: [
			{
				title: 'Replenishment',
				href: '/replenishment/dashboard',
				icon: Warehouse,
				items: [
					{
						title: 'Dashboard',
						href: '/replenishment/dashboard',
						icon: LayoutDashboard,
					},
					{
						title: 'Purchase Orders',
						href: '/replenishment/purchase-orders',
						icon: ClipboardList,
					},
					{ title: 'Vendors', href: '/replenishment/vendors', icon: Building2 },
					{
						title: 'Transfers',
						href: '/replenishment/transfers',
						icon: ArrowRightLeft,
					},
				],
			},
			{
				title: 'Trace',
				href: '/trace/dashboard',
				icon: Truck,
				items: [
					{
						title: 'Dashboard',
						href: '/trace/dashboard',
						icon: LayoutDashboard,
					},
					{ title: 'Shipments', href: '/trace/shipments', icon: Ship },
					{
						title: 'Shipment Methods',
						href: '/trace/shipment-methods',
						icon: Boxes,
					},
				],
			},
		],
	},
	{
		title: 'Analytics',
		items: [
			{
				title: 'Insight',
				href: '/insight/dashboard',
				icon: BarChart3,
				items: [
					{
						title: 'Dashboard',
						href: '/insight/dashboard',
						icon: LayoutDashboard,
					},
					{
						title: 'Item Ledger',
						href: '/insight/item-ledger',
						icon: BookOpen,
					},
					{ title: 'Locations', href: '/insight/locations', icon: MapPin },
					{
						title: 'Value Entries',
						href: '/insight/value-entries',
						icon: DollarSign,
					},
				],
			},
		],
	},
	{
		title: 'Finance',
		items: [
			{
				title: 'Ledger',
				href: '/ledger/dashboard',
				icon: FileText,
				items: [
					{
						title: 'Dashboard',
						href: '/ledger/dashboard',
						icon: LayoutDashboard,
					},
					{ title: 'Invoices', href: '/ledger/invoices', icon: Receipt },
					{
						title: 'Customer Ledger',
						href: '/ledger/customer-ledger',
						icon: Users,
					},
					{ title: 'G/L Entries', href: '/ledger/gl-entries', icon: BookOpen },
				],
			},
			{
				title: 'Flow',
				href: '/flow/dashboard',
				icon: Landmark,
				items: [
					{
						title: 'Dashboard',
						href: '/flow/dashboard',
						icon: LayoutDashboard,
					},
					{
						title: 'Bank Accounts',
						href: '/flow/bank-accounts',
						icon: Landmark,
					},
					{ title: 'Bank Ledger', href: '/flow/bank-ledger', icon: BookOpen },
					{
						title: 'Payment Journal',
						href: '/flow/payment-journal',
						icon: Wallet,
					},
					{ title: 'G/L Entries', href: '/flow/gl-entries', icon: BookOpen },
				],
			},
			{
				title: 'Payroll',
				href: '/payroll/dashboard',
				icon: UserCheck,
				items: [
					{
						title: 'Dashboard',
						href: '/payroll/dashboard',
						icon: LayoutDashboard,
					},
					{ title: 'Employees', href: '/payroll/employees', icon: Users },
					{
						title: 'Employee Ledger',
						href: '/payroll/employee-ledger',
						icon: BookOpen,
					},
					{
						title: 'Payroll Journal',
						href: '/payroll/payroll-journal',
						icon: Wallet,
					},
					{ title: 'G/L Entries', href: '/payroll/gl-entries', icon: BookOpen },
					{
						title: 'Bank Ledger',
						href: '/payroll/bank-ledger',
						icon: Landmark,
					},
				],
			},
		],
	},
]
