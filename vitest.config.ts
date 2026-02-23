import viteTsConfigPaths from 'vite-tsconfig-paths'
import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
	plugins: [
		viteTsConfigPaths({
			projects: ['./tsconfig.json'],
		}),
	],
	test: {
		include: ['**/*.test.ts'],
		exclude: [...configDefaults.exclude, '.claude/**'],
	},
})
