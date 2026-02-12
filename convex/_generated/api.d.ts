/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as engine from "../engine.js";
import type * as functions from "../functions.js";
import type * as items from "../items.js";
import type * as utils from "../utils.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  engine: typeof engine;
  functions: typeof functions;
  items: typeof items;
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
  tableEngine: {
    convex: {
      noSeries: {
        getNextCode: FunctionReference<
          "mutation",
          "internal",
          { code: string },
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
};
