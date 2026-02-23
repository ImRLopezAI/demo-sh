/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
	ApiFromModules,
	FilterApi,
	FunctionReference,
} from 'convex/server'
import { anyApi, componentsGeneric } from 'convex/server'
import type * as lib_generator from '../lib/generator.js'
import type * as lib_index from '../lib/index.js'
import type * as lib_introspect from '../lib/introspect.js'
import type * as lib_resolver from '../lib/resolver.js'
import type * as lib_seeder from '../lib/seeder.js'
import type * as lib_types from '../lib/types.js'
import type * as log from '../log.js'

const fullApi: ApiFromModules<{
	'lib/generator': typeof lib_generator
	'lib/index': typeof lib_index
	'lib/introspect': typeof lib_introspect
	'lib/resolver': typeof lib_resolver
	'lib/seeder': typeof lib_seeder
	'lib/types': typeof lib_types
	log: typeof log
}> = anyApi as any

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export const api: FilterApi<
	typeof fullApi,
	FunctionReference<any, 'public'>
> = anyApi as any

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export const internal: FilterApi<
	typeof fullApi,
	FunctionReference<any, 'internal'>
> = anyApi as any

export const components = componentsGeneric() as unknown as {}
