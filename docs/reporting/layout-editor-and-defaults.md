# Reporting Layout Editor and Defaults

This guide explains how report layouts are managed in v1, how defaults are resolved, and how to preview/download PDFs.

## Built-in Templates

The reporting system ships with three system templates:

- `BLANK_EMPTY`
- `A4_SUMMARY`
- `THERMAL_RECEIPT`

Built-in templates are read-only. Use them directly or clone into a custom layout.

## Custom Layout Workflow

Custom layouts are managed in **Hub > Reporting Center**.

1. Select `module` and `entity`.
2. Select a base template.
3. Create a custom layout (`createLayout`).
4. Edit the JSON layout draft in the editor.
5. Save a new version (`saveLayoutVersion`).
6. Set it as default for that module/entity (`setDefaultLayout`).

Each save writes a new `reportLayoutVersions` row and increments `versionNo` on `reportLayouts`.

## Default Resolution Order

When generating a report, layout selection follows this order:

1. Explicit `layoutId` from request.
2. Explicit `builtInLayout` from request.
3. Stored default in `reportDefaults` for `(tenantId, moduleId, entityId)`.
4. Fallback: `A4_SUMMARY`.

## Preview vs Download

### Preview (`previewReport`)

- Uses current selected layout or unsaved `layoutDraft`.
- Does not persist a `reportRuns` artifact.
- Returns PDF with `Content-Disposition: inline`.
- Applies preview row limit (`previewOptions.rowLimit`, default 50).

### Download (`generateReport`)

- Renders the final PDF for the selected module/entity.
- Persists `reportRuns` metadata with `GENERATED` or `FAILED` status.
- Returns PDF with `Content-Disposition: attachment`.

## POS Receipts

POS receipts use the same renderer and template pipeline.

- Endpoint: `pos.transactions.generateReceipt`
- Default template: `THERMAL_RECEIPT`
- Trigger points:
  - auto-download after successful terminal sale completion
  - manual reprint from transactions list/detail

## Filtering Notes

Reporting filters are exact-match key/value filters against normalized row fields in the adapter layer.

- Use worksheet route filters (`f_*`) to preseed report filters from card actions.
- Keep filter keys aligned with actual entity field names.

## Security and Access

- Layout CRUD/default changes: `MANAGER`+
- Preview/download generation: `VIEWER`+
- Tenant boundary checks enforced on layouts, defaults, and report runs.

## Developer References

- `src/server/rpc/router/uplink/reporting.router.ts`
- `src/server/reporting/layout-schema.ts`
- `src/server/reporting/template-library.ts`
- `src/server/reporting/render-document.tsx`
- `src/server/reporting/adapter-registry.ts`
- `src/app/_shell/_views/hub/reporting-center.tsx`
