/**
 * Market module route specs.
 * E-commerce: dashboard, sales orders, items, customers, carts, pricing/returns.
 *
 * Uses json-render features:
 * - $computed for currency/number formatting in KPI cards
 * - $template for dynamic descriptions
 * - $bindState for filter controls
 * - visibility for conditional UI elements
 * - on action bindings for navigation and state mutations
 */
import type { NextAppSpec } from '@json-render/next'

type Routes = NonNullable<NextAppSpec['routes']>

export const marketRoutes: Routes = {
	'/market/dashboard': {
		layout: 'app',
		metadata: {
			title: 'Market Dashboard',
			description: 'Revenue, order status, and customer activity overview.',
		},
		page: {
			root: 'page',
			elements: {
				page: {
					type: 'Stack',
					props: { direction: 'vertical', gap: '6' },
					children: ['header', 'dashboard'],
				},
				header: {
					type: 'PageHeader',
					props: {
						title: 'Market Overview',
						description: {
							$template:
								'Revenue performance — ${/market/dashboard/periodLabel}',
						} as any,
						actionLabel: 'New Order',
					},
					on: {
						press: {
							action: 'navigate',
							params: { href: '/market/sales-orders' },
						},
					} as any,
					children: [],
				},
				dashboard: {
					type: 'MarketDashboard',
					props: {},
					children: [],
				},
			},
		},
	},

	'/market/sales-orders': {
		layout: 'app',
		metadata: {
			title: 'Sales Orders',
			description: 'Manage customer orders, quotes, and returns.',
		},
		page: {
			root: 'page',
			elements: {
				page: {
					type: 'Stack',
					props: { direction: 'vertical', gap: '4' },
					children: ['filterBar', 'list'],
				},
				filterBar: {
					type: 'Stack',
					props: { direction: 'horizontal', gap: '3', align: 'center' },
					children: ['statusFilter', 'dateFilter', 'resetBtn'],
				},
				statusFilter: {
					type: 'Select',
					props: {
						label: 'Status',
						name: 'orderStatus',
						options: [
							'ALL',
							'DRAFT',
							'PENDING_APPROVAL',
							'APPROVED',
							'RELEASED',
							'CANCELED',
						],
						value: { $bindState: '/filters/market/orderStatusFilter' } as any,
					},
					children: [],
				},
				dateFilter: {
					type: 'Select',
					props: {
						label: 'Date Range',
						name: 'dateRange',
						options: ['last7', 'last30', 'last90', 'thisYear', 'all'],
						value: { $bindState: '/filters/market/dateRange' } as any,
					},
					children: [],
				},
				resetBtn: {
					type: 'Button',
					props: {
						label: 'Clear Filters',
						variant: 'secondary' as any,
					},
					on: {
						press: {
							action: 'setState',
							params: {
								statePath: '/filters/market',
								value: { orderStatusFilter: 'ALL', dateRange: 'last30' },
							},
						},
					},
					visible: {
						$or: [
							{ $state: '/filters/market/orderStatusFilter', neq: 'ALL' },
							{ $state: '/filters/market/dateRange', neq: 'last30' },
						],
					} as any,
					children: [],
				},
				list: {
					type: 'ModuleListView',
					props: {
						moduleId: 'market',
						entityId: 'salesOrders',
						title: 'Sales Orders',
						description: 'Manage customer orders, quotes, and returns.',
						_filters: {
							status: '/filters/market/orderStatusFilter',
						},
						columns: [
							{ accessorKey: 'documentNo', title: 'Document No.' },
							{
								accessorKey: 'documentType',
								title: 'Type',
								cellVariant: 'select',
							},
							{ accessorKey: 'status', title: 'Status', cellVariant: 'select' },
							{ accessorKey: 'customerName', title: 'Customer' },
							{
								accessorKey: 'orderDate',
								title: 'Order Date',
								cellVariant: 'date',
							},
							{ accessorKey: 'currency', title: 'Currency' },
							{
								accessorKey: 'lineCount',
								title: 'Lines',
								cellVariant: 'number',
							},
							{
								accessorKey: 'totalAmount',
								title: 'Total Amount',
								cellVariant: 'number',
							},
						],
						bulkActions: [
							{
								id: 'submit',
								label: 'Submit for Approval',
								toStatus: 'PENDING_APPROVAL',
								requireAllStatus: 'DRAFT',
							},
							{
								id: 'release',
								label: 'Release',
								toStatus: 'RELEASED',
								requireAllStatus: 'APPROVED',
							},
							{
								id: 'cancel',
								label: 'Cancel',
								toStatus: 'CANCELED',
								requireAllStatus: 'DRAFT,PENDING_APPROVAL',
								variant: 'destructive',
							},
						],
						enableNew: true,
						newLabel: 'New Order',
						_cardTitle: 'Sales Order {orderNo}',
						_cardNewTitle: 'New Sales Order',
						_cardDescription:
							'Customer sales order with status tracking and financial summary.',
						_cardSections: [
							{
								title: 'General',
								fields: [
									{
										name: 'orderNo',
										label: 'Order No.',
										type: 'text',
										readOnly: true,
									},
									{
										name: 'customerId',
										label: 'Customer ID',
										type: 'text',
										readOnly: true,
									},
									{
										name: 'customerName',
										label: 'Customer Name',
										type: 'text',
										readOnly: true,
									},
									{
										name: 'status',
										label: 'Status',
										type: 'select',
										options: [
											{ label: 'Draft', value: 'DRAFT' },
											{ label: 'Pending Approval', value: 'PENDING_APPROVAL' },
											{ label: 'Approved', value: 'APPROVED' },
											{ label: 'Shipped', value: 'SHIPPED' },
											{ label: 'Delivered', value: 'DELIVERED' },
											{ label: 'Cancelled', value: 'CANCELLED' },
										],
									},
								],
							},
							{
								title: 'Financials',
								fields: [
									{ name: 'currency', label: 'Currency', type: 'text' },
									{
										name: 'totalAmount',
										label: 'Total Amount',
										type: 'number',
										readOnly: true,
									},
									{
										name: 'taxAmount',
										label: 'Tax Amount',
										type: 'number',
										readOnly: true,
									},
								],
							},
						] as any,
					},
					children: [],
				},
			},
		},
	},

	'/market/items': {
		layout: 'app',
		metadata: {
			title: 'Items',
			description: 'Product catalog and inventory items.',
		},
		page: {
			root: 'view',
			elements: {
				view: {
					type: 'ModuleListView',
					props: {
						moduleId: 'market',
						entityId: 'items',
						title: 'Items',
						description: 'Product catalog and inventory items.',
						columns: [
							{ accessorKey: 'itemNo', title: 'Item No.' },
							{ accessorKey: 'description', title: 'Description' },
							{ accessorKey: 'itemType', title: 'Type', cellVariant: 'select' },
							{
								accessorKey: 'unitPrice',
								title: 'Unit Price',
								cellVariant: 'number',
							},
							{
								accessorKey: 'unitCost',
								title: 'Unit Cost',
								cellVariant: 'number',
							},
							{
								accessorKey: 'inventory',
								title: 'Inventory',
								cellVariant: 'number',
							},
							{ accessorKey: 'status', title: 'Status', cellVariant: 'select' },
						],
						enableNew: true,
						newLabel: 'New Item',
						_cardTitle: 'Item {itemNo}',
						_cardNewTitle: 'New Item',
						_cardDescription:
							'Product catalog item with pricing, inventory, and status details.',
						_cardSections: [
							{
								title: 'General',
								fields: [
									{
										name: 'itemNo',
										label: 'Item No.',
										type: 'text',
										readOnly: true,
									},
									{ name: 'description', label: 'Description', type: 'text' },
									{
										name: 'unitOfMeasure',
										label: 'Unit of Measure',
										type: 'text',
									},
								],
							},
							{
								title: 'Pricing',
								fields: [
									{ name: 'unitPrice', label: 'Unit Price', type: 'number' },
									{
										name: 'currency',
										label: 'Currency',
										type: 'select',
										options: [
											{ label: 'USD', value: 'USD' },
											{ label: 'EUR', value: 'EUR' },
											{ label: 'GBP', value: 'GBP' },
											{ label: 'MXN', value: 'MXN' },
											{ label: 'CAD', value: 'CAD' },
										],
									},
								],
							},
							{
								title: 'Inventory',
								fields: [
									{
										name: 'quantityOnHand',
										label: 'Quantity on Hand',
										type: 'number',
										readOnly: true,
									},
									{
										name: 'reorderPoint',
										label: 'Reorder Point',
										type: 'number',
									},
									{ name: 'blocked', label: 'Blocked', type: 'switch' },
								],
							},
						] as any,
					},
					children: [],
				},
			},
		},
	},

	'/market/customers': {
		layout: 'app',
		metadata: {
			title: 'Customers',
			description: 'Customer profiles, addresses, and order history.',
		},
		page: {
			root: 'view',
			elements: {
				view: {
					type: 'ModuleListView',
					props: {
						moduleId: 'market',
						entityId: 'customers',
						title: 'Customers',
						description: 'Customer profiles, addresses, and order history.',
						columns: [
							{ accessorKey: 'customerNo', title: 'Customer No.' },
							{ accessorKey: 'name', title: 'Name' },
							{ accessorKey: 'email', title: 'Email' },
							{ accessorKey: 'phone', title: 'Phone' },
							{ accessorKey: 'city', title: 'City' },
							{ accessorKey: 'status', title: 'Status', cellVariant: 'select' },
							{
								accessorKey: 'balance',
								title: 'Balance',
								cellVariant: 'number',
							},
						],
						enableNew: true,
						newLabel: 'New Customer',
						_cardTitle: 'Customer {customerNo}',
						_cardNewTitle: 'New Customer',
						_cardDescription:
							'Customer profile with contact information, address, and financial details.',
						_cardSections: [
							{
								title: 'General',
								fields: [
									{
										name: 'customerNo',
										label: 'Customer No.',
										type: 'text',
										readOnly: true,
									},
									{ name: 'name', label: 'Name', type: 'text' },
									{ name: 'email', label: 'Email', type: 'email' },
									{ name: 'phone', label: 'Phone', type: 'tel' },
								],
							},
							{
								title: 'Address',
								fields: [
									{ name: 'address', label: 'Address', type: 'text' },
									{ name: 'city', label: 'City', type: 'text' },
									{ name: 'country', label: 'Country', type: 'text' },
								],
							},
							{
								title: 'Financials',
								fields: [
									{
										name: 'currency',
										label: 'Currency',
										type: 'select',
										options: [
											{ label: 'USD', value: 'USD' },
											{ label: 'EUR', value: 'EUR' },
											{ label: 'GBP', value: 'GBP' },
											{ label: 'MXN', value: 'MXN' },
											{ label: 'CAD', value: 'CAD' },
										],
									},
									{
										name: 'creditLimit',
										label: 'Credit Limit',
										type: 'number',
									},
									{ name: 'blocked', label: 'Blocked', type: 'switch' },
								],
							},
						] as any,
					},
					children: [],
				},
			},
		},
	},

	'/market/carts': {
		layout: 'app',
		metadata: {
			title: 'Carts',
			description: 'Active shopping carts and checkout sessions.',
		},
		page: {
			root: 'page',
			elements: {
				page: {
					type: 'Stack',
					props: { direction: 'vertical', gap: '4' },
					children: ['cartSummary', 'list'],
				},
				cartSummary: {
					type: 'Alert',
					props: {
						title: {
							$template:
								'${/market/carts/abandonedCount} abandoned carts in the last 24 hours',
						} as any,
						message:
							'Consider sending recovery emails to customers with high-value abandoned carts.',
						type: 'warning' as any,
					},
					visible: { $state: '/market/carts/abandonedCount' } as any,
					children: [],
				},
				list: {
					type: 'ModuleListView',
					props: {
						moduleId: 'market',
						entityId: 'carts',
						title: 'Carts',
						description: 'Active shopping carts and checkout sessions.',
						columns: [
							{ accessorKey: 'customerName', title: 'Customer' },
							{ accessorKey: 'status', title: 'Status', cellVariant: 'select' },
							{ accessorKey: 'currency', title: 'Currency' },
							{
								accessorKey: 'itemCount',
								title: 'Items',
								cellVariant: 'number',
							},
							{
								accessorKey: 'totalAmount',
								title: 'Total Amount',
								cellVariant: 'number',
							},
						],
						bulkActions: [
							{
								id: 'checkout',
								label: 'Checkout',
								toStatus: 'CHECKED_OUT',
								requireAllStatus: 'OPEN',
							},
							{
								id: 'abandon',
								label: 'Abandon',
								toStatus: 'ABANDONED',
								requireAllStatus: 'OPEN',
								variant: 'destructive',
							},
						],
						enableNew: false,
					},
					children: [],
				},
			},
		},
	},

	'/market/pricing-returns': {
		layout: 'app',
		metadata: {
			title: 'Pricing & Returns',
			description: 'Pricing rules, discount structures, and return processing.',
		},
		page: {
			root: 'view',
			elements: {
				view: {
					type: 'PricingReturns',
					props: {
						title: 'Pricing, Reservations & Returns',
						description:
							'Simulate pricing before commit, control reservation aging, and post return credit memos.',
					},
					children: [],
				},
			},
		},
	},
}
