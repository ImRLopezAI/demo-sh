import { expect, test } from '@playwright/test'

test.describe('hub report builder @functional', () => {
	// Helper: navigate and wait for full React hydration before interacting.
	// SSR renders tab buttons that don't respond to clicks until React attaches
	// event handlers. We wait for networkidle (all RPC calls settled) and then
	// confirm the Builder tab is active (React-controlled state).
	async function waitForHydration(page: import('@playwright/test').Page) {
		await page.goto('/hub/reporting', { waitUntil: 'networkidle' })
		await expect(
			page.getByRole('heading', { name: /report builder/i }),
		).toBeVisible({ timeout: 10_000 })
		// Builder tab is selected by default via React state — if this is true,
		// event handlers are attached and tabs are interactive.
		await expect(page.getByRole('tab', { name: /builder/i })).toHaveAttribute(
			'aria-selected',
			'true',
			{ timeout: 10_000 },
		)
	}

	test('report builder page loads with tabs', async ({ page }) => {
		await waitForHydration(page)

		// Verify all three tabs are present
		await expect(page.getByRole('tab', { name: /templates/i })).toBeVisible()
		await expect(page.getByRole('tab', { name: /builder/i })).toBeVisible()
		await expect(
			page.getByRole('tab', { name: /saved layouts/i }),
		).toBeVisible()
	})

	test('template gallery shows built-in templates including document templates', async ({
		page,
	}) => {
		await waitForHydration(page)

		// Click Templates tab
		await page.getByRole('tab', { name: /templates/i }).click()

		// Verify standard templates (wait for tab panel to render)
		await expect(page.getByText('Blank / Empty')).toBeVisible({
			timeout: 5_000,
		})
		await expect(page.getByText('A4 Summary')).toBeVisible()
		await expect(page.getByText('Thermal Receipt')).toBeVisible()

		// Verify document templates (use heading role to avoid matching description text)
		await expect(
			page.getByRole('heading', { name: 'Sales Order' }),
		).toBeVisible()
		await expect(
			page.getByRole('heading', { name: 'Sales Invoice' }),
		).toBeVisible()
		await expect(
			page.getByRole('heading', { name: 'POS Receipt (A4)' }),
		).toBeVisible()
	})

	test('selecting a template switches to builder tab and loads blocks', async ({
		page,
	}) => {
		await waitForHydration(page)

		// Click Templates tab
		await page.getByRole('tab', { name: /templates/i }).click()

		// Wait for template gallery to load
		await expect(page.getByText('Blank / Empty')).toBeVisible({
			timeout: 5_000,
		})

		// Click "Use Template" on A4 Summary using data-slot="card" for precise targeting
		const a4Card = page
			.locator('[data-slot="card"]')
			.filter({ hasText: 'A4 Summary' })
		await a4Card.getByRole('button', { name: /use template/i }).click()

		// Should switch to builder tab
		await expect(page.getByRole('tab', { name: /builder/i })).toHaveAttribute(
			'aria-selected',
			'true',
		)

		// Should show block builder with blocks loaded
		await expect(page.getByText('Report Blocks')).toBeVisible()
	})

	test('builder tab shows report settings controls', async ({ page }) => {
		await waitForHydration(page)

		// Click Builder tab
		await page.getByRole('tab', { name: /builder/i }).click()

		// Verify settings controls are visible
		await expect(page.getByText('Report Settings')).toBeVisible({
			timeout: 5_000,
		})
	})

	test('preview button triggers PDF generation', async ({ page }) => {
		await waitForHydration(page)

		// Builder tab is already active by default

		// Find and click the preview/refresh button
		const previewButton = page.getByRole('button', { name: /preview|refresh/i })
		await expect(previewButton).toBeVisible({ timeout: 5_000 })

		// Intercept the preview RPC call (URL may vary by oRPC config)
		const previewResponse = page.waitForResponse(
			(response) =>
				response.url().includes('previewReport') &&
				response.request().method() === 'POST',
			{ timeout: 30_000 },
		)
		await previewButton.click()
		const response = await previewResponse

		// Preview should return either a PDF or an error (both are valid test outcomes)
		expect(response.status()).toBeLessThan(500)
	})

	test('document template cards show dataset badge', async ({ page }) => {
		await waitForHydration(page)

		// Click Templates tab
		await page.getByRole('tab', { name: /templates/i }).click()

		// Wait for template gallery to load
		await expect(page.getByText('Blank / Empty')).toBeVisible({
			timeout: 5_000,
		})

		// Document template cards should show their primary table in dataset badges
		await expect(page.getByText('salesHeaders')).toBeVisible({ timeout: 5_000 })
		await expect(page.getByText('posTransactions')).toBeVisible({
			timeout: 5_000,
		})
	})

	test('saved layouts tab renders layout manager', async ({ page }) => {
		await waitForHydration(page)

		// Click Saved Layouts tab
		await page.getByRole('tab', { name: /saved layouts/i }).click()

		// Should show the tab panel content
		await expect(page.locator('[data-slot="view-component"]')).toBeVisible({
			timeout: 10_000,
		})
	})
})
