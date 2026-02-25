# CRUD Authorization Policy Matrix

This matrix documents authorization enforced by `createTenantScopedCrudRouter` in `/src/server/rpc/router/helpers.ts`.

## Default Operation Policy

| Operation | Minimum Role |
|---|---|
| `list` | `VIEWER` |
| `listViewRecords` | `VIEWER` |
| `getById` | `VIEWER` |
| `create` | `AGENT` |
| `update` | `AGENT` |
| `delete` | `MANAGER` |
| `transitionStatus` | `AGENT` |
| `kpis` | `VIEWER` |

## Coverage Scope (Module/Entity)

The policy above applies to every router created via `createTenantScopedCrudRouter`:

- `flow`: `bankAccounts`, `bankAccountLedgerEntries`, `genJournalLines`, `glEntries`
- `hub`: `operationTasks`, `moduleNotifications`, `hubUsers`, `hubRoles`, `hubPermissions`, `hubUserRoles`, `hubRolePermissions`, `hubModuleSettings`, `scheduledJobs`
- `insight`: `itemLedgerEntries`, `locations`, `valueEntries`
- `ledger`: `salesInvoiceHeaders`, `salesInvoiceLines`, `salesCreditMemoHeaders`, `salesCreditMemoLines`, `eInvoiceSubmissions`, `eInvoiceEvents`, `custLedgerEntries`, `glEntries`
- `market`: `salesHeaders`, `salesLines`, `items`, `customers`, `priceRules`, `promotions`, `taxPolicies`, `inventoryReservations`, `carts`, `cartLines`
- `payroll`: `employees`, `employeeLedgerEntries`, `genJournalLines`, `glEntries`, `bankAccountLedgerEntries`, `payrollRuleSets`, `payrollTaxBrackets`, `payrollDeductionRules`, `payrollRunAdjustments`, `payrollRunStatutoryReports`, `payrollRuns`
- `pos`: `posTransactions`, `posTransactionLines`, `terminals`, `posSessions`
- `replenishment`: `purchaseHeaders`, `purchaseLines`, `purchaseReceipts`, `purchaseInvoiceHeaders`, `purchaseInvoiceLines`, `vendors`, `vendorLedgerEntries`, `detailedVendorLedgerEntries`, `transferHeaders`, `transferLines`
- `trace`: `shipments`, `shipmentLines`, `shipmentMethods`, `carrierAccounts`, `shipmentCarrierLabels`, `shipmentTrackingEvents`

Each individual router can override defaults with `rolePolicy` in `CrudRouterConfig`.
