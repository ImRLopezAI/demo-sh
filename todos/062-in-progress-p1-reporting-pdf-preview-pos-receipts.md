---
status: completed
priority: p1
issue_id: "062"
tags: [reporting, pdf, preview, pos, receipts, toasts]
dependencies: []
---

# Implement Reporting PDF, UI Preview Endpoint, POS Receipt Download, and Mutation Toast Consistency

## Tasks

- [x] Add server reporting foundation (`src/server/reporting/*`) with built-in templates and PDF renderer
- [x] Add reporting RPC router endpoints (`listLayouts`, `previewReport`, `generateReport`)
- [x] Wire reporting router into hub module RPC surface
- [x] Add POS transaction receipt generation endpoint using reporting pipeline
- [x] Hook POS terminal sale completion to download receipt
- [x] Add mutation feedback consistency for non-optimistic mode in `use-entity.ts`
- [x] Add tests for reporting + POS receipt endpoint behavior
- [x] Run typecheck/tests and document completed plan checkboxes

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-02-27 | Started implementation from deepened plan | Begin with backend vertical slice to unlock UI preview/download |
| 2026-02-27 | Completed backend reporting + POS receipt + preview UI and tests | Report preview/download is live at Hub Reporting and POS can auto-download/reprint receipts |
| 2026-02-27 | Added custom layout CRUD versioning/default flow + JSON editor in Reporting Center | Custom layouts are now editable from UI via `getLayout/createLayout/saveLayoutVersion/setDefaultLayout` with preview/download parity |
| 2026-02-27 | Added module-aware mutation toast policy powered by Sileo while preserving existing Sonner toasts | CRUD mutations now consistently surface success/error by policy, and modules can override operation-level toast visibility |
