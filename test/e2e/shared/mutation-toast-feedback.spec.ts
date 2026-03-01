import type { Locator, Page } from '@playwright/test'
import { expect, test } from '@playwright/test'

async function selectFirstOption(trigger: Locator, page: Page) {
	const option = page.locator('[role="option"]').first()

	await expect
		.poll(
			async () => {
				if (await option.isVisible().catch(() => false)) return true
				await page.keyboard.press('Escape')
				await page.waitForTimeout(250)
				await trigger.click()
				await page.waitForTimeout(400)
				return option.isVisible().catch(() => false)
			},
			{ timeout: 15_000, intervals: [400, 700, 1000, 1500] },
		)
		.toBe(true)

	await option.click()
}

async function openNewSalesOrderDialog(page: Page) {
	const dialogHeading = page.getByRole('heading', { name: 'New Sales Order' })
	if (await dialogHeading.isVisible()) return

	await expect
		.poll(
			async () => {
				if (await dialogHeading.isVisible()) return true
				const button = page.getByTestId('sales-order-new-button')
				if (await button.isVisible()) {
					await button.click()
				}
				return dialogHeading.isVisible()
			},
			{ timeout: 15_000, intervals: [150, 300, 600, 1000] },
		)
		.toBe(true)
}

async function attemptSalesOrderCreate(page: Page) {
	await openNewSalesOrderDialog(page)
	await selectFirstOption(page.getByTestId('sales-order-customer-select'), page)
	// Fill required fields to avoid validation errors
	await page.getByLabel(/external doc/i).fill('TEST-DOC-123')
	await page
		.locator('[data-slot="grid-add-row"] [role="gridcell"]')
		.first()
		.click()
	await page.getByTestId('sales-order-save-button').click()
}

test.describe('mutation toast feedback @functional', () => {
	test('shows success toast for create mutation', async ({ page }) => {
		await page.goto('/market/sales-orders')
		await expect(
			page.getByRole('heading', { name: /sales orders/i }),
		).toBeVisible({ timeout: 10_000 })

		await attemptSalesOrderCreate(page)

		await expect(page.getByText(/created successfully/i)).toBeVisible({
			timeout: 10_000,
		})
	})

	test('shows error toast when create mutation fails', async ({ page }) => {
		await page.route(
			'**/api/rpc/market/salesOrders/createWithLines',
			async (route) => {
				await route.abort('failed')
			},
		)

		await page.goto('/market/sales-orders')
		await expect(
			page.getByRole('heading', { name: /sales orders/i }),
		).toBeVisible({ timeout: 10_000 })

		await attemptSalesOrderCreate(page)

		await expect(page.getByText(/create failed/i)).toBeVisible({
			timeout: 10_000,
		})
	})
})
