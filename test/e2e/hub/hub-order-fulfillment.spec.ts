import { expect, test } from '@playwright/test'

test.describe('hub order fulfillment @functional', () => {
	test('order fulfillment page renders', async ({ page }) => {
		await page.goto('/hub/order-fulfillment')
		await expect(
			page.getByRole('heading', { name: /fulfillment|order/i }),
		).toBeVisible({ timeout: 10_000 })
	})

	test('hub dashboard renders with KPIs', async ({ page }) => {
		await page.goto('/hub/dashboard')
		await expect(page.locator('[data-slot="view-component"]')).toBeVisible({
			timeout: 15_000,
		})
	})

	test('operation tasks list renders', async ({ page }) => {
		await page.goto('/hub/tasks')
		await expect(page.getByRole('heading', { name: /task/i })).toBeVisible({
			timeout: 10_000,
		})
	})

	test('notifications list renders with grid', async ({ page }) => {
		await page.goto('/hub/notifications')
		await expect(
			page.getByRole('heading', { name: /notification/i }),
		).toBeVisible({ timeout: 10_000 })
	})
})
