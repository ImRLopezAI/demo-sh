/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as api_flow_bankAccountLedgerEntries from "../api/flow/bankAccountLedgerEntries.js";
import type * as api_flow_bankAccounts from "../api/flow/bankAccounts.js";
import type * as api_flow_genJournalLines from "../api/flow/genJournalLines.js";
import type * as api_flow_glEntries from "../api/flow/glEntries.js";
import type * as api_hub_moduleNotifications from "../api/hub/moduleNotifications.js";
import type * as api_hub_operationTasks from "../api/hub/operationTasks.js";
import type * as api_insight_itemLedgerEntries from "../api/insight/itemLedgerEntries.js";
import type * as api_insight_locations from "../api/insight/locations.js";
import type * as api_insight_valueEntries from "../api/insight/valueEntries.js";
import type * as api_ledger_custLedgerEntries from "../api/ledger/custLedgerEntries.js";
import type * as api_ledger_glEntries from "../api/ledger/glEntries.js";
import type * as api_ledger_salesInvoiceHeaders from "../api/ledger/salesInvoiceHeaders.js";
import type * as api_ledger_salesInvoiceLines from "../api/ledger/salesInvoiceLines.js";
import type * as api_market_cartLines from "../api/market/cartLines.js";
import type * as api_market_carts from "../api/market/carts.js";
import type * as api_market_customers from "../api/market/customers.js";
import type * as api_market_items from "../api/market/items.js";
import type * as api_market_salesHeaders from "../api/market/salesHeaders.js";
import type * as api_market_salesLines from "../api/market/salesLines.js";
import type * as api_payroll_bankAccountLedgerEntries from "../api/payroll/bankAccountLedgerEntries.js";
import type * as api_payroll_employeeLedgerEntries from "../api/payroll/employeeLedgerEntries.js";
import type * as api_payroll_employees from "../api/payroll/employees.js";
import type * as api_payroll_genJournalLines from "../api/payroll/genJournalLines.js";
import type * as api_payroll_glEntries from "../api/payroll/glEntries.js";
import type * as api_pos_posSessions from "../api/pos/posSessions.js";
import type * as api_pos_posTransactionLines from "../api/pos/posTransactionLines.js";
import type * as api_pos_posTransactions from "../api/pos/posTransactions.js";
import type * as api_pos_terminals from "../api/pos/terminals.js";
import type * as api_replenishment_purchaseHeaders from "../api/replenishment/purchaseHeaders.js";
import type * as api_replenishment_purchaseLines from "../api/replenishment/purchaseLines.js";
import type * as api_replenishment_transferHeaders from "../api/replenishment/transferHeaders.js";
import type * as api_replenishment_transferLines from "../api/replenishment/transferLines.js";
import type * as api_replenishment_vendors from "../api/replenishment/vendors.js";
import type * as api_trace_shipmentLines from "../api/trace/shipmentLines.js";
import type * as api_trace_shipmentMethods from "../api/trace/shipmentMethods.js";
import type * as api_trace_shipments from "../api/trace/shipments.js";
import type * as engine from "../engine.js";
import type * as functions from "../functions.js";
import type * as seed from "../seed.js";
import type * as utils from "../utils.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "api/flow/bankAccountLedgerEntries": typeof api_flow_bankAccountLedgerEntries;
  "api/flow/bankAccounts": typeof api_flow_bankAccounts;
  "api/flow/genJournalLines": typeof api_flow_genJournalLines;
  "api/flow/glEntries": typeof api_flow_glEntries;
  "api/hub/moduleNotifications": typeof api_hub_moduleNotifications;
  "api/hub/operationTasks": typeof api_hub_operationTasks;
  "api/insight/itemLedgerEntries": typeof api_insight_itemLedgerEntries;
  "api/insight/locations": typeof api_insight_locations;
  "api/insight/valueEntries": typeof api_insight_valueEntries;
  "api/ledger/custLedgerEntries": typeof api_ledger_custLedgerEntries;
  "api/ledger/glEntries": typeof api_ledger_glEntries;
  "api/ledger/salesInvoiceHeaders": typeof api_ledger_salesInvoiceHeaders;
  "api/ledger/salesInvoiceLines": typeof api_ledger_salesInvoiceLines;
  "api/market/cartLines": typeof api_market_cartLines;
  "api/market/carts": typeof api_market_carts;
  "api/market/customers": typeof api_market_customers;
  "api/market/items": typeof api_market_items;
  "api/market/salesHeaders": typeof api_market_salesHeaders;
  "api/market/salesLines": typeof api_market_salesLines;
  "api/payroll/bankAccountLedgerEntries": typeof api_payroll_bankAccountLedgerEntries;
  "api/payroll/employeeLedgerEntries": typeof api_payroll_employeeLedgerEntries;
  "api/payroll/employees": typeof api_payroll_employees;
  "api/payroll/genJournalLines": typeof api_payroll_genJournalLines;
  "api/payroll/glEntries": typeof api_payroll_glEntries;
  "api/pos/posSessions": typeof api_pos_posSessions;
  "api/pos/posTransactionLines": typeof api_pos_posTransactionLines;
  "api/pos/posTransactions": typeof api_pos_posTransactions;
  "api/pos/terminals": typeof api_pos_terminals;
  "api/replenishment/purchaseHeaders": typeof api_replenishment_purchaseHeaders;
  "api/replenishment/purchaseLines": typeof api_replenishment_purchaseLines;
  "api/replenishment/transferHeaders": typeof api_replenishment_transferHeaders;
  "api/replenishment/transferLines": typeof api_replenishment_transferLines;
  "api/replenishment/vendors": typeof api_replenishment_vendors;
  "api/trace/shipmentLines": typeof api_trace_shipmentLines;
  "api/trace/shipmentMethods": typeof api_trace_shipmentMethods;
  "api/trace/shipments": typeof api_trace_shipments;
  engine: typeof engine;
  functions: typeof functions;
  seed: typeof seed;
  utils: typeof utils;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  aggregate: {
    btree: {
      aggregateBetween: FunctionReference<
        "query",
        "internal",
        { k1?: any; k2?: any; namespace?: any },
        { count: number; sum: number }
      >;
      aggregateBetweenBatch: FunctionReference<
        "query",
        "internal",
        { queries: Array<{ k1?: any; k2?: any; namespace?: any }> },
        Array<{ count: number; sum: number }>
      >;
      atNegativeOffset: FunctionReference<
        "query",
        "internal",
        { k1?: any; k2?: any; namespace?: any; offset: number },
        { k: any; s: number; v: any }
      >;
      atOffset: FunctionReference<
        "query",
        "internal",
        { k1?: any; k2?: any; namespace?: any; offset: number },
        { k: any; s: number; v: any }
      >;
      atOffsetBatch: FunctionReference<
        "query",
        "internal",
        {
          queries: Array<{
            k1?: any;
            k2?: any;
            namespace?: any;
            offset: number;
          }>;
        },
        Array<{ k: any; s: number; v: any }>
      >;
      get: FunctionReference<
        "query",
        "internal",
        { key: any; namespace?: any },
        null | { k: any; s: number; v: any }
      >;
      offset: FunctionReference<
        "query",
        "internal",
        { k1?: any; key: any; namespace?: any },
        number
      >;
      offsetUntil: FunctionReference<
        "query",
        "internal",
        { k2?: any; key: any; namespace?: any },
        number
      >;
      paginate: FunctionReference<
        "query",
        "internal",
        {
          cursor?: string;
          k1?: any;
          k2?: any;
          limit: number;
          namespace?: any;
          order: "asc" | "desc";
        },
        {
          cursor: string;
          isDone: boolean;
          page: Array<{ k: any; s: number; v: any }>;
        }
      >;
      paginateNamespaces: FunctionReference<
        "query",
        "internal",
        { cursor?: string; limit: number },
        { cursor: string; isDone: boolean; page: Array<any> }
      >;
      validate: FunctionReference<
        "query",
        "internal",
        { namespace?: any },
        any
      >;
    };
    inspect: {
      display: FunctionReference<"query", "internal", { namespace?: any }, any>;
      dump: FunctionReference<"query", "internal", { namespace?: any }, string>;
      inspectNode: FunctionReference<
        "query",
        "internal",
        { namespace?: any; node?: string },
        null
      >;
      listTreeNodes: FunctionReference<
        "query",
        "internal",
        { take?: number },
        Array<{
          _creationTime: number;
          _id: string;
          aggregate?: { count: number; sum: number };
          items: Array<{ k: any; s: number; v: any }>;
          subtrees: Array<string>;
        }>
      >;
      listTrees: FunctionReference<
        "query",
        "internal",
        { take?: number },
        Array<{
          _creationTime: number;
          _id: string;
          maxNodeSize: number;
          namespace?: any;
          root: string;
        }>
      >;
    };
    public: {
      clear: FunctionReference<
        "mutation",
        "internal",
        { maxNodeSize?: number; namespace?: any; rootLazy?: boolean },
        null
      >;
      delete_: FunctionReference<
        "mutation",
        "internal",
        { key: any; namespace?: any },
        null
      >;
      deleteIfExists: FunctionReference<
        "mutation",
        "internal",
        { key: any; namespace?: any },
        any
      >;
      init: FunctionReference<
        "mutation",
        "internal",
        { maxNodeSize?: number; namespace?: any; rootLazy?: boolean },
        null
      >;
      insert: FunctionReference<
        "mutation",
        "internal",
        { key: any; namespace?: any; summand?: number; value: any },
        null
      >;
      makeRootLazy: FunctionReference<
        "mutation",
        "internal",
        { namespace?: any },
        null
      >;
      replace: FunctionReference<
        "mutation",
        "internal",
        {
          currentKey: any;
          namespace?: any;
          newKey: any;
          newNamespace?: any;
          summand?: number;
          value: any;
        },
        null
      >;
      replaceOrInsert: FunctionReference<
        "mutation",
        "internal",
        {
          currentKey: any;
          namespace?: any;
          newKey: any;
          newNamespace?: any;
          summand?: number;
          value: any;
        },
        any
      >;
    };
  };
  tableEngine: {
    convex: {
      noSeries: {
        getNextCode: FunctionReference<
          "mutation",
          "internal",
          { code: string; incrementBy?: number; pattern?: string },
          string
        >;
        initSeries: FunctionReference<
          "mutation",
          "internal",
          { code: string; incrementBy?: number; pattern: string },
          null
        >;
        peekNextCode: FunctionReference<
          "query",
          "internal",
          { code: string },
          string
        >;
        resetSeries: FunctionReference<
          "mutation",
          "internal",
          { code: string; startAt?: number },
          null
        >;
      };
    };
  };
  seeder: {
    log: {
      clearLog: FunctionReference<"mutation", "internal", {}, null>;
      getSeedStatus: FunctionReference<"query", "internal", {}, any>;
      logSeed: FunctionReference<
        "mutation",
        "internal",
        { count: number; status: string; tableName: string },
        null
      >;
    };
  };
};
