'use client'

/**
 * Spec-driven card/detail view helpers.
 *
 * When a card component receives `specCardProps`, these helpers generate
 * form fields organized in sections directly from the spec definition —
 * making the spec the single source of truth for record detail layout.
 *
 * Works alongside the app's `useCreateForm` / `Form.*` system: the spec
 * defines *what* fields to show and how they're grouped, while the card
 * component retains ownership of form state, validation, mutations, and
 * action groups.
 */
import type * as React from 'react'
import { FormSection } from '@/components/ui/json-render/form-section'

/* ── Shared types ── */

export interface SpecFieldDef {
	/** Form field name — must match the form's field names */
	name: string
	/** Display label */
	label: string
	/** Input type (defaults to 'text') */
	type?:
		| 'text'
		| 'number'
		| 'email'
		| 'tel'
		| 'select'
		| 'switch'
		| 'date'
		| 'textarea'
		| null
	/** Placeholder text */
	placeholder?: string | null
	/** Options for 'select' type fields */
	options?: Array<{ label: string; value: string }> | null
	/** Read-only field (e.g. auto-generated IDs, computed totals) */
	readOnly?: boolean | null
	/** Whether the field is required */
	required?: boolean | null
	/** HTML autocomplete attribute */
	autoComplete?: string | null
	/** Column span in the grid (1 or 2, default 1) */
	colSpan?: number | null
}

export interface SpecSectionDef {
	/** Section heading */
	title: string
	/** Optional section description */
	description?: string | null
	/** Fields in this section */
	fields: SpecFieldDef[]
	/** Grid columns (default 2) */
	columns?: number | null
}

export interface SpecCardProps {
	moduleId?: string
	entityId?: string
	/** Title for existing records (may include field references like "Vendor {vendorNo}") */
	title?: string
	/** Title for new records */
	newTitle?: string | null
	/** Card description */
	description?: string | null
	/** Form sections with field definitions */
	sections?: SpecSectionDef[]
	/** Allow extension */
	[key: string]: unknown
}

/* ── Extract card props from list props ── */

/**
 * Extracts SpecCardProps from the _card* fields on SpecListProps.
 * Returns undefined if no card sections are defined.
 */
export function extractSpecCardProps(
	specProps:
		| {
				_cardTitle?: string | null
				_cardNewTitle?: string | null
				_cardDescription?: string | null
				_cardSections?: SpecSectionDef[] | null
				moduleId?: string
				entityId?: string
		  }
		| undefined,
): SpecCardProps | undefined {
	if (!specProps?._cardSections) return undefined
	return {
		moduleId: specProps.moduleId,
		entityId: specProps.entityId,
		title: specProps._cardTitle ?? undefined,
		newTitle: specProps._cardNewTitle,
		description: specProps._cardDescription,
		sections: specProps._cardSections ?? undefined,
	}
}

/* ── Field rendering ── */

/**
 * Renders a single spec field using the Form compound component.
 *
 * This is a generic renderer — it receives the Form object from useCreateForm
 * and generates the appropriate Form.Field → Form.Item → Form.Control tree.
 *
 * @param Form — The Form compound component from useCreateForm
 * @param field — Spec field definition
 */
export function renderSpecField(
	Form: any,
	field: SpecFieldDef,
): React.ReactNode {
	const fieldType = field.type ?? 'text'
	const colSpanClass = field.colSpan === 2 ? 'col-span-2' : undefined

	if (fieldType === 'switch') {
		return (
			<Form.Field
				key={field.name}
				name={field.name}
				rules={
					field.required
						? { required: `${field.label} is required` }
						: undefined
				}
				render={({ field: formField }: { field: any }) => (
					<Form.Item
						className={
							colSpanClass
								? `flex items-center gap-3 ${colSpanClass}`
								: 'flex items-center gap-3'
						}
					>
						<Form.Label>{field.label}</Form.Label>
						<Form.Control>
							<Form.Switch
								checked={Boolean(formField.value)}
								onCheckedChange={formField.onChange}
								disabled={field.readOnly === true}
							/>
						</Form.Control>
						<Form.Message />
					</Form.Item>
				)}
			/>
		)
	}

	if (fieldType === 'select' && field.options) {
		return (
			<Form.Field
				key={field.name}
				name={field.name}
				rules={
					field.required
						? { required: `${field.label} is required` }
						: undefined
				}
				render={({ field: formField }: { field: any }) => (
					<Form.Item className={colSpanClass}>
						<Form.Label>{field.label}</Form.Label>
						<Form.Control>
							<Form.Select
								value={formField.value}
								onValueChange={formField.onChange}
								disabled={field.readOnly === true}
							>
								<Form.Select.Trigger className='w-full'>
									<Form.Select.Value
										placeholder={field.placeholder ?? undefined}
									/>
								</Form.Select.Trigger>
								<Form.Select.Content>
									{field.options?.map((opt) => (
										<Form.Select.Item key={opt.value} value={opt.value}>
											{opt.label}
										</Form.Select.Item>
									))}
								</Form.Select.Content>
							</Form.Select>
						</Form.Control>
						<Form.Message />
					</Form.Item>
				)}
			/>
		)
	}

	if (fieldType === 'textarea') {
		return (
			<Form.Field
				key={field.name}
				name={field.name}
				rules={
					field.required
						? { required: `${field.label} is required` }
						: undefined
				}
				render={({ field: formField }: { field: any }) => (
					<Form.Item className={colSpanClass}>
						<Form.Label>{field.label}</Form.Label>
						<Form.Control>
							<Form.Textarea
								{...formField}
								placeholder={field.placeholder ?? undefined}
								readOnly={field.readOnly === true}
								autoComplete={field.autoComplete ?? 'off'}
							/>
						</Form.Control>
						<Form.Message />
					</Form.Item>
				)}
			/>
		)
	}

	// Default: text/number/email/tel/date input
	return (
		<Form.Field
			key={field.name}
			name={field.name}
			rules={
				field.required ? { required: `${field.label} is required` } : undefined
			}
			render={({ field: formField }: { field: any }) => (
				<Form.Item className={colSpanClass}>
					<Form.Label>{field.label}</Form.Label>
					<Form.Control>
						<Form.Input
							{...formField}
							type={fieldType}
							placeholder={field.placeholder ?? undefined}
							readOnly={field.readOnly === true}
							autoComplete={field.autoComplete ?? 'off'}
						/>
					</Form.Control>
					<Form.Message />
				</Form.Item>
			)}
		/>
	)
}

/* ── Section rendering ── */

/**
 * Renders spec-driven form sections with their fields.
 *
 * @param Form — The Form compound component from useCreateForm
 * @param sections — Spec section definitions from specCardProps.sections
 */
export function renderSpecSections(
	Form: any,
	sections: SpecSectionDef[],
): React.ReactNode {
	return sections.map((section) => {
		const cols = section.columns ?? 2
		const gridClass =
			cols === 1
				? 'grid grid-cols-1 gap-4'
				: cols === 3
					? 'grid grid-cols-1 gap-4 md:grid-cols-3'
					: 'grid grid-cols-1 gap-4 md:grid-cols-2'

		return (
			<FormSection
				key={section.title}
				title={section.title}
				description={section.description ?? undefined}
			>
				<Form.Group className={gridClass}>
					{section.fields.map((field) => renderSpecField(Form, field))}
				</Form.Group>
			</FormSection>
		)
	})
}

/**
 * Resolves the card title from spec props, interpolating field references.
 *
 * Supports simple `{fieldName}` interpolation against the record object.
 * Example: "Vendor {vendorNo}" → "Vendor V-001"
 *
 * @param template — Title template string (e.g. "Vendor {vendorNo}")
 * @param record — The entity record object
 * @param fallback — Fallback if template is empty
 */
export function resolveCardTitle(
	template: string | undefined,
	record: Record<string, unknown> | undefined,
	fallback: string,
): string {
	if (!template) return fallback
	if (!record) return template
	return template.replace(/\{(\w+)\}/g, (_, key) => {
		const val = record[key]
		return val != null ? String(val) : ''
	})
}
