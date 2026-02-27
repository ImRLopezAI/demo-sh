import { Providers } from '@components/layout/providers'
import type { Metadata } from 'next'
import type { PropsWithChildren } from 'react'
import './styles.css'
export const metadata: Metadata = {
	title: 'Uplink',
	description: 'Uplink operations suite',
}

export default function RootLayout({ children }: PropsWithChildren) {
	return (
		<html lang='en' suppressHydrationWarning>
			<body>
				<Providers>{children}</Providers>
			</body>
		</html>
	)
}
