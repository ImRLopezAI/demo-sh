import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs))
}

/** ISO 4217 currency codes are exactly 3 uppercase letters */
const CURRENCY_CODE_RE = /^[A-Z]{3}$/

/**
 * Safely format a number as currency.
 * Falls back to a plain number format when the currency code is invalid or
 * when `toLocaleString` throws for any other reason.
 */
export function formatCurrency(
	value: number | null | undefined,
	currency?: string | null,
	locale = 'en-US',
): string {
	const num = value ?? 0
	const code = currency && CURRENCY_CODE_RE.test(currency) ? currency : null
	if (code) {
		try {
			return num.toLocaleString(locale, { style: 'currency', currency: code })
		} catch {
			// fall through
		}
	}
	// Fallback: plain number with two decimals prefixed by the code (or $)
	return `${code ?? '$'}${num.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
