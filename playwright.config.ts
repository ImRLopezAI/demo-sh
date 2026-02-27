import { defineConfig, devices } from '@playwright/test'

const useManagedWebServer = process.env.PLAYWRIGHT_USE_WEBSERVER !== '0'

export default defineConfig({
	testDir: 'test/e2e',
	fullyParallel: true,
	timeout: 60_000,
	expect: {
		timeout: 10_000,
	},
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 2 : undefined,
	reporter: [
		['list'],
		['html', { outputFolder: 'playwright-report', open: 'never' }],
	],
	outputDir: 'test-results/playwright',
	use: {
		baseURL: 'http://localhost:3000',
		trace: process.env.CI ? 'on' : 'retain-on-failure',
		video: 'retain-on-failure',
		screenshot: 'only-on-failure',
	},
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] },
		},
		{
			name: 'mobile',
			use: { ...devices['iPhone 13'] },
			grep: /@mobile/,
		},
	],
	...(useManagedWebServer
		? {
				webServer: {
					command: 'bun run dev',
					url: 'http://localhost:3000',
					reuseExistingServer: !process.env.CI,
					timeout: 120_000,
				},
			}
		: {}),
})
