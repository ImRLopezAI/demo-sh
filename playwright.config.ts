import { defineConfig, devices } from '@playwright/test'

const useManagedWebServer = process.env.PLAYWRIGHT_USE_WEBSERVER === '1'

export default defineConfig({
	testDir: 'test/e2e',
	timeout: 60_000,
	expect: {
		timeout: 10_000,
	},
	retries: process.env.CI ? 1 : 0,
	reporter: [
		['list'],
		['html', { outputFolder: 'playwright-report', open: 'never' }],
	],
	outputDir: 'test-results/playwright',
	use: {
		baseURL: 'http://127.0.0.1:3000',
		trace: 'retain-on-failure',
		video: 'retain-on-failure',
		screenshot: 'only-on-failure',
	},
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] },
		},
	],
	...(useManagedWebServer
		? {
				webServer: {
					command: 'bun run dev',
					url: 'http://127.0.0.1:3000',
					reuseExistingServer: !process.env.CI,
					timeout: 120_000,
				},
			}
		: {}),
})
