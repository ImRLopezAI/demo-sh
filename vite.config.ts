import tailwindcss from '@tailwindcss/vite'
import viteReact from '@vitejs/plugin-react'
import vinext from 'vinext'
import { defineConfig } from 'vite'
import viteTsConfigPaths from 'vite-tsconfig-paths'

const config = defineConfig({
	optimizeDeps: {
		include: ['@tanstack/*', 'lucide-react'],
	},
	ssr: {
		external: [
			'@react-pdf/renderer',
			'@react-pdf/reconciler',
			'@react-pdf/layout',
			'@react-pdf/pdfkit',
			'@react-pdf/primitives',
			'@react-pdf/fns',
			'@react-pdf/font',
			'@react-pdf/image',
			'@react-pdf/stylesheet',
			'@react-pdf/textkit',
			'@react-pdf/render',
			'@react-pdf/types',
		],
	},
	plugins: [
		vinext(),
		// this is the plugin that enables path aliases
		viteReact(),
		viteTsConfigPaths({
			projects: ['./tsconfig.json'],
		}),
		tailwindcss(),
	],
	server: {
		allowedHosts: true,
	},
})

export default config
