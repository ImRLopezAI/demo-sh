/**
 * Replenishment module route specs.
 * Supply chain: dashboard, purchase orders, vendors, transfers, planning workbench.
 *
 * Uses json-render features:
 * - $computed for currency formatting in KPI display
 * - $template for contextual descriptions
 * - $bindState for PO/transfer status filters
 * - visibility conditions for conditional alerts
 * - on action bindings for filter reset
 */
import type { NextAppSpec } from '@json-render/next'

type Routes = NonNullable<NextAppSpec['routes']>

export const replenishmentRoutes: Routes = {
	'/replenishment/dashboard': {
		layout: 'app',
		metadata: {
			title: 'Replenishment Dashboard',
			description: 'Supply pipeline, vendor health, and replenishment signals.',
		},
		page: {
			root: 'dashboard',
			elements: {
				dashboard: {
					type: 'DashboardPageStack',
					props: {},
					children: ['provider'],
				},
				provider: {
					type: 'ReplenishmentDashboardData',
					props: {},
					children: [
						'header',
						'kpis',
						'purchaseOrderStatusDistribution',
						'purchaseOrderTrend',
						'lowerGrid',
					],
				},
				header: {
					type: 'PageHeader',
					props: {
						title: 'Replenishment Dashboard',
						description:
							'Supply pipeline, vendor health, and replenishment signals.',
					},
					children: [],
				},
				kpis: {
					type: 'ReplenishmentKpiStrip',
					props: {},
					children: [],
				},
				purchaseOrderStatusDistribution: {
					type: 'ReplenishmentPurchaseOrderStatusDistribution',
					props: {},
					children: [],
				},
				purchaseOrderTrend: {
					type: 'ReplenishmentPurchaseOrderTrend',
					props: {},
					children: [],
				},
				lowerGrid: {
					type: 'DashboardThreeColumnGrid',
					props: {},
					children: ['vendorStats', 'transferStats', 'recentPurchaseOrders'],
				},
				vendorStats: {
					type: 'ReplenishmentVendorStats',
					props: {},
					children: [],
				},
				transferStats: {
					type: 'ReplenishmentTransferStats',
					props: {},
					children: [],
				},
				recentPurchaseOrders: {
					type: 'ReplenishmentRecentPurchaseOrders',
					props: {},
					children: [],
				},
			},
		},
	},

	'/replenishment/purchase-orders': {
		layout: 'app',
		metadata: {
			title: 'Purchase Orders',
			description: 'Vendor purchase orders from draft to receipt.',
		},
		page: {
			root: 'view',
			elements: {
				view: {
					type: 'ModuleListView',
					props: {
						moduleId: 'replenishment',
						entityId: 'purchaseOrders',
						title: 'Purchase Orders',
						description: 'Vendor purchase orders from draft to receipt.',
						columns: [
							{ accessorKey: 'documentNo', title: 'Document No.' },
							{ accessorKey: 'vendorName', title: 'Vendor' },
							{ accessorKey: 'status', title: 'Status', cellVariant: 'select' },
							{
								accessorKey: 'orderDate',
								title: 'Order Date',
								cellVariant: 'date',
							},
							{
								accessorKey: 'expectedReceiptDate',
								title: 'Expected Receipt',
								cellVariant: 'date',
							},
							{
								accessorKey: 'lineCount',
								title: 'Lines',
								cellVariant: 'number',
							},
							{
								accessorKey: 'totalAmount',
								title: 'Total',
								cellVariant: 'number',
							},
						],
						bulkActions: [
							{
								id: 'approve',
								label: 'Approve',
								toStatus: 'APPROVED',
								requireAllStatus: 'PENDING_APPROVAL',
							},
							{
								id: 'receive',
								label: 'Receive',
								toStatus: 'RECEIVED',
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
						newLabel: 'New Purchase Order',
						_cardTitle: 'Purchase Order {poNo}',
						_cardNewTitle: 'New Purchase Order',
						_cardDescription:
							'Vendor purchase order with approval workflow and financial tracking.',
						_cardSections: [
							{
								title: 'General',
								fields: [
									{
										name: 'poNo',
										label: 'PO No.',
										type: 'text',
										readOnly: true,
									},
									{
										name: 'vendorId',
										label: 'Vendor ID',
										type: 'text',
										readOnly: true,
									},
									{
										name: 'vendorName',
										label: 'Vendor Name',
										type: 'text',
										readOnly: true,
									},
								],
							},
							{
								title: 'Status',
								fields: [
									{
										name: 'status',
										label: 'Status',
										type: 'select',
										options: [
											{ label: 'Draft', value: 'DRAFT' },
											{ label: 'Pending Approval', value: 'PENDING_APPROVAL' },
											{ label: 'Approved', value: 'APPROVED' },
											{ label: 'Received', value: 'RECEIVED' },
											{ label: 'Invoiced', value: 'INVOICED' },
											{ label: 'Cancelled', value: 'CANCELLED' },
											{ label: 'Rejected', value: 'REJECTED' },
										],
									},
									{ name: 'currency', label: 'Currency', type: 'text' },
								],
							},
							{
								title: 'Financials',
								fields: [
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

	'/replenishment/vendors': {
		layout: 'app',
		metadata: {
			title: 'Vendors',
			description: 'Supplier profiles, terms, and performance.',
		},
		page: {
			root: 'view',
			elements: {
				view: {
					type: 'ModuleListView',
					props: {
						moduleId: 'replenishment',
						entityId: 'vendors',
						title: 'Vendors',
						description: 'Supplier profiles, terms, and performance.',
						columns: [
							{ accessorKey: 'vendorNo', title: 'Vendor No.' },
							{ accessorKey: 'name', title: 'Name' },
							{ accessorKey: 'contact', title: 'Contact' },
							{ accessorKey: 'email', title: 'Email' },
							{ accessorKey: 'paymentTerms', title: 'Payment Terms' },
							{ accessorKey: 'status', title: 'Status', cellVariant: 'select' },
							{
								accessorKey: 'balance',
								title: 'Balance',
								cellVariant: 'number',
							},
						],
						enableNew: true,
						newLabel: 'New Vendor',
						_cardTitle: 'Vendor {vendorNo}',
						_cardNewTitle: 'New Vendor',
						_cardDescription:
							'Supplier profile with contact details, address, and purchasing summary.',
						_cardSections: [
							{
								title: 'General',
								fields: [
									{
										name: 'vendorNo',
										label: 'Vendor No.',
										type: 'text',
										readOnly: true,
									},
									{ name: 'name', label: 'Name', type: 'text' },
									{ name: 'contactName', label: 'Contact Name', type: 'text' },
									{ name: 'email', label: 'Email', type: 'email' },
									{ name: 'phone', label: 'Phone', type: 'tel' },
									{ name: 'blocked', label: 'Blocked', type: 'switch' },
								],
							},
							{
								title: 'Address',
								fields: [
									{
										name: 'address',
										label: 'Address',
										type: 'text',
										colSpan: 2,
									},
									{ name: 'city', label: 'City', type: 'text' },
									{ name: 'country', label: 'Country', type: 'text' },
								],
							},
							{
								title: 'Purchasing',
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
										name: 'purchaseOrderCount',
										label: 'Purchase Order Count',
										type: 'number',
										readOnly: true,
									},
									{
										name: 'totalBalance',
										label: 'Total Balance',
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

	'/replenishment/transfers': {
		layout: 'app',
		metadata: {
			title: 'Transfers',
			description: 'Internal stock transfers between locations.',
		},
		page: {
			root: 'view',
			elements: {
				view: {
					type: 'ModuleListView',
					props: {
						moduleId: 'replenishment',
						entityId: 'transfers',
						title: 'Transfers',
						description: 'Internal stock transfers between locations.',
						columns: [
							{ accessorKey: 'transferNo', title: 'Transfer No.' },
							{ accessorKey: 'fromLocationId', title: 'From Location' },
							{ accessorKey: 'toLocationId', title: 'To Location' },
							{ accessorKey: 'status', title: 'Status', cellVariant: 'select' },
							{
								accessorKey: 'shipmentDate',
								title: 'Ship Date',
								cellVariant: 'date',
							},
							{
								accessorKey: 'receiptDate',
								title: 'Receipt Date',
								cellVariant: 'date',
							},
							{
								accessorKey: 'lineCount',
								title: 'Lines',
								cellVariant: 'number',
							},
						],
						bulkActions: [
							{
								id: 'release',
								label: 'Release',
								toStatus: 'RELEASED',
								requireAllStatus: 'DRAFT',
							},
							{
								id: 'ship',
								label: 'Ship',
								toStatus: 'IN_TRANSIT',
								requireAllStatus: 'RELEASED',
							},
							{
								id: 'receive',
								label: 'Receive',
								toStatus: 'RECEIVED',
								requireAllStatus: 'IN_TRANSIT',
							},
							{
								id: 'cancel',
								label: 'Cancel',
								toStatus: 'CANCELED',
								requireAllStatus: 'DRAFT',
								variant: 'destructive',
							},
						],
						enableNew: true,
						newLabel: 'New Transfer',
						_cardTitle: 'Transfer {transferNo}',
						_cardNewTitle: 'New Transfer',
						_cardDescription:
							'Internal stock transfer between warehouse and store locations.',
						_cardSections: [
							{
								title: 'General',
								fields: [
									{
										name: 'transferNo',
										label: 'Transfer No.',
										type: 'text',
										readOnly: true,
									},
									{
										name: 'fromLocationCode',
										label: 'From Location',
										type: 'text',
									},
									{
										name: 'toLocationCode',
										label: 'To Location',
										type: 'text',
									},
								],
							},
							{
								title: 'Status',
								fields: [
									{
										name: 'status',
										label: 'Status',
										type: 'select',
										options: [
											{ label: 'Draft', value: 'DRAFT' },
											{ label: 'In Transit', value: 'IN_TRANSIT' },
											{ label: 'Received', value: 'RECEIVED' },
											{ label: 'Cancelled', value: 'CANCELLED' },
										],
									},
								],
							},
							{
								title: 'Dates',
								fields: [
									{
										name: 'shipmentDate',
										label: 'Shipment Date',
										type: 'date',
									},
									{ name: 'receiptDate', label: 'Receipt Date', type: 'date' },
								],
							},
						] as any,
					},
					children: [],
				},
			},
		},
	},

	'/replenishment/planning-workbench': {
		layout: 'app',
		metadata: {
			title: 'Planning Workbench',
			description: 'Demand analysis and replenishment proposal generation.',
		},
		page: {
			root: 'view',
			elements: {
				view: {
					type: 'PlanningWorkbench',
					props: {
						title: 'Planning Workbench',
						description:
							'Generate replenishment proposals, evaluate supplier performance, and triage planning exceptions.',
					},
					children: [],
				},
			},
		},
	},
}
