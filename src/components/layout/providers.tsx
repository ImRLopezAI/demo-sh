import type { getContext } from '@lib/rpc/context'
import { QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from '@ui/sonner'
import { ConvexProvider } from 'convex/react'
import { ConvexQueryCacheProvider } from 'convex-helpers/react/cache'
import { ThemeProvider } from 'next-themes'

interface ProvidersProps extends React.PropsWithChildren {
	cvx: ReturnType<typeof getContext>['cvx']
	queryClient: ReturnType<typeof getContext>['queryClient']
	cvxQueryClient: ReturnType<typeof getContext>['cvxQueryClient']
}
export function Providers({
	children,
	cvx,
	cvxQueryClient,
	queryClient,
}: ProvidersProps) {
	return (
		<ConvexProvider client={cvx.convexClient}>
			<QueryClientProvider client={queryClient}>
				<QueryClientProvider client={cvxQueryClient}>
					<ConvexQueryCacheProvider>
						<ThemeProvider attribute='class' defaultTheme='system' enableSystem>
							{children}
							<Toaster position='top-right' richColors />
						</ThemeProvider>
					</ConvexQueryCacheProvider>
				</QueryClientProvider>
			</QueryClientProvider>
		</ConvexProvider>
	)
}
