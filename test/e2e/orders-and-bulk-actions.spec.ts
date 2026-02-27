import type { Locator, Page } from '@playwright/test'
import { expect, test } from '@playwright/test'

async function selectFirstOption(trigger: Locator, page: Page) {
	await trigger.click()
	const firstOption = page.getByRole('option').first()
	await expect(firstOption).toBeVisible()
	await firstOption.click()
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

	await selectFirstOption(
		page.getByTestId('sales-order-customer-select'),
		page,
	)
	await page.locator('[data-slot=\"grid-add-row\"] [role=\"gridcell\"]').click()
	await page.getByTestId('sales-order-save-button').click()

	await expect(page.getByRole('heading', { name: /^Sales Order /i })).toBeVisible()
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
	await page.locator('[data-slot=\"grid-add-row\"] [role=\"gridcell\"]').click()
	await page.getByTestId('purchase-order-save-button').click()

	await expect(
		page.getByRole('heading', { name: /^Purchase Order /i }),
	).toBeVisible()
	await page.getByRole('button', { name: 'Cancel' }).click()
	await expect(
		page.getByRole('heading', { name: 'Purchase Orders' }),
	).toBeVisible()
})
