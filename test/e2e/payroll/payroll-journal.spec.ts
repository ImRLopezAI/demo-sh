import { expect, test } from '@playwright/test'

test.describe('payroll journal @functional', () => {
	test('payroll journal page renders', async ({ page }) => {
		await page.goto('/payroll/payroll-journal')
		await expect(
			page.getByRole('heading', { name: /payroll journal/i }),
		).toBeVisible({ timeout: 10_000 })
	})

	test('employees list renders with grid', async ({ page }) => {
		await page.goto('/payroll/employees')
		await expect(page.getByRole('heading', { name: /employee/i })).toBeVisible({
			timeout: 10_000,
		})
	})

	test('employee ledger list renders', async ({ page }) => {
		await page.goto('/payroll/employee-ledger')
		await expect(
			page.getByRole('heading', { name: /employee ledger/i }),
		).toBeVisible({ timeout: 10_000 })
	})

	test('payroll GL entries list renders', async ({ page }) => {
		await page.goto('/payroll/gl-entries')
		await expect(
			page.getByRole('heading', { name: /g\/l|general ledger/i }),
		).toBeVisible({ timeout: 10_000 })
	})

	test('payroll bank ledger list renders', async ({ page }) => {
		await page.goto('/payroll/bank-ledger')
		await expect(
			page.getByRole('heading', { name: /bank ledger/i }),
		).toBeVisible({ timeout: 10_000 })
	})

	test('adjustments & off-cycle page renders', async ({ page }) => {
		await page.goto('/payroll/adjustments-offcycle')
		await expect(
			page.getByRole('heading', { name: /adjustment|off.?cycle/i }),
		).toBeVisible({ timeout: 10_000 })
	})
})
