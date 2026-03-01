---
title: "feat: Visual Report Designer (Stimulsoft-Style)"
type: feat
status: active
date: 2026-03-01
---

# Visual Report Designer -- Band-Based WYSIWYG Editor

## Enhancement Summary

**Deepened on:** 2026-03-01  
**Sections enhanced:** 12 top-level sections  
**Skill lenses applied:** `deepen-plan`, `frontend-design`, `vercel-react-best-practices`, `web-design-guidelines`, `vercel-composition-patterns`, `architecture-strategist`, `performance-oracle`, `security-sentinel`, `kieran-typescript-reviewer`, `pattern-recognition-specialist`, `framework-docs-researcher`, `best-practices-researcher`

### Section Manifest
1. **Overview** -- clarify product contract boundaries and reuse strategy.
2. **Problem Statement / Motivation** -- add measurable baseline pain points.
3. **Proposed Solution** -- strengthen accessibility and interaction alternatives.
4. **Technical Approach** -- harden state/render architecture with concrete patterns.
5. **Implementation Phases** -- add quality gates and sequencing guidance.
6. **File Inventory** -- align file decomposition with maintainability constraints.
7. **Technical Considerations** -- deepen performance/security/compatibility controls.
8. **System-Wide Impact** -- define observability and failure/isolation behavior.
9. **Dependencies & Risks** -- add dependency reality checks and mitigation playbooks.
10. **Success Metrics** -- add measurable instrumentation-ready KPIs.
11. **Acceptance Criteria** -- expand for accessibility/security/operational confidence.
12. **References** -- add authoritative implementation sources.

### Key Improvements
1. Added explicit store/history strategy (`partialize`, `limit`, `equality`, tracked slices only) to prevent undo memory blowups.
2. Added accessibility guardrails for drag-and-drop workflows (keyboard and non-path alternatives).
3. Added deterministic PDF rendering recommendations (text measurement, buffered page pass, page lifecycle events).
4. Added security hardening for expressions, rich text, and remote image sources (allowlist + output encoding + SSRF controls).
5. Added phased entry/exit quality gates tied to tests and performance budgets.
6. Added Stimulsoft user-manual parity mapping (designer tabs, panels, band order, preview/toolbar model, dashboard interaction model) to anchor UI scope and naming.
7. Added schema-first contract requirements: standalone component-owned types + `datasetSchemaJson` from Zod JSON Schema instead of full dataset transport.

### New Considerations Discovered
- If `zustand/middleware/immer` is used, `immer` should be listed as an explicit dependency.
- Undo history should not track camera/selection/clipboard and should enforce a bounded history window.
- Drag-and-drop UX must expose non-path interactions to satisfy pointer/keyboard accessibility constraints.
- Rendering fidelity requires layout measurement (`widthOfString`, `heightOfString`, `boundsOfString`) before final draw.
- Stimulsoft’s manual separates report-designer controls into `Home`, `Insert`, `Page`, `Layout`, and `Preview` tab responsibilities; mirroring this reduces UX ambiguity and accelerates user onboarding.
- For performance and security, the designer should receive schema metadata (JSON Schema) and optional sample stubs, while real data remains server-side for preview/export execution.

### Learnings/Solutions Scan
- No local learnings found in `docs/solutions`, `.codex/docs`, or `~/.codex/docs`; no project-specific historical solutions were available to merge.

## Overview

Replace the current block-based report builder with a full visual report designer inspired by Stimulsoft Reports.JS and Microsoft Report Builder. The designer provides a pixel-perfect WYSIWYG canvas where users drag and drop elements onto horizontal bands (PageHeader, Detail, Footer, etc.), configure element properties (position, font, data binding), and preview/export to PDF. The designer is packaged as a standalone `<ReportDesigner>` component that receives a dataset schema (not data) and emits events like `onSave`.

### Research Insights

**Best Practices**
- Keep a single canonical `ReportDefinition` contract shared by UI, RPC, and renderer to avoid schema drift.
- Treat the designer as a composable API surface (root + slots) so future variants do not introduce boolean-prop sprawl.
- Preserve module identity in UX: the report designer shell should stay consistent, but template packs and styling presets should be module-distinct (Hub vs POS vs Ledger).
- Keep the designer data contract schema-only: pass JSON Schema metadata, never full dataset records, to avoid large payloads and accidental data leakage.

**Implementation Details**
```typescript
type DesignerPayload = {
  definitionVersion: 2
  report: ReportDefinition
  migratedFrom?: { legacyLayoutId?: string; legacyVersion?: number }
}
```

**Edge Cases**
- Very wide schemas (200+ fields) need field search, grouping, and virtualized tree rendering.
- Thermal reports should default to a different snap grid/font preset than A4/LETTER.

## Problem Statement / Motivation

The current block-based builder (`src/app/_shell/_views/hub/reporting/`) has fundamental limitations:

1. **No pixel-perfect control** -- blocks flow vertically with no x/y positioning
2. **No repeating data bands** -- can't iterate a "detail" section over each data row
3. **No page headers/footers** -- no way to repeat content across pages
4. **Limited nesting** -- rows allow 2-level nesting but no true layout freedom
5. **Coupled to the app** -- builder state lives in `use-report-builder.ts` with tight coupling to the shell, making it impossible to reuse elsewhere

Users need to build invoices, POS receipts, purchase orders, and operational reports that look professional and handle variable-length data. Tools like Stimulsoft ($400/mo) solve this but are expensive. Building a custom designer within the Uplink platform provides full control at a fraction of the cost.

### Research Insights

**Best Practices**
- Add baseline metrics before implementation to prove improvement (layout precision, time-to-first-preview, edit actions per minute, export success rate).
- Split pain points into **layout**, **data binding**, **page flow**, and **integration coupling** to avoid solving only the visual layer.

**Performance Considerations**
- Capture baseline from current builder and preserve as regression guard:
  - `preview p95 latency`
  - `save/load failure rate`
  - `canvas interaction frame drops`
  - `renderer OOM incidents`

**Edge Cases**
- Long detail datasets (1k+ rows) and mixed page sizes need explicit test fixtures.
- Group breaks where group key is null/empty should have deterministic behavior rules.

## Proposed Solution

A **band-based visual designer** where:

- **Bands** are horizontal strips (PageHeader, Header, GroupHeader, Detail, GroupFooter, Footer, PageFooter) stacked vertically on a canvas
- **Elements** (TextBox, Image, Shape, Line, Barcode) are positioned with absolute x/y/width/height within a band
- **At render time**, the Detail band repeats per data row, GroupHeader/Footer per group break, PageHeader/Footer per page
- The designer canvas shows the page at actual dimensions with zoom/pan, rulers, and grid snapping
- A **property panel** on the right lets users edit position, font, data binding, borders, conditional visibility
- **Undo/redo** via Zustand + Zundo middleware
- The component is self-contained: `<ReportDesigner datasetSchemaJson={schemaJson} onSave={handleSave} />`

### Research Insights

**Best Practices**
- DnD should not be the only interaction path; add command buttons and keyboard nudging/placement for accessibility.
- For drag interactions requiring path gestures, provide single-pointer and keyboard alternatives for equivalent outcomes.
- Preserve a clear editing mode model (`select`, `insert`, `pan`) to reduce accidental drags and destructive edits.

**Implementation Details**
```typescript
type InteractionMode = 'select' | 'insert' | 'pan'
type InsertAction = { kind: 'textbox' | 'shape' | 'line'; targetBandId: string }
```

**Edge Cases**
- Read-only templates should allow preview-only mode with disabled mutation affordances.
- Locked bands/elements need explicit visual affordance and keyboard announcement text.

## Technical Approach

### Research Insights

**Architecture & Composition**
- Prefer slot composition over mode booleans:
  - `<ReportDesigner.Root>`
  - `<ReportDesigner.Sidebar>`
  - `<ReportDesigner.Canvas>`
  - `<ReportDesigner.Properties>`
- Keep server contract code in `src/server/reporting/*` as source of truth and import types client-side via shared exports.
- Keep the designer package standalone and reusable: no dependency on `_shell` internals or module-local UI state.

**Data Contract (Performance-First)**
- Input to the designer is `datasetSchemaJson` only (JSON Schema), generated from Zod, not full dataset payloads.
- Generate schema via Zod JSON Schema conversion (`z.toJSONSchema(...)`) and cache by `(moduleId, entityId, schemaVersion)`.
- Server-only data fetch happens on preview/export; the designer itself receives field metadata + sample stubs only.

```typescript
const datasetSchemaJson = z.toJSONSchema(dataSetDefinitionSchema)
```

**State Management & Undo History**
- Track only document mutations in temporal history; exclude camera, hover, guides, selection, and clipboard.
- Add bounded history and equality checks to avoid storing no-op snapshots.

```typescript
const useDesignerStore = create<DesignerState>()(
  temporal(
    subscribeWithSelector(
      immer((set, get) => ({
        report: initialReport,
        selection: emptySelection,
        camera: defaultCamera,
        // actions...
      })),
    ),
    {
      partialize: (state) => ({ report: state.report }),
      limit: 100,
      equality: shallow,
    },
  ),
)
```

**DnD & Accessibility**
- Use pointer + keyboard sensors and expose non-drag alternatives.

```typescript
const sensors = useSensors(
  useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
)
```

**Renderer Fidelity**
- Run measure-first rendering using PDFKit text metrics for `canGrow` and overflow checks.
- Keep `bufferPages: true` to support post-layout footer/page-number pass.

```typescript
const height = doc.heightOfString(text, { width: element.width, align: 'left' })
const range = doc.bufferedPageRange()
for (let i = range.start; i < range.start + range.count; i += 1) {
  doc.switchToPage(i)
  // draw footer/page numbers
}
```

**Stimulsoft Parity Blueprint (from user manual)**
- **Top-level tab model**:
  - `Home`: editing actions, clipboard, simple formatting, alignment shortcuts.
  - `Insert`: add components/items (text/image/shape/line/barcode and future chart/dashboard items).
  - `Page`: page setup, units, grid/rulers, visibility toggles, component ordering controls.
  - `Layout`: align/distribute/size/lock/link operations for selected elements.
  - `Preview`: render/run, navigation, zoom, export/print flow.
- **Panel model**:
  - `Dictionary/Data` panel for data source/fields and calculated fields.
  - `Properties` panel for selected element/band/property groups.
  - `Report Tree` panel for object hierarchy and z-order operations.
  - `Toolbox` panel with categorized insertable components.
- **Designer interaction model**:
  - Page workspace with optional grid/rulers/guides.
  - Resizable/dockable panels and remembered panel layout.
  - Multi-selection with align/distribute and bring-front/send-back actions.
- **Report and dashboard coexistence model**:
  - Keep report bands as the primary MVP.
  - Design extension points so dashboard-style items and interactions can be added without breaking report workflows.
- **Manual-derived control definitions to copy in MVP**:
  - Status bar should expose unit switcher, selected element metadata, cursor coordinates, and zoom-to-fit controls.
  - Page tab should include `Show Grid`, `Align to Grid`, `Show Headers`, `Show Order`, `Show Rulers`, panel toggles, and toolbox toggle.
  - Layout tab should include z-order controls (`Bring to Front`, `Send to Back`, `Move Forward`, `Move Backward`) plus lock/link behavior.
  - Insert tab should keep component grouping and allow the toolbox as equivalent insertion surface.
  - Dictionary behavior should include drag/drop field insertion patterns (single field vs field+label behavior) and alias/name display options.

### Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                      <ReportDesigner>                               │
│                                                                     │
│  ┌──────────┐  ┌──────────────────────────────┐  ┌──────────────┐  │
│  │ Sidebar   │  │ Canvas                        │  │ Properties   │  │
│  │           │  │                                │  │              │  │
│  │ Toolbox   │  │  ┌──────────────────────────┐ │  │ Position     │  │
│  │ - TextBox │  │  │ PageHeader band          │ │  │ x, y, w, h  │  │
│  │ - Image   │  │  ├──────────────────────────┤ │  │              │  │
│  │ - Shape   │  │  │ Header band              │ │  │ Font         │  │
│  │ - Line    │  │  ├──────────────────────────┤ │  │ family, size │  │
│  │ - Barcode │  │  │ Detail band (repeats)    │ │  │ weight, color│  │
│  │           │  │  │  ┌────┐ ┌─────┐ ┌────┐  │ │  │              │  │
│  │ Fields    │  │  │  │ TB │ │ TB  │ │ TB │  │ │  │ Data Binding │  │
│  │ - orderId │  │  │  └────┘ └─────┘ └────┘  │ │  │ =Fields.name │  │
│  │ - date    │  │  ├──────────────────────────┤ │  │              │  │
│  │ - items[] │  │  │ Footer band              │ │  │ Border       │  │
│  │ - total   │  │  ├──────────────────────────┤ │  │ Background   │  │
│  │           │  │  │ PageFooter band          │ │  │ Visibility   │  │
│  │ Bands     │  │  └──────────────────────────┘ │  │              │  │
│  └──────────┘  └──────────────────────────────┘  └──────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ Toolbar: Undo Redo | Zoom | Grid | PageSize | Preview | Save│   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### Core Data Model

The report definition evolves from the current flat `ReportLayout` to a band-based `ReportDefinition`:

```typescript
// --- Elements (positioned within bands) ---
interface ReportElement {
  id: string
  kind: 'textbox' | 'image' | 'shape' | 'line' | 'barcode'
  // Position in PDF points (72 DPI), relative to band top-left
  x: number
  y: number
  width: number
  height: number
  // Data binding
  expression?: string        // "=Fields.documentNo" or "{{summary.total}}"
  staticText?: string        // literal text when no expression
  // Typography
  font?: {
    family: string           // 'Helvetica' | 'Courier' | 'Times-Roman'
    size: number             // points
    weight: 'normal' | 'bold'
    style: 'normal' | 'italic'
    color: string            // hex
    align: 'left' | 'center' | 'right'
    lineHeight: number       // multiplier
  }
  // Appearance
  border?: {
    top?: { width: number; color: string; style: 'solid' | 'dashed' }
    right?: { width: number; color: string; style: 'solid' | 'dashed' }
    bottom?: { width: number; color: string; style: 'solid' | 'dashed' }
    left?: { width: number; color: string; style: 'solid' | 'dashed' }
  }
  background?: string        // hex fill color
  // Behavior
  canGrow?: boolean           // expand if text overflows
  canShrink?: boolean         // collapse if empty
  visibility?: string         // expression: "=Fields.status == 'Draft'"
  // Image-specific
  imageSource?: string        // URL or base64
  imageFit?: 'contain' | 'cover' | 'stretch'
  // Shape-specific
  shapeType?: 'rectangle' | 'ellipse' | 'roundedRect'
  cornerRadius?: number
  // Line-specific
  lineDirection?: 'horizontal' | 'vertical' | 'diagonal'
  lineStyle?: 'solid' | 'dashed' | 'dotted'
  lineColor?: string
  lineWidth?: number
}

// --- Bands (horizontal strips containing elements) ---
type BandType =
  | 'reportHeader'    // once, first page only
  | 'pageHeader'      // every page top
  | 'groupHeader'     // once per group value
  | 'detail'          // repeats per data row
  | 'groupFooter'     // once per group value
  | 'pageFooter'      // every page bottom
  | 'reportFooter'    // once, last page only

interface ReportBand {
  id: string
  type: BandType
  height: number              // design-time height in points
  canGrow: boolean            // allow band to expand
  elements: ReportElement[]
  // Group-specific
  groupExpression?: string    // "=Fields.categoryId"
  // Page behavior
  repeatOnNewPage?: boolean
  keepTogether?: boolean
  pageBreakBefore?: boolean
  pageBreakAfter?: boolean
}

// --- Full Report Definition ---
interface ReportDefinition {
  version: 1
  name: string
  description?: string
  page: {
    size: 'A4' | 'LETTER' | 'THERMAL' | { width: number; height: number }
    orientation: 'portrait' | 'landscape'
    margins: { top: number; right: number; bottom: number; left: number }
  }
  bands: ReportBand[]
  // Expressions & parameters
  parameters?: ReportParameter[]
  calculatedFields?: {
    name: string
    expression: string
  }[]
}

interface ReportParameter {
  name: string
  label: string
  type: 'string' | 'number' | 'date' | 'boolean' | 'select'
  defaultValue?: unknown
  options?: { value: string; label: string }[]
  required: boolean
}
```

### Expression Language

Phase 1 (MVP): Keep existing `{{path.to.field}}` template interpolation from `render-document.ts:122-129`.

Phase 2: Introduce `=Fields.fieldName` syntax with a safe evaluator (no `eval`/`Function`):

```
=Fields.documentNo                          // field reference
=Fields.lineAmount * Fields.quantity        // arithmetic
=Sum(Fields.lineAmount)                     // aggregate function
=IIF(Fields.status == "Paid", "Yes", "No") // conditional
=Globals.PageNumber + " of " + Globals.TotalPages  // page info
=Format(Fields.total, "currency")           // formatting
```

Built-in functions: `Sum`, `Count`, `Avg`, `Min`, `Max`, `IIF`, `Format`, `Upper`, `Lower`, `Trim`, `Left`, `Right`, `DateFormat`.

Built-in globals: `PageNumber`, `TotalPages`, `ReportDate`, `ReportTitle`.

### State Management: Zustand + Zundo

```typescript
// New dependency: zustand (5.x), zundo (2.x)
// Store slices:

// DocumentSlice -- the report definition (tracked by undo/redo)
interface DocumentSlice {
  report: ReportDefinition
  // Band mutations
  addBand: (type: BandType) => void
  removeBand: (bandId: string) => void
  updateBand: (bandId: string, patch: Partial<ReportBand>) => void
  reorderBands: (bandIds: string[]) => void
  resizeBand: (bandId: string, height: number) => void
  // Element mutations
  addElement: (bandId: string, element: ReportElement) => void
  updateElement: (elementId: string, patch: Partial<ReportElement>) => void
  removeElements: (elementIds: string[]) => void
  moveElement: (elementId: string, targetBandId: string, x: number, y: number) => void
  duplicateElements: (elementIds: string[]) => void
}

// SelectionSlice -- what's selected (NOT tracked by undo)
interface SelectionSlice {
  selectedBandId: string | null
  selectedElementIds: Set<string>
  select: (elementId: string, additive?: boolean) => void
  selectBand: (bandId: string) => void
  clearSelection: () => void
  selectAll: () => void
}

// CanvasSlice -- zoom, pan, grid (NOT tracked by undo)
interface CanvasSlice {
  camera: { x: number; y: number; z: number }
  grid: { size: number; show: boolean; snap: boolean }
  rulers: { show: boolean; unit: 'mm' | 'in' | 'pt' }
  setCamera: (camera: Partial<{ x: number; y: number; z: number }>) => void
  zoomToFit: () => void
  toggleGrid: () => void
  toggleRulers: () => void
}

// ClipboardSlice -- copy/paste (NOT tracked by undo)
interface ClipboardSlice {
  clipboard: ReportElement[] | null
  copy: () => void
  cut: () => void
  paste: (targetBandId: string) => void
}
```

### Component API (Public Interface)

```typescript
type DatasetSchemaJson = {
  $schema?: string
  type?: string | string[]
  properties?: Record<string, unknown>
  required?: string[]
  definitions?: Record<string, unknown>
  $defs?: Record<string, unknown>
}

interface ReportDesignerProps {
  /** JSON Schema (from Zod) describing available fields for data binding */
  datasetSchemaJson: DatasetSchemaJson
  /** Optional schema version for cache invalidation / optimistic refresh */
  datasetSchemaVersion?: string
  /** Optional lightweight example payload (never full production dataset) */
  sampleData?: Record<string, unknown>[]
  /** Initial report to load into the designer */
  initialReport?: ReportDefinition
  /** Called when user clicks Save */
  onSave: (report: ReportDefinition) => void | Promise<void>
  /** Called to generate a PDF preview */
  onPreview: (report: ReportDefinition) => Promise<string>  // returns blob URL
  /** Called when dirty state changes */
  onDirtyChange?: (isDirty: boolean) => void
  /** Designer mode */
  mode?: 'full' | 'layout-only'
  /** Theme */
  theme?: 'light' | 'dark'
  /** Additional CSS class */
  className?: string
}

/** Imperative handle for parent control */
interface ReportDesignerRef {
  getReport: () => ReportDefinition
  setReport: (report: ReportDefinition) => void
  isDirty: () => boolean
  undo: () => void
  redo: () => void
}
```

### PDF Rendering (Band-Based)

The existing `renderDocumentStream()` in `render-document.ts` is refactored to support both the legacy block-based layout and the new band-based layout:

```
renderDocumentStream(layout, dataSet):
  if layout.version === 1 (band-based):
    renderBandReport(doc, layout, dataSet)
  else (legacy block-based):
    renderBlockReport(doc, layout, dataSet)  // existing code

renderBandReport(doc, definition, dataSet):
  1. Render reportHeader (once, page 1)
  2. Render pageHeader (page 1)
  3. For each data row:
     a. Check group breaks → render groupFooter/groupHeader
     b. Check page overflow → pageFooter, addPage, pageHeader
     c. Render detail band (clone for this row)
  4. Render groupFooter (final group)
  5. Render reportFooter
  6. Two-pass: go back and render pageFooter on all pages
  7. Two-pass: resolve Globals.TotalPages

renderBandElements(doc, band, bandY, data):
  For each element in band.elements:
    evaluate visibility expression
    resolve text expression against data context
    render at absolute position (margin.left + element.x, bandY + element.y)
    handle canGrow (measure text, expand band height)
```

---

## Implementation Phases

### Research Insights

**Execution Strategy**
- Enforce phase exit gates with demos + test evidence; do not start next phase until prior gate passes.
- Build in vertical slices where possible (e.g., TextBox end-to-end from canvas to PDF) before adding more element types.

**Recommended Phase Gates**
- **Gate 1 (Phase 1-2):** Core canvas operations + property editing + undo/redo + keyboard basics.
- **Gate 2 (Phase 3):** Field binding + expression parse/validate with deterministic error model.
- **Gate 3 (Phase 4):** Pixel/point fidelity checks and pagination correctness on fixture datasets.
- **Gate 4 (Phase 5-6):** Integration, migration path, template quality, and e2e stability.

**Quality Controls**
- Add fixture matrix: A4 invoice, THERMAL receipt, grouped summary, very long detail list, null-heavy dataset.
- Add golden PDF snapshot comparisons for high-risk templates (header/footer paging, group breaks, canGrow).

**Stimulsoft-Informed Sequencing**
- Ship tab shells in this order: `Home` + `Insert` (Phase 1), `Page` + `Layout` (Phase 2), `Preview` (Phase 4).
- Implement panel shells early (Toolbox, Properties, Dictionary, Tree), then progressively enable operations per phase.
- Match command names/icons with industry-familiar labels where possible (Align Left, Bring to Front, Send to Back, Lock, Group).
- Add a parity checklist in each phase:
  - Phase 1: canvas + toolbox + basic Home actions + status bar skeleton.
  - Phase 2: Page/Layout commands, rulers/grid toggles, arrange/align/distribute actions.
  - Phase 3: Dictionary field operations, expression entry, alias/name display behavior.
  - Phase 4: Preview tab behavior and export navigation patterns.
  - Phase 6+: dashboard-style interaction affordances (filter, interaction, transform) as future-compatible extension points.

### Phase 1: Foundation (Core Types, Store, Canvas Shell)

**Goal**: Get the designer canvas rendering with bands, zoom/pan, and element selection. No data binding yet.

#### 1.1 New Dependencies
- `zustand` ^5.0.0
- `zundo` ^2.0.0

**File**: `package.json`

#### 1.2 Report Definition Types
- `ReportDefinition`, `ReportBand`, `ReportElement`, `BandType`, `ReportParameter`
- `ExpressionContext`, `ExpressionResult`
- Zod schemas for validation
- `DatasetSchemaJson` and related field-descriptor types owned by the designer package (no dependency on shell view types)

**Files**:
- `src/server/reporting/designer-contracts.ts` (NEW -- types)
- `src/server/reporting/designer-schema.ts` (NEW -- Zod validation)

#### 1.3 Designer Zustand Store
- DocumentSlice, SelectionSlice, CanvasSlice, ClipboardSlice
- Zundo temporal middleware on DocumentSlice
- Immer middleware for mutations

**File**: `src/components/report-designer/store.ts` (NEW)

#### 1.4 Canvas Core Components
- `ReportDesigner` -- top-level provider + layout
- `DesignerToolbar` -- undo/redo, zoom slider, grid toggle, page size
- `DesignerCanvas` -- zoom/pan viewport with camera model
- `PageSurface` -- white page at actual dimensions with margin guides
- `BandStrip` -- horizontal band with label, resize handle, drop zone
- `BandHandle` -- left-side label + resize grip
- `ElementRenderer` -- renders a single element at absolute position
- `SelectionOverlay` -- selection rectangle, resize handles, multi-select

**Files**:
- `src/components/report-designer/report-designer.tsx` (NEW)
- `src/components/report-designer/designer-toolbar.tsx` (NEW)
- `src/components/report-designer/designer-canvas.tsx` (NEW)
- `src/components/report-designer/page-surface.tsx` (NEW)
- `src/components/report-designer/band-strip.tsx` (NEW)
- `src/components/report-designer/band-handle.tsx` (NEW)
- `src/components/report-designer/element-renderer.tsx` (NEW)
- `src/components/report-designer/selection-overlay.tsx` (NEW)

#### 1.5 DnD Integration
- Drag from toolbox to create elements on canvas
- Drag elements within/between bands to reposition
- Grid snapping via @dnd-kit modifiers
- Resize elements via pointer events on handles

**Files**:
- `src/components/report-designer/dnd-context.tsx` (NEW)
- `src/components/report-designer/toolbox-draggable.tsx` (NEW)

#### 1.6 Keyboard Shortcuts
- Ctrl+Z / Cmd+Z: undo
- Ctrl+Y / Cmd+Shift+Z: redo
- Ctrl+C / Ctrl+V / Ctrl+X: copy/paste/cut
- Delete / Backspace: remove selected elements
- Ctrl+A: select all in band
- Arrow keys: nudge selected elements by grid increment
- Ctrl+D: duplicate

**File**: `src/components/report-designer/keyboard-handler.tsx` (NEW)

**Acceptance Criteria**:
- [ ] Canvas renders a page at A4 dimensions with margin guides
- [ ] Bands are visible as horizontal strips with labels
- [ ] Can add TextBox elements by dragging from toolbox
- [ ] Elements snap to grid when dragged
- [ ] Can select, move, resize, delete elements
- [ ] Undo/redo works for all mutations
- [ ] Zoom/pan with scroll wheel + Ctrl
- [ ] Keyboard shortcuts functional

---

### Phase 2: Property Panel & Element Configuration

**Goal**: Full property editing for selected elements. Font, colors, borders, positioning with unit conversion.

#### 2.1 Property Panel Shell
- Tabbed panel: Position | Style | Data | Rules
- Shows properties of selected element(s)
- Multi-select shows shared properties only

**Files**:
- `src/components/report-designer/property-panel/property-panel.tsx` (NEW)
- `src/components/report-designer/property-panel/position-tab.tsx` (NEW)
- `src/components/report-designer/property-panel/style-tab.tsx` (NEW)
- `src/components/report-designer/property-panel/data-tab.tsx` (NEW)
- `src/components/report-designer/property-panel/rules-tab.tsx` (NEW)

#### 2.2 Position Tab
- X, Y, Width, Height number inputs
- Unit selector (mm / in / pt) with conversion
- Lock aspect ratio toggle

**File**: `src/components/report-designer/property-panel/position-tab.tsx`

#### 2.3 Style Tab
- Font family picker (Helvetica, Courier, Times-Roman)
- Font size, weight (normal/bold), style (normal/italic)
- Text color picker
- Text alignment (left/center/right)
- Background color
- Border editor (per-side: width, color, style)

**Files**:
- `src/components/report-designer/property-panel/style-tab.tsx`
- `src/components/report-designer/property-panel/font-picker.tsx` (NEW)
- `src/components/report-designer/property-panel/color-picker.tsx` (NEW)
- `src/components/report-designer/property-panel/border-editor.tsx` (NEW)

#### 2.4 Band Properties
- Band height input
- canGrow toggle
- keepTogether / pageBreakBefore / pageBreakAfter toggles
- Group expression input (for groupHeader/groupFooter)

**File**: `src/components/report-designer/property-panel/band-properties.tsx` (NEW)

**Acceptance Criteria**:
- [ ] Selecting an element shows its properties in the panel
- [ ] Changing position values moves the element on canvas in real-time
- [ ] Unit conversion works correctly (mm <-> in <-> pt)
- [ ] Font changes reflect visually on the canvas element
- [ ] Border and background changes visible on canvas
- [ ] Band properties (height, canGrow) work correctly

---

### Phase 3: Data Binding & Field Picker

**Goal**: Connect the designer to dataset JSON Schemas. Drag fields from sidebar to canvas to create bound textboxes.

#### 3.1 Field List Sidebar
- Tree view of dataset fields organized by table/relation
- Drag a field onto a band to create a bound TextBox
- Shows field type icons (text, number, date, boolean)

**Files**:
- `src/components/report-designer/sidebar/sidebar.tsx` (NEW)
- `src/components/report-designer/sidebar/toolbox-panel.tsx` (NEW)
- `src/components/report-designer/sidebar/field-list-panel.tsx` (NEW)
- `src/components/report-designer/sidebar/band-list-panel.tsx` (NEW)

#### 3.2 Expression Editor
- In Data tab of property panel
- Dropdown field picker: `=Fields.fieldName`
- Free-text expression input with syntax highlighting
- Autocomplete for field names and functions
- Expression validation (parse without evaluating)

**Files**:
- `src/components/report-designer/property-panel/expression-editor.tsx` (NEW)
- `src/components/report-designer/expressions/parser.ts` (NEW)
- `src/components/report-designer/expressions/evaluator.ts` (NEW)
- `src/components/report-designer/expressions/functions.ts` (NEW)

#### 3.3 Expression Parser & Evaluator
- Safe parser for `=Fields.x`, `=Sum(...)`, `=IIF(...)` syntax
- No `eval()` or `Function()` -- hand-written recursive descent parser
- Evaluator takes `ExpressionContext` (Fields, Summary, Globals) and returns string
- Falls back to `{{path}}` interpolation for backward compatibility

**Files**:
- `src/server/reporting/expression-parser.ts` (NEW -- shared server/client)
- `src/server/reporting/expression-evaluator.ts` (NEW)

#### 3.4 Data Tab Properties
- Expression editor for TextBox value
- Image source expression
- Conditional visibility expression

**Acceptance Criteria**:
- [ ] Field list shows all fields from `datasetSchemaJson` prop
- [ ] Dragging a field onto a band creates a TextBox with `=Fields.fieldName`
- [ ] Expression editor validates input and shows errors
- [ ] Canvas renders resolved expressions with sample data
- [ ] `=Sum()`, `=Count()`, `=IIF()` parse and evaluate correctly

---

### Phase 4: Band-Based PDF Renderer

**Goal**: Server-side rendering that understands bands, repeating detail rows, page headers/footers, and group breaks.

#### 4.1 Refactor render-document.ts
- Extract existing block renderer into `renderBlockReport()`
- Add `renderBandReport()` for band-based definitions
- Entry point dispatches based on `definition.version`

**File**: `src/server/reporting/render-document.ts` (MODIFY)

#### 4.2 Band Renderer
- Iterate bands in type order: reportHeader → pageHeader → (groups/detail loop) → pageFooter → reportFooter
- Detail band clones per data row with expression resolution
- GroupHeader/GroupFooter detect group breaks
- Page overflow detection with automatic page breaks
- PageHeader/PageFooter rendered on every page
- Two-pass for page numbers (Globals.TotalPages)

**Files**:
- `src/server/reporting/band-renderer.ts` (NEW)
- `src/server/reporting/element-renderer.ts` (NEW -- renders individual elements at absolute positions)

#### 4.3 Element Renderers
- TextBox: text at absolute position with font, alignment, wrapping, canGrow
- Image: embedded image at position with fit mode
- Shape: rectangle, ellipse, roundedRect with fill/stroke
- Line: horizontal/vertical/diagonal with style
- Barcode: Code128/QR rendering (future)

**File**: `src/server/reporting/element-renderer.ts`

#### 4.4 Expression Resolution at Render Time
- For each detail row, create ExpressionContext with current row data
- Evaluate all element expressions
- Aggregate functions (Sum, Count) computed across all rows in the band's dataset
- Globals.PageNumber / TotalPages resolved in two-pass

**File**: `src/server/reporting/expression-evaluator.ts`

**Acceptance Criteria**:
- [ ] A report with Header + Detail + Footer renders to PDF with detail repeating per row
- [ ] PageHeader/PageFooter appear on every page
- [ ] Group breaks work correctly with groupExpression
- [ ] Page overflow triggers new page with repeated headers
- [ ] Element positioning matches designer canvas exactly
- [ ] Expressions resolve against live data

---

### Phase 5: API & Integration

**Goal**: Wire the designer into the Uplink app with save/load/preview endpoints.

#### 5.1 New API Endpoints
- `POST designer.saveReport` -- saves a ReportDefinition to reportLayouts table
- `GET designer.loadReport` -- loads a ReportDefinition by layout ID
- `POST designer.previewReport` -- renders PDF preview from a ReportDefinition draft (server fetches data; client does not post full dataset)
- `GET designer.getDatasetSchema` -- returns JSON Schema (generated from Zod) for a module/entity
- `GET designer.getDatasetSample` -- returns capped sample rows for design-time field/value preview (optional; maxRows hard-limited)
- `POST designer.exportReport` -- generates final PDF with live data

**File**: `src/server/rpc/router/uplink/reporting.router.ts` (MODIFY -- add new endpoints)

#### 5.2 Schema Migration
- Add `definitionVersion` column to `reportLayouts` (1 = legacy blocks, 2 = bands)
- Add `reportDefinitionJson` column for band-based definitions
- Keep existing `schemaJson` for backward compatibility and add `datasetSchemaJson`/`datasetSchemaVersion` for designer schema transport

**File**: `src/server/db/definitions/table.ts` (MODIFY)

#### 5.3 Integration with Reporting Center
- Replace the builder tab with `<ReportDesigner>` component
- Wire props: `datasetSchemaJson` + `datasetSchemaVersion` from schema endpoint, `onSave`/`onPreview` to RPC calls
- Keep Templates and Saved Layouts tabs

**Files**:
- `src/app/_shell/_views/hub/reporting-center.tsx` (MODIFY)
- `src/app/_shell/_views/hub/reporting/designer-integration.tsx` (NEW)

#### 5.4 Legacy Compatibility
- Existing block-based layouts continue to render via existing renderer
- "Convert to Designer" button migrates a block layout to a band-based definition
- Both formats coexist during transition

**File**: `src/server/reporting/layout-migration.ts` (NEW)

**Acceptance Criteria**:
- [ ] Save/load round-trips a ReportDefinition correctly
- [ ] Preview renders PDF from designer layout
- [ ] Dataset schema populates field list in designer
- [ ] Legacy block-based reports still work
- [ ] Can convert a block layout to band layout

---

### Phase 6: Built-In Templates & Polish

**Goal**: Ship built-in band-based templates, rulers, alignment guides, and UX polish.

#### 6.1 Ruler Component
- Horizontal and vertical rulers along canvas edges
- Tick marks in mm/in/pt based on user preference
- Highlight current element position on ruler

**File**: `src/components/report-designer/ruler.tsx` (NEW)

#### 6.2 Alignment Guides
- Smart guides when dragging (snap to other element edges/centers)
- Align selected elements: left, center, right, top, middle, bottom
- Distribute evenly (horizontal/vertical)

**File**: `src/components/report-designer/alignment-guides.tsx` (NEW)

#### 6.3 Built-In Band Templates
- **Invoice**: reportHeader (company logo + title), pageHeader, detail (line items), reportFooter (totals + signature)
- **POS Receipt**: THERMAL page, reportHeader (store name), detail (items), reportFooter (totals + barcode)
- **Purchase Order**: reportHeader (supplier info), detail (order lines), reportFooter (terms)
- **Sales Summary**: reportHeader (date range), groupHeader (category), detail (items), groupFooter (subtotal), reportFooter (grand total)

**File**: `src/server/reporting/designer-templates.ts` (NEW)

#### 6.4 Context Menu
- Right-click on element: Cut, Copy, Paste, Delete, Duplicate, Bring to Front, Send to Back
- Right-click on band: Add Band Above/Below, Delete Band, Band Properties

**File**: `src/components/report-designer/context-menu.tsx` (NEW)

#### 6.5 Mini-Map / Page Navigator
- Small overview of the page layout in bottom-right corner
- Click to jump to area
- Shows current viewport rectangle

**File**: `src/components/report-designer/mini-map.tsx` (NEW)

**Acceptance Criteria**:
- [ ] Rulers display with correct units and scale with zoom
- [ ] Alignment guides appear when dragging near other elements
- [ ] Built-in templates load correctly in designer
- [ ] Context menu works for all operations
- [ ] Mini-map navigates correctly

---

## File Inventory

### Research Insights

**Maintainability Guardrails**
- Keep folder boundaries strict by concern (`canvas/`, `sidebar/`, `property-panel/`, `dnd/`, `expressions/`).
- Introduce barrel exports per subfolder to simplify imports and preserve architectural boundaries.
- Enforce naming conventions now to avoid future drift (`*-panel.tsx`, `*-tab.tsx`, `*-store.ts`).
- Keep designer-owned contracts in dedicated files so the component can be reused outside this app shell without importing module-specific types.

**Complexity Controls**
- Split "god components" early:
  - toolbar state and command logic
  - property editor mapping
  - element renderer switch logic
- Cap per-file complexity with targeted refactors when a component exceeds clear single responsibility.

### New Files (~45 files)

**Types & Schemas (server)**:
1. `src/server/reporting/designer-contracts.ts` -- ReportDefinition, ReportBand, ReportElement types
2. `src/server/reporting/designer-schema.ts` -- Zod schemas for band-based validation
3. `src/server/reporting/expression-parser.ts` -- Safe expression parser (recursive descent)
4. `src/server/reporting/expression-evaluator.ts` -- Expression evaluation with context
5. `src/server/reporting/band-renderer.ts` -- Band-based PDF rendering
6. `src/server/reporting/element-pdf-renderer.ts` -- Individual element PDF rendering
7. `src/server/reporting/designer-templates.ts` -- Built-in band templates
8. `src/server/reporting/layout-migration.ts` -- Block-to-band migration utility

**Designer Component (client)**:
9. `src/components/report-designer/index.ts` -- barrel export
10. `src/components/report-designer/report-designer.tsx` -- top-level component
11. `src/components/report-designer/store.ts` -- Zustand store
12. `src/components/report-designer/types.ts` -- client-side types
13. `src/components/report-designer/constants.ts` -- band labels, element defaults, colors
14. `src/components/report-designer/utils.ts` -- unit conversion, coordinate math

**Canvas**:
15. `src/components/report-designer/canvas/designer-canvas.tsx` -- zoom/pan viewport
16. `src/components/report-designer/canvas/page-surface.tsx` -- white page with margins
17. `src/components/report-designer/canvas/band-strip.tsx` -- band rendering
18. `src/components/report-designer/canvas/band-handle.tsx` -- band label + resize
19. `src/components/report-designer/canvas/element-renderer.tsx` -- element visualization
20. `src/components/report-designer/canvas/selection-overlay.tsx` -- selection + resize handles
21. `src/components/report-designer/canvas/alignment-guides.tsx` -- smart guides
22. `src/components/report-designer/canvas/ruler.tsx` -- horizontal/vertical rulers
23. `src/components/report-designer/canvas/grid-background.tsx` -- CSS grid pattern
24. `src/components/report-designer/canvas/mini-map.tsx` -- page overview

**DnD**:
25. `src/components/report-designer/dnd/dnd-context.tsx` -- DndContext wrapper
26. `src/components/report-designer/dnd/toolbox-draggable.tsx` -- toolbox item draggable
27. `src/components/report-designer/dnd/band-droppable.tsx` -- band drop zone
28. `src/components/report-designer/dnd/modifiers.ts` -- grid snap, boundary restrict

**Sidebar**:
29. `src/components/report-designer/sidebar/sidebar.tsx` -- sidebar shell
30. `src/components/report-designer/sidebar/toolbox-panel.tsx` -- element palette
31. `src/components/report-designer/sidebar/field-list-panel.tsx` -- dataset fields tree
32. `src/components/report-designer/sidebar/band-list-panel.tsx` -- band overview list

**Property Panel**:
33. `src/components/report-designer/property-panel/property-panel.tsx` -- panel shell
34. `src/components/report-designer/property-panel/position-tab.tsx` -- x/y/w/h with units
35. `src/components/report-designer/property-panel/style-tab.tsx` -- font, colors
36. `src/components/report-designer/property-panel/data-tab.tsx` -- expression binding
37. `src/components/report-designer/property-panel/rules-tab.tsx` -- conditional formatting
38. `src/components/report-designer/property-panel/band-properties.tsx` -- band config
39. `src/components/report-designer/property-panel/font-picker.tsx` -- font family/size
40. `src/components/report-designer/property-panel/color-picker.tsx` -- hex color input
41. `src/components/report-designer/property-panel/border-editor.tsx` -- per-side borders
42. `src/components/report-designer/property-panel/expression-editor.tsx` -- expression input with autocomplete

**Toolbar & Misc**:
43. `src/components/report-designer/designer-toolbar.tsx` -- top toolbar
44. `src/components/report-designer/keyboard-handler.tsx` -- keyboard shortcuts
45. `src/components/report-designer/context-menu.tsx` -- right-click menu

**Integration**:
46. `src/app/_shell/_views/hub/reporting/designer-integration.tsx` -- wires designer into reporting center

**Tests**:
47. `test/uplink/reporting-designer-schema.test.ts` -- Zod schema validation
48. `test/uplink/reporting-expression-parser.test.ts` -- expression parsing
49. `test/uplink/reporting-band-renderer.test.ts` -- band PDF rendering
50. `test/uplink/reporting-layout-migration.test.ts` -- block-to-band migration
51. `test/e2e/hub/hub-report-designer.spec.ts` -- Playwright E2E

### Modified Files (~5 files)

1. `package.json` -- add zustand, zundo
2. `src/server/reporting/index.ts` -- re-export new modules
3. `src/server/reporting/render-document.ts` -- dispatch to band renderer
4. `src/server/rpc/router/uplink/reporting.router.ts` -- new endpoints
5. `src/app/_shell/_views/hub/reporting-center.tsx` -- integrate designer

### Preserved Files (no changes needed)

All existing block-based files continue to work:
- `src/server/reporting/contracts.ts` -- existing types preserved
- `src/server/reporting/layout-schema.ts` -- existing schemas preserved
- `src/server/reporting/template-library.ts` -- existing templates preserved
- `src/server/reporting/dataset-executor.ts` -- reused for data fetching
- `src/server/reporting/built-in-datasets.ts` -- reused for dataset definitions
- All block config UI components -- available for legacy editing

---

## Technical Considerations

### Research Insights

**Performance**
- Add performance budgets as hard acceptance checks:
  - Canvas interaction: 16ms frame budget in common interactions.
  - Preview endpoint: p95 < 2s for 500-row fixtures.
  - Undo memory: bounded history with deterministic cap.
- Use selector-level subscriptions (`useShallow` / selective subscribe) to avoid broad rerenders.
- Transport only JSON Schema and optional small sample rows to the designer; never ship full datasets to the client editor session.

**Security**
- Expression parser/evaluator should use strict allowlist grammar and function registry.
- Validate all user expressions/field paths server-side before rendering.
- If remote images are supported, enforce domain allowlists and network-layer egress constraints to reduce SSRF risk.
- Apply context-appropriate output encoding for any user-authored rich text displayed in HTML surfaces.

**Robustness**
- Keep external-store snapshots immutable and stable to avoid subscription churn and inconsistent renders.
- Separate deterministic layout calculation from drawing side effects for easier testability.

### Performance
- **Canvas rendering**: Use CSS transforms for zoom/pan (GPU-accelerated). No re-layout on zoom.
- **Element count**: Band-based reports typically have 10-50 elements. React can handle this without virtualization.
- **PDF generation**: PDFKit renders efficiently. The existing 500-row benchmark completes in <2s. Band rendering adds minimal overhead.
- **State updates**: Zustand with Immer provides O(1) shallow comparison for subscribers. Only components observing changed slices re-render.

### Security
- **Expression evaluator**: Custom parser with no `eval()`/`Function()`. Only whitelisted functions.
- **Field access**: Reuse existing `FORBIDDEN_KEYS` set from `render-document.ts:16` for prototype pollution prevention.
- **Image sources**: Validate URLs against allowlist. No arbitrary URL fetching from PDF renderer.
- **Table allowlist**: Reuse `REPORTING_ALLOWED_TABLES` from `dataset-executor.ts` for field picker.

### Backward Compatibility
- Existing `ReportLayout` (block-based) continues to work through the existing renderer.
- New `ReportDefinition` (band-based) uses `version: 1` discriminator.
- API auto-detects format and routes to correct renderer.
- Migration utility converts blocks to bands (one-way).

### Coordinate System
- **Internal**: PDF points (72 DPI). 1pt = 1/72 inch. All positions stored in points.
- **Display**: User selects mm, in, or pt. Conversion in property panel only.
- **Canvas**: CSS pixels at 1:1 with points at zoom=1. Scale via CSS transform.
- **Conversion**: 1mm = 2.835pt, 1in = 72pt.

### Page Sizes in Points
| Size | Width | Height |
|------|-------|--------|
| A4 | 595.28 | 841.89 |
| LETTER | 612 | 792 |
| THERMAL (80mm) | 226.77 | 1200 |

---

## System-Wide Impact

### Research Insights

**Observability**
- Emit structured events with correlation IDs:
  - `designer.save.started|succeeded|failed`
  - `designer.preview.started|succeeded|failed`
  - `designer.migrate.started|succeeded|failed`
- Track expression error rates and unsupported-function usage to guide roadmap.

**Failure Isolation**
- Keep preview failures non-destructive to in-memory draft state.
- Use idempotent save semantics (`layoutId + expectedVersion`) to prevent accidental overwrite under concurrent edits.

**Operational Readiness**
- Add lightweight health probes for preview renderer path (template parse + sample render).
- Include backpressure control for repeated preview requests (debounce and cancel stale previews).

### Interaction Graph
- `<ReportDesigner>` is a self-contained component. No callbacks/middleware/observers fire externally.
- On save, the parent component calls the RPC `saveReport` endpoint, which writes to `reportLayouts`/`reportLayoutVersions`.
- On preview, the parent calls `previewReport` which invokes `renderDocumentStream()` and returns a blob URL.
- The dataset executor (`executeDataSet`) is reused unchanged for data fetching.

### Error Propagation
- Expression parse errors surface as red underlines in the expression editor and empty text on canvas.
- PDF render errors are caught at the `previewReport` endpoint level and return error messages.
- Zustand store mutations are synchronous -- no async error propagation within the store.
- Save failures from RPC are handled by the integration wrapper with toast notifications.

### State Lifecycle Risks
- **Autosave**: No autosave in Phase 1. Dirty state tracked by store. User must explicitly save.
- **Tab close**: `onDirtyChange` callback allows parent to prompt "unsaved changes" warning.
- **Concurrent editing**: No multi-user editing. Last-write-wins with version number increment.

### API Surface Parity
- New band-based endpoints mirror existing block-based endpoints (save, load, preview, generate).
- Both endpoint sets remain active. No breaking changes.
- Agent API (`generateReceipt` in pos.router.ts) continues to work with legacy THERMAL_RECEIPT template.

---

## Dependencies & Risks

### Research Insights

**Dependency Checks**
- If the implementation uses `zustand/middleware/immer`, include `immer` explicitly in dependencies.
- Validate package compatibility against current stack (`react@19.x`, `typescript@5.9`, `vinext` runtime).

**Risk Mitigations**
- Add kill-switch feature flag for designer rollout (`REPORT_DESIGNER_ENABLED`) with legacy fallback.
- Keep a reversible migration path for API routing (legacy + band renderer coexistence).
- Add template-level contract tests so default templates fail fast on schema changes.

**Operational Risk Register Additions**
1. **History bloat** -- Mitigate with `partialize + limit + equality`.
2. **Pagination drift** -- Mitigate with deterministic fixture snapshots.
3. **Expression misuse** -- Mitigate with parser validation and sandboxed evaluator.
4. **DnD-only UX** -- Mitigate with keyboard/context-menu insertion alternatives.

### New Dependencies
| Package | Version | Size | Purpose |
|---------|---------|------|---------|
| zustand | ^5.0.0 | ~3KB | State management |
| zundo | ^2.0.0 | ~700B | Undo/redo middleware |

Both are lightweight, well-maintained, and compatible with React 19. No other new dependencies required -- @dnd-kit is already installed.

### Risks
1. **Scope creep**: Band-based rendering is complex. Mitigate by shipping Phase 1-3 first (canvas + properties + data binding) and Phase 4 (renderer) as a separate milestone.
2. **Expression language complexity**: Avoid building a full language. Keep it to field access + basic functions + IIF. Complex logic goes in dataset definitions.
3. **Font rendering discrepancy**: PDFKit built-in fonts render slightly differently than browser CSS fonts. Accept this -- the designer shows an approximation, the PDF is authoritative.
4. **Custom fonts**: Phase 1 supports only PDFKit built-in fonts (Helvetica, Courier, Times-Roman). Custom font upload is a future enhancement.

---

## Success Metrics

### Research Insights

**Measurement Design**
- Define metrics with precise collection points:
  - `designer_open_to_first_preview_ms`
  - `preview_pdf_p95_ms`
  - `save_success_rate`
  - `undo_redo_action_success_rate`
  - `expression_validation_error_rate`
  - `a11y_keyboard_task_success_rate`

**Suggested Targets**
- p95 preview < 2000ms for 500-row dataset.
- >99% save/load round-trip success.
- 0 critical accessibility blockers for keyboard-only path.
- <1% renderer hard-failure rate on supported templates.

1. **Designer renders** -- A4/LETTER/THERMAL page on canvas with correct dimensions
2. **Full CRUD** -- Create, position, resize, configure, delete elements on bands
3. **Data binding works** -- `=Fields.documentNo` resolves in PDF preview
4. **Band repetition** -- Detail band repeats per data row in PDF
5. **Page management** -- Multi-page reports with correct headers/footers
6. **Round-trip** -- Save → load → modify → save produces valid reports
7. **Undo/redo** -- 50-step history with keyboard shortcuts
8. **Performance** -- Canvas responsive at 60fps with 50 elements, PDF renders in <3s

---

## Acceptance Criteria

### Research Insights

**Accessibility Additions**
- All core actions are keyboard-operable (insert, move, resize, delete, reorder, save, preview).
- Drag workflows expose equivalent non-path alternatives (toolbar/context menu/property inputs).
- Focus order remains deterministic across sidebar/canvas/properties and never traps.

**Security Additions**
- Expression evaluator rejects unknown functions/tokens with explicit errors.
- Remote image sources must pass allowlist and validation checks before fetch/render.
- Rich text inputs are either encoded by context or sanitized before HTML rendering.

**Reliability Additions**
- No-op state updates must not create undo history entries.
- Preview cancellation and rapid consecutive previews do not corrupt state.

**Stimulsoft-Parity Additions**
- Toolbar/tab taxonomy is explicit and stable (`Home`, `Insert`, `Page`, `Layout`, `Preview`).
- Designer exposes at least Toolbox, Properties, Dictionary, and Tree panels with consistent toggle points.
- Alignment/order/lock commands are available via both toolbar and context menu.

### Functional Requirements
- [ ] Designer canvas renders page at actual dimensions with zoom/pan
- [ ] 7 band types available: reportHeader, pageHeader, groupHeader, detail, groupFooter, pageFooter, reportFooter
- [ ] 5 element types: textbox, image, shape, line, barcode (barcode Phase 6+)
- [ ] Drag from toolbox to place new elements on bands
- [ ] Drag dataset fields to create bound textboxes
- [ ] Property panel edits position, font, colors, borders, data binding
- [ ] Grid snapping with configurable grid size
- [ ] Undo/redo with 50-step history
- [ ] Copy/paste/duplicate elements
- [ ] Keyboard shortcuts (Ctrl+Z, Ctrl+C, Delete, arrow nudge)
- [ ] Toolbar exposes tabbed command groups (`Home`, `Insert`, `Page`, `Layout`, `Preview`)
- [ ] Designer panels include Toolbox, Properties, Dictionary, and Tree with toggle visibility controls
- [ ] Status bar shows coordinates/unit context and zoom controls during canvas editing
- [ ] Designer consumes JSON Schema metadata (`datasetSchemaJson`) and does not require full dataset payloads
- [ ] Save/load report definitions via API
- [ ] Preview renders PDF matching canvas layout
- [ ] Detail band repeats per data row
- [ ] PageHeader/PageFooter repeat on every page
- [ ] Group breaks work with groupExpression
- [ ] Legacy block-based reports continue to work
- [ ] Expression language supports field access, Sum, Count, IIF

### Non-Functional Requirements
- [ ] Canvas renders at 60fps with 50 elements
- [ ] PDF generation completes in <3s for 500-row datasets
- [ ] Design-time sample dataset responses are capped (for example <=50 rows) and never include full production payloads
- [ ] Designer component is self-contained (no shell dependencies)
- [ ] Zero `eval()` or `Function()` in expression evaluator
- [ ] All new code passes `bun run typecheck`
- [ ] Test coverage for schemas, expressions, and renderer

---

## References

### Research Insights

Additional authoritative references used for this deepening pass:

- [Zod JSON Schema conversion (`z.toJSONSchema`)](https://zod.dev/json-schema)
- [React `useSyncExternalStore` reference](https://react.dev/reference/react/useSyncExternalStore)
- [Zustand `useShallow` guide](https://zustand.docs.pmnd.rs/guides/prevent-rerenders-with-use-shallow)
- [Zustand `subscribeWithSelector` middleware](https://zustand.docs.pmnd.rs/middlewares/subscribe-with-selector)
- [Zundo middleware options (`partialize`, `limit`, `equality`, `diff`)](https://github.com/charkour/zundo)
- [dnd-kit project and feature model](https://github.com/clauderic/dnd-kit)
- [PDFKit getting started (`pageAdded`, buffered pages, page switching)](https://pdfkit.org/docs/getting_started.html)
- [PDFKit text measurement methods](https://pdfkit.org/docs/text.html)
- [OWASP Input Validation Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)
- [OWASP XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [OWASP SSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html)
- [WCAG 2.2 Operable guideline](https://w3c.github.io/wcag/guidelines/22/)

Stimulsoft user-manual pages reviewed for designer definitions, panel taxonomy, and interaction model:

- [User Manual entry (Dashboards)](https://www.stimulsoft.com/en/documentation/online/user-manual/index.html?dashboards.htm)
- [Reports Designer overview](https://www.stimulsoft.com/en/documentation/online/user-manual/index.html?reports_designer.htm)
- [Reports Designer Home tab](https://www.stimulsoft.com/en/documentation/online/user-manual/index.html?reports_designer_home_tab.htm)
- [Reports Designer Insert tab](https://www.stimulsoft.com/en/documentation/online/user-manual/index.html?reports_designer_insert_tab.htm)
- [Reports Designer Page tab](https://www.stimulsoft.com/en/documentation/online/user-manual/index.html?reports_designer_page_tab.htm)
- [Reports Designer Layout tab](https://www.stimulsoft.com/en/documentation/online/user-manual/index.html?reports_designer_layout_tab.htm)
- [Reports Designer Dictionary panel](https://www.stimulsoft.com/en/documentation/online/user-manual/index.html?reports_designer_dictionary_panel.htm)
- [Reports Designer Properties panel](https://www.stimulsoft.com/en/documentation/online/user-manual/index.html?reports_designer_properties_panel.htm)
- [Reports Designer Report Tree panel](https://www.stimulsoft.com/en/documentation/online/user-manual/index.html?reports_designer_report_tree_panel.htm)
- [Reports Designer Status Bar](https://www.stimulsoft.com/en/documentation/online/user-manual/index.html?reports_designer_status_bar.htm)
- [Reports Bands](https://www.stimulsoft.com/en/documentation/online/user-manual/index.html?reports_bands.htm)
- [Reports Expressions](https://www.stimulsoft.com/en/documentation/online/user-manual/index.html?reports_expressions.htm)
- [Dashboards Panels](https://www.stimulsoft.com/en/documentation/online/user-manual/index.html?dashboards_panels.htm)
- [Dashboards Elements](https://www.stimulsoft.com/en/documentation/online/user-manual/index.html?dashboards_elements.htm)
- [Dashboards Interaction](https://www.stimulsoft.com/en/documentation/online/user-manual/index.html?dashboards_interaction.htm)

Direct manual page URLs (same topics, non-index form):

- [Reports Designer Home tab](https://www.stimulsoft.com/manuals/en/user-manual/reports_designer_home_tab.htm)
- [Reports Designer Page tab](https://www.stimulsoft.com/manuals/en/user-manual/reports_designer_page_tab.htm)
- [Reports Designer Layout tab](https://www.stimulsoft.com/manuals/en/user-manual/reports_designer_layout_tab.htm)
- [Reports Designer Report Tree panel](https://www.stimulsoft.com/manuals/en/user-manual/reports_designer_report_tree_panel.htm)
- [Reports Rendering Order](https://www.stimulsoft.com/manuals/en/user-manual/reports_rendering_order.htm)
- [Reports Data Bands](https://www.stimulsoft.com/manuals/en/user-manual/reports_data_bands.htm)
- [Dashboards Interaction](https://www.stimulsoft.com/manuals/en/user-manual/dashboards_interaction.htm)

### Internal
- `src/server/reporting/render-document.ts` -- existing PDFKit renderer
- `src/server/reporting/contracts.ts` -- existing type system
- `src/server/reporting/dataset-executor.ts` -- dataset execution engine
- `src/components/data-grid/ui/sortable.tsx` -- existing @dnd-kit wrapper
- `src/app/_shell/_views/hub/reporting/use-report-builder.ts` -- existing builder hook

### External
- [Stimulsoft Reports.JS](https://www.stimulsoft.com/en/products/reports-js) -- reference product
- [Introduction to Banded Reports -- DevExpress](https://docs.devexpress.com/XtraReports/2587/detailed-guide-to-devexpress-reporting/introduction-to-banded-reports)
- [@dnd-kit Documentation](https://dndkit.com/)
- [Zustand Documentation](https://github.com/pmndrs/zustand)
- [Zundo -- Undo/Redo Middleware](https://github.com/charkour/zundo)
- [PDFKit Documentation](https://pdfkit.org/)
- [Creating a Zoom UI -- Steve Ruiz](https://www.steveruiz.me/posts/zoom-ui)
- [Craft.js -- React Page Editor Framework](https://craft.js.org/)
- [Puck -- Visual Editor for React](https://github.com/puckeditor/puck)
