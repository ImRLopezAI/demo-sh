'use client'

import { queryClient } from '@lib/rpc/rpc'
import { QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from '@ui/sonner'
import { ThemeProvider } from 'next-themes'

interface ProvidersProps extends React.PropsWithChildren {}
export function Providers({ children }: ProvidersProps) {
	return (
		<QueryClientProvider client={queryClient}>
			<ThemeProvider attribute='class' defaultTheme='system' enableSystem>
				{children}
				<Toaster position='top-right' richColors />
			</ThemeProvider>
		</QueryClientProvider>
	)
}
