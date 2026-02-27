import type { Locator, Page } from '@playwright/test'
import { expect, test } from '@playwright/test'

async function selectFirstOption(trigger: Locator, page: Page) {
	const option = page.locator('[role="option"]').first()

	// Options load asynchronously — retry open/close cycle until they populate
	await expect
		.poll(
			async () => {
				if (await option.isVisible().catch(() => false)) return true
				// Close any open dropdown first, then re-open to check for loaded data
				await page.keyboard.press('Escape')
				await page.waitForTimeout(300)
				await trigger.click()
				await page.waitForTimeout(500)
				return option.isVisible().catch(() => false)
			},
			{ timeout: 15_000, intervals: [500, 1_000, 1_500, 2_000] },
		)
		.toBe(true)

	await option.click()
}

async function openEditorFromNewButton(
	page: Page,
	buttonTestId: string,
	editorTitle: string,
) {
	const heading = page.getByRole('heading', { name: editorTitle })
	if (await heading.isVisible()) return

	await expect
		.poll(
			async () => {
				if (await heading.isVisible()) return true
				const button = page.getByTestId(buttonTestId)
				if (await button.isVisible()) {
					await button.click()
				}
				return heading.isVisible()
			},
			{ timeout: 15_000, intervals: [150, 300, 600, 1_000] },
		)
		.toBe(true)
}

test('hub notifications row actions are interactive @smoke', async ({
	page,
}) => {
	await page.goto('/hub/notifications')
	await expect(
		page.getByRole('heading', { name: 'Notifications' }),
	).toBeVisible()

	const enabledRead = page.locator('button:has-text("Read"):not([disabled])')
	const enabledArchive = page.locator(
		'button:has-text("Archive"):not([disabled])',
	)

	const actionButton =
		(await enabledRead.count()) > 0
			? enabledRead.first()
			: enabledArchive.first()

	await expect(actionButton).toBeVisible()
	await actionButton.click()
	await expect(
		page.getByText('Unable to complete notification action.'),
	).not.toBeVisible()
})

test('market sales order create-with-lines flow works @smoke', async ({
	page,
}) => {
	await page.goto('/market/sales-orders')
	await expect(
		page.getByRole('heading', { name: 'Sales Orders' }),
	).toBeVisible()

	await openEditorFromNewButton(
		page,
		'sales-order-new-button',
		'New Sales Order',
	)

	await selectFirstOption(page.getByTestId('sales-order-customer-select'), page)
	await page.locator('[data-slot="grid-add-row"] [role="gridcell"]').click()
	await page.getByTestId('sales-order-save-button').click()

	await expect(
		page.getByRole('heading', { name: /^Sales Order /i }),
	).toBeVisible()
	await page.getByRole('button', { name: 'Cancel' }).click()
	await expect(
		page.getByRole('heading', { name: 'Sales Orders' }),
	).toBeVisible()
})

test('replenishment purchase order create-with-lines flow works @smoke', async ({
	page,
}) => {
	await page.goto('/replenishment/purchase-orders')
	await expect(
		page.getByRole('heading', { name: 'Purchase Orders' }),
	).toBeVisible()

	await openEditorFromNewButton(
		page,
		'purchase-order-new-button',
		'New Purchase Order',
	)

	await selectFirstOption(
		page.getByTestId('purchase-order-vendor-select'),
		page,
	)
	await page.locator('[data-slot="grid-add-row"] [role="gridcell"]').click()
	await page.getByTestId('purchase-order-save-button').click()

	await expect(
		page.getByRole('heading', { name: /^Purchase Order /i }),
	).toBeVisible()
	await page.getByRole('button', { name: 'Cancel' }).click()
	await expect(
		page.getByRole('heading', { name: 'Purchase Orders' }),
	).toBeVisible()
})
