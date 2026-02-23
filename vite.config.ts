import tailwindcss from '@tailwindcss/vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { nitro } from 'nitro/vite'
import { defineConfig } from 'vite'
import viteTsConfigPaths from 'vite-tsconfig-paths'
import {
	routeComponentPropsFooter,
	routeComponentPropsVitePlugin,
} from './router-component-props-plugin'

const config = defineConfig({
	optimizeDeps: {
		include: ['@tanstack/*', 'lucide-react'],
	},
	plugins: [
		devtools(),
		nitro({
			preset: 'vercel',
		}),
		// this is the plugin that enables path aliases
		viteTsConfigPaths({
			projects: ['./tsconfig.json'],
		}),
		tailwindcss(),
		tanstackStart({
			router: {
				routesDirectory: 'app',
				routeTreeFileFooter: routeComponentPropsFooter,
				routeFileIgnorePattern: 'components|utils|styles|hooks|_views|_shared|nav-config',
			},
		}),
		routeComponentPropsVitePlugin(),
		viteReact(),
	],
	server: {
		allowedHosts: true,
	},
})

export default config
