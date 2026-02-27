import { expect, type Page } from '@playwright/test'

/**
 * Shell navigation helpers for E2E tests.
 */
export class ShellFixture {
	constructor(private page: Page) {}

	/** Navigate to a module view and wait for content to render. */
	async navigateTo(moduleId: string, viewId: string) {
		await this.page.goto(`/${moduleId}/${viewId}`)
		await this.page.waitForSelector('[data-slot="view-component"]', {
			timeout: 15_000,
		})
	}

	/** Navigate to a module view and verify the heading renders. */
	async navigateAndVerifyHeading(
		moduleId: string,
		viewId: string,
		expectedHeading: string | RegExp,
	) {
		await this.navigateTo(moduleId, viewId)
		const heading = this.page.getByRole('heading', { name: expectedHeading })
		await expect(heading).toBeVisible({ timeout: 10_000 })
	}

	/** Get all console errors collected during the page lifecycle. */
	collectConsoleErrors(): string[] {
		const errors: string[] = []
		this.page.on('console', (msg) => {
			if (msg.type() === 'error') {
				errors.push(msg.text())
			}
		})
		return errors
	}

	/** Open the global search dialog (Cmd+K / Ctrl+K). */
	async openGlobalSearch() {
		const isMac = process.platform === 'darwin'
		await this.page.keyboard.press(isMac ? 'Meta+k' : 'Control+k')
		await expect(this.page.getByRole('dialog')).toBeVisible()
	}
}
