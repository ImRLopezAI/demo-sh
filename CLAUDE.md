## Implementation Strategy

When implementing a new feature, follow this strategy:

1. Review the code base using the `ce:review` skill.
2. If the feature is complex, break it down with the `ce:plan` + `deepenPlan` skills.
3. Execute the plan using the `ce:work` skill.
4. Review the implementation using the `ce:review` skill.
5. Iterate until the feature is complete.
6. When finished use the `ce:compound` skill to compound the feature into the code base.

Deploy multiple agents to research the code base do some side implementation and then compound the feature into the code base.

## Skills
Use this wisely and only when needed.

- `ce:review`: Review the code base and identify the feature.
- `ce:plan`: Break down the feature into smaller steps.
- `ce:work`: Execute the plan.
- `ce:review`: Review the implementation.
- `ce:compound`: Compound the feature into the code base.
- `next-best-practice`: Follow the best practices for the next.js app router.
- `vercel-react-best-practice`: Follow the best practices for the vercel react app.
- `web-design-guidelines`: Follow the web design guidelines.
- `frontend-skill`: Follow the frontend skills.


## Quick Commands

Install deps:
- `bun install`

Development servers:(Normally you wouldn't need to run cause I always run in dev mode, but here you go)
- `bun run dev` (vinext dev server on :3000)

Build & run:
- `bun run build`
- `bun run start` (vinext start on :3000)
- `bun run preview` (Vite preview server)

Tests:
- `bun run test`
- `bun run test:e2e`

Typecheck:
- `bun run typecheck`

Lint/format (Biome):
- `bun run lint` (runs `biome check --write --unsafe .`)



## Project Layout

- `src/app/**` vinext App Router routes, layouts, and API handlers
- `src/app/_shell/**` Shell routing, navigation config, and per-module view loading

- `src/components/**` UI + layout components (REUSABLE COMPONENTS ONLY, no module-specific components)
- `src/lib/**` shared utilities, env helpers, Redis, router helpers, RPC client
- `src/server/**` server-side helpers, Hono API wiring, DB schema definitions, RPC routers
- `test/**` Vitest + Playwright tests
```text
src/
├── app/                       # vinext App Router routes and shell entrypoints
│   ├── layout.tsx
│   ├── page.tsx
│   ├── not-found.tsx
│   ├── index.tsx
│   ├── styles.css
│   ├── [[...view]]/
│   │   └── page.tsx           # Catch-all module/view route (single-route shell entry)
│   ├── api/
│   │   └── rpc/
│   │       └── [...path]/route.ts
│   └── _shell/
│       ├── shell-layout.tsx
│       ├── module-route-page.tsx
│       ├── view-components.tsx
│       ├── nav-config.ts
│       ├── hooks/
│       │   └── use-data.ts
│       ├── __test__/
│       │   └── nav-routes.test.ts
│       └── _views/            # Per-module views and module-local UI
│
├── components/                # Reusable UI and layout components
│   ├── data-grid/
│   ├── layout/
│   └── ui/
│
├── hooks/                     # Shared client hooks
│
├── lib/                       # Shared utilities and RPC client setup
│   ├── env.ts
│   ├── redis.ts
│   ├── router/
│   │   └── search.ts
│   ├── utils.ts
│   └── rpc/
│       ├── index.tsx
│       └── rpc.ts
│
└── server/                    # Server-side database and RPC
    ├── index.ts
    ├── convex/
    ├── db/
    │   ├── constants.ts
    │   ├── index.ts
    │   └── definitions/...
    └── rpc/
        └── router/uplink/*.router.ts  # market, ledger, pos, flow, payroll, insight, replenishment, trace, hub

test/
├── db/                        # DB/core unit tests
├── uplink/                    # Per-module uplink integration tests
├── integration/               # Cross-module integration tests
└── e2e/                       # Playwright end-to-end suites
```

# Components & Code Style

- TableGrid: use the `src/components/data-grid` component for all tabular data display. It has built-in pagination, sorting, and filtering support on its composition hook useGrid.
- Forms: use the `src/components/ui/form` components for all forms. It has built-in validation and error handling support on its composition hook useForm.
- GridLayout: use the `src/components/ui/grid-layout` component for all page layouts. It provides a responsive 12-column grid system with configurable gaps and breakpoints.




---

# Uplink Platform

**Uplink** is a cloud-native platform designed to unify and streamline essential business functions through a modular suite of services.
Each module is independently deployable while remaining deeply integrated with the rest of the ecosystem.

---

## ⚙️ Core Services

---

### 🛒 `uplink/market`

Your e-commerce engine. Build, manage, and operate product catalogs, carts, and orders with APIs that support scalable online storefronts.

This module provides the following features:

* **Product Catalog Management**: Create, update, and organize products with support for variants, pricing, and inventory tracking.
* **Cart and Checkout APIs**: Manage shopping carts, discounts, taxes, and order creation.
* **Customer Management**: Customer profiles, addresses, and order history.
* **Scalability**: Designed for high-traffic volumes and large catalogs.

**Reference Tables:**

* [Sales Header](https://learn.microsoft.com/en-us/dynamics365/business-central/application/base-application/table/microsoft.sales.document.sales-header)
* [Sales Line](https://learn.microsoft.com/en-us/dynamics365/business-central/application/base-application/table/microsoft.sales.document.sales-line)
* [Customer](https://learn.microsoft.com/en-us/dynamics365/business-central/application/base-application/table/microsoft.sales.customer.customer)
* [Item](https://learn.microsoft.com/en-us/dynamics365/business-central/application/base-application/table/microsoft.inventory.item.item)

---

### 📊 `uplink/insight`

Analytics and inventory intelligence. Monitor stock, detect trends, and optimize operations using real-time data.

This module provides the following features:

* **Inventory Tracking**: Stock levels and availability by location.
* **Sales Analytics**: KPIs by product, channel, and customer.
* **Forecasting Inputs**: Historical signals used by replenishment and planning.
* **Visualization**: Dashboards for trends and operational KPIs.

**Reference Tables:**

* [Item Ledger Entry](https://learn.microsoft.com/en-us/dynamics365/business-central/application/base-application/table/microsoft.inventory.ledger.item-ledger-entry)
* [Value Entry](https://learn.microsoft.com/en-us/dynamics365/business-central/application/base-application/table/microsoft.inventory.ledger.value-entry)
* [Location](https://learn.microsoft.com/en-us/dynamics365/business-central/application/base-application/table/microsoft.inventory.location.location)

---

### 📦 `uplink/replenishment`

Inventory replenishment and allocation. Keep the right products available at the right locations by generating purchase and transfer proposals from demand + stock signals.

This module provides the following features:

* **Demand Analysis**: Converts sales and movement history into demand signals.
* **Replenishment Rules**: Supports min/max, reorder point, days-of-cover, and safety stock.
* **Purchase Planning**: Generates vendor-facing purchase proposals and tracks the lifecycle from order → receipt → invoice.
* **Transfer Planning**: Generates internal transfer proposals (warehouse ↔ store, store ↔ store).
* **Allocation**: Prioritizes locations when supply is constrained.
* **Automation**: Scheduled replenishment runs with approvals and manual overrides.

**Reference Tables (Inventory & Movement):**

* [Item](https://learn.microsoft.com/en-us/dynamics365/business-central/application/base-application/table/microsoft.inventory.item.item) ([Microsoft Learn][1])
* [Item Ledger Entry](https://learn.microsoft.com/en-us/dynamics365/business-central/application/base-application/table/microsoft.inventory.ledger.item-ledger-entry)
* [Value Entry](https://learn.microsoft.com/en-us/dynamics365/business-central/application/base-application/table/microsoft.inventory.ledger.value-entry)
* [Location](https://learn.microsoft.com/en-us/dynamics365/business-central/application/base-application/table/microsoft.inventory.location.location)

**Reference Tables (Transfers):**

* [Transfer Header](https://learn.microsoft.com/en-us/dynamics365/business-central/application/base-application/table/microsoft.inventory.transfer.transfer-header)
* [Transfer Line](https://learn.microsoft.com/en-us/dynamics365/business-central/application/base-application/table/microsoft.inventory.transfer.transfer-line)

**Reference Tables (Purchasing):**

* [Vendor](https://learn.microsoft.com/en-us/dynamics365/business-central/application/base-application/table/microsoft.purchases.vendor.vendor) ([Microsoft Learn][1])
* [Purchase Header](https://learn.microsoft.com/en-us/dynamics365/business-central/application/base-application/table/microsoft.purchases.document.purchase-header) ([Microsoft Learn][2])
* [Purchase Line](https://learn.microsoft.com/en-us/dynamics365/business-central/application/base-application/table/microsoft.purchases.document.purchase-line) ([Microsoft Learn][3])
* [Purch. Inv. Header](https://learn.microsoft.com/en-us/dynamics365/business-central/application/base-application/table/microsoft.purchases.history.purch.-inv.-header) ([Microsoft Learn][4])
* [Purch. Inv. Line](https://learn.microsoft.com/en-us/dynamics365/business-central/application/base-application/table/microsoft.purchases.history.purch.-inv.-line) ([Microsoft Learn][5])

**Reference Tables (Payables / Vendor Entries):**

* [Vendor Ledger Entry](https://learn.microsoft.com/en-us/dynamics365/business-central/application/base-application/table/microsoft.purchases.payables.vendor-ledger-entry) ([Microsoft Learn][6])
* [Detailed Vendor Ledg. Entry](https://learn.microsoft.com/en-us/dynamics365/business-central/application/base-application/table/microsoft.purchases.payables.detailed-vendor-ledg.-entry) ([Microsoft Learn][7])

---

### 🧾 `uplink/ledger`

Electronic invoicing and financial document management. Issue, track, and archive invoices for compliance and transparency.

This module provides the following features:

* **Invoice Generation**: Invoices, credit memos, and tax documents.
* **Document Management**: Secure storage with audit-ready trails.
* **Compliance**: Tax calculation, audit logging, and access control.
* **Integration**: Posting to accounting and banking systems.

**Reference Tables:**

* [Sales Invoice Header](https://learn.microsoft.com/en-us/dynamics365/business-central/application/base-application/table/microsoft.sales.history.sales-invoice-header)
* [Sales Invoice Line](https://learn.microsoft.com/en-us/dynamics365/business-central/application/base-application/table/microsoft.sales.history.sales-invoice-line)
* [Cust. Ledger Entry](https://learn.microsoft.com/en-us/dynamics365/business-central/application/base-application/table/microsoft.sales.receivables.cust.-ledger-entry)
* [G/L Entry](https://learn.microsoft.com/en-us/dynamics365/business-central/application/base-application/table/microsoft.finance.generalledger.ledger.g-l-entry)

---

### 💳 `uplink/pos`

Modern Point-of-Sale system designed for high-volume retail environments.

This module provides the following features:

* **Fast Checkout**: Barcode scanning, discounts, and multiple payment methods.
* **Offline Support**: Local transaction capture with deferred sync.
* **Inventory Sync**: Stock updates across channels.
* **Customer Capture**: Customer profiles and purchase history at checkout.
* **Reporting**: Store-level sales and transaction metrics.

**Reference Tables:**

* [Sales Header](https://learn.microsoft.com/en-us/dynamics365/business-central/application/base-application/table/microsoft.sales.document.sales-header)
* [Sales Line](https://learn.microsoft.com/en-us/dynamics365/business-central/application/base-application/table/microsoft.sales.document.sales-line)
* [Item Ledger Entry](https://learn.microsoft.com/en-us/dynamics365/business-central/application/base-application/table/microsoft.inventory.ledger.item-ledger-entry)

---

### 📦 `uplink/trace`

Delivery tracking and logistics orchestration. Full visibility from fulfillment to delivery.

This module provides the following features:

* **Order Fulfillment Tracking**: Monitor processing, shipment, and delivery status.
* **Logistics Coordination**: Carrier selection and shipment management.
* **Customer Notifications**: Delivery updates and tracking.
* **Performance Analytics**: Delivery speed and bottleneck detection.

**Reference Tables:**

* [Sales Shipment Header](https://learn.microsoft.com/en-us/dynamics365/business-central/application/base-application/table/microsoft.sales.history.sales-shipment-header)
* [Sales Shipment Line](https://learn.microsoft.com/en-us/dynamics365/business-central/application/base-application/table/microsoft.sales.history.sales-shipment-line)
* [Shipment Method](https://learn.microsoft.com/en-us/dynamics365/business-central/application/base-application/table/microsoft.foundation.shipping.shipment-method)

---

### 🧭 `uplink/hub`

The centralized back-office and control plane for the Uplink ecosystem.

This module provides the following features:

* **Unified Dashboard**: Access all modules from a single interface.
* **User & Role Management**: Permissions, roles, and activity logging.
* **System Configuration**: Module settings, integrations, and notifications.
* **Cross-Module Insights**: High-level operational and financial reporting.

---

### 🏦 `uplink/flow`

Banking integration and cash flow automation. Connect accounts, reconcile transactions, and manage liquidity.

This module provides the following features:

* **Bank Account Integration**: Multiple bank accounts with live balances.
* **Payment Automation**: Vendor payments, payroll funding, refunds.
* **Bank Reconciliation**: Automatic matching of bank and ledger entries.
* **Cash Flow Reporting**: Liquidity, forecasts, and variance analysis.

**Reference Tables:**

* [Bank Account](https://learn.microsoft.com/en-us/dynamics365/business-central/application/base-application/table/microsoft.finance.bank.bank-account)
* [Bank Account Ledger Entry](https://learn.microsoft.com/en-us/dynamics365/business-central/application/base-application/table/microsoft.finance.bank.bank-account-ledger-entry)
* [Gen. Journal Line](https://learn.microsoft.com/en-us/dynamics365/business-central/application/base-application/table/microsoft.finance.generalledger.journal.gen.-journal-line)
* [G/L Entry](https://learn.microsoft.com/en-us/dynamics365/business-central/application/base-application/table/microsoft.finance.generalledger.ledger.g-l-entry)

---

### 💵 `uplink/payroll`

Payroll processing and employee compensation management with compliance support.

This module provides the following features:

* **Employee Management**: Contracts, compensation, and tax setup.
* **Payroll Calculation**: Gross-to-net calculations and deductions.
* **Payroll Posting**: Automatic creation of accounting entries.
* **Compliance**: Labor law, tax reporting, and auditability.
* **Payments**: Integration with banking for salary disbursement.

**Reference Tables:**

* [Employee](https://learn.microsoft.com/en-us/dynamics365/business-central/application/base-application/table/microsoft.humanresources.employee.employee)
* [Employee Ledger Entry](https://learn.microsoft.com/en-us/dynamics365/business-central/application/base-application/table/microsoft.humanresources.employee.employee-ledger-entry)
* [Gen. Journal Line](https://learn.microsoft.com/en-us/dynamics365/business-central/application/base-application/table/microsoft.finance.generalledger.journal.gen.-journal-line)
* [G/L Entry](https://learn.microsoft.com/en-us/dynamics365/business-central/application/base-application/table/microsoft.finance.generalledger.ledger.g-l-entry)
* [Bank Account Ledger Entry](https://learn.microsoft.com/en-us/dynamics365/business-central/application/base-application/table/microsoft.finance.bank.bank-account-ledger-entry)
