import { createFileRoute } from '@tanstack/react-router'
import SalesOrdersList from '../_views/market/sales-orders-list'

export const Route = createFileRoute('/_shell/market/sales-orders')({
	component: SalesOrdersList,
})
