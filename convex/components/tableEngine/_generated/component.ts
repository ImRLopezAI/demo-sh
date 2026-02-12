/* eslint-disable */
/**
 * Generated `ComponentApi` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type { FunctionReference } from "convex/server";

/**
 * A utility for referencing a Convex component's exposed API.
 *
 * Useful when expecting a parameter like `components.myComponent`.
 * Usage:
 * ```ts
 * async function myFunction(ctx: QueryCtx, component: ComponentApi) {
 *   return ctx.runQuery(component.someFile.someQuery, { ...args });
 * }
 * ```
 */
export type ComponentApi<Name extends string | undefined = string | undefined> =
  {
    convex: {
      noSeries: {
        getNextCode: FunctionReference<
          "mutation",
          "internal",
          { code: string; incrementBy?: number; pattern?: string },
          string,
          Name
        >;
        initSeries: FunctionReference<
          "mutation",
          "internal",
          { code: string; incrementBy?: number; pattern: string },
          null,
          Name
        >;
        peekNextCode: FunctionReference<
          "query",
          "internal",
          { code: string },
          string,
          Name
        >;
        resetSeries: FunctionReference<
          "mutation",
          "internal",
          { code: string; startAt?: number },
          null,
          Name
        >;
      };
    };
  };
