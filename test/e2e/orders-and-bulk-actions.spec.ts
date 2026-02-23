import { expect, test } from '@playwright/test'
import type { Locator, Page } from '@playwright/test'

async function selectFirstOption(trigger: Locator, page: Page) {
	await trigger.click()
	const firstOption = page.getByRole('option').first()
	await expect(firstOption).toBeVisible()
	await firstOption.click()
}

test('hub notifications bulk actions keep selected count in sync @smoke', async ({
	page,
}) => {
	await page.goto('/hub/notifications')
	await expect(
		page.getByRole('heading', { name: 'Notifications' }),
	).toBeVisible()

	const checkboxes = page.getByRole('checkbox')
	await expect(checkboxes.first()).toBeVisible()
	const checkboxCount = await checkboxes.count()
	expect(checkboxCount).toBeGreaterThanOrEqual(3)

	await checkboxes.nth(1).click()
	await checkboxes.nth(2).click()

	await expect(page.getByTestId('notifications-selected-count')).not.toHaveText(
		/0 selected/i,
	)

	await page.getByTestId('notifications-bulk-mark-read').click()
	await expect(page.getByText('Bulk Notification Result')).toBeVisible()
})

test('market sales order create-with-lines flow works @smoke', async ({ page }) => {
	await page.goto('/market/sales-orders')
	await expect(page.getByRole('heading', { name: 'Sales Orders' })).toBeVisible()

	await page.getByTestId('sales-order-new-button').click()
	const dialog = page.getByRole('dialog')
	await expect(dialog.getByText('New Sales Order')).toBeVisible()

	await selectFirstOption(dialog.getByTestId('sales-order-customer-select'), page)
	await dialog.getByRole('button', { name: /Add row/i }).click()
	await dialog.getByTestId('sales-order-save-button').click()

	await expect(dialog.getByText('New Sales Order')).not.toBeVisible()
	await expect(dialog.getByText(/Sales Order/i)).toBeVisible()
	await dialog.getByRole('button', { name: 'Cancel' }).click()
})

test('replenishment purchase order create-with-lines flow works @smoke', async ({
	page,
}) => {
	await page.goto('/replenishment/purchase-orders')
	await expect(
		page.getByRole('heading', { name: 'Purchase Orders' }),
	).toBeVisible()

	await page.getByTestId('purchase-order-new-button').click()
	const dialog = page.getByRole('dialog')
	await expect(dialog.getByText('New Purchase Order')).toBeVisible()

	await selectFirstOption(dialog.getByTestId('purchase-order-vendor-select'), page)
	await dialog.getByRole('button', { name: /Add row/i }).click()
	await dialog.getByTestId('purchase-order-save-button').click()

	await expect(dialog.getByText('New Purchase Order')).not.toBeVisible()
	await expect(dialog.getByText(/Purchase Order/i)).toBeVisible()
	await dialog.getByRole('button', { name: 'Cancel' }).click()
})
