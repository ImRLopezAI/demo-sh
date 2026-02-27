import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import viteTsConfigPaths from 'vite-tsconfig-paths'
import { configDefaults, defineConfig } from 'vitest/config'

const rootDir = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
	plugins: [
		viteTsConfigPaths({
			projects: ['./tsconfig.json'],
		}),
	],
	resolve: {
		alias: {
			'next/link': resolve(rootDir, 'test/mocks/next-link.tsx'),
			'next/navigation': resolve(rootDir, 'test/mocks/next-navigation.ts'),
		},
	},
	test: {
		include: ['**/*.test.ts'],
		exclude: [...configDefaults.exclude, '.claude/**'],
	},
})
