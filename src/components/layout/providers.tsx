import { Toaster } from '@ui/sonner'
import { ThemeProvider } from 'next-themes'

interface ProvidersProps extends React.PropsWithChildren {}
export function Providers({ children }: ProvidersProps) {
	return (
		<ThemeProvider attribute='class' defaultTheme='system' enableSystem>
			{children}
			<Toaster position='top-right' />
		</ThemeProvider>
	)
}
