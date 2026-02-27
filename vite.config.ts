import tailwindcss from '@tailwindcss/vite'
import viteReact from '@vitejs/plugin-react'
import vinext from 'vinext'
import { defineConfig } from 'vite'
import viteTsConfigPaths from 'vite-tsconfig-paths'

const config = defineConfig({
	optimizeDeps: {
		include: ['@tanstack/*', 'lucide-react'],
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
