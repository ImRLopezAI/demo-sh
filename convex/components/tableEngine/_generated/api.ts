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
import type * as convex__generated_api from '../convex/_generated/api.js'
import type * as convex__generated_server from '../convex/_generated/server.js'
import type * as convex_noSeries from '../convex/noSeries.js'
import type * as lib_engine from '../lib/engine.js'
import type * as lib_flowFields from '../lib/flowFields.js'
import type * as lib_index from '../lib/index.js'
import type * as lib_noSeries from '../lib/noSeries.js'
import type * as lib_queryHelpers from '../lib/queryHelpers.js'
import type * as lib_relations from '../lib/relations.js'
import type * as lib_types from '../lib/types.js'
import type * as lib_zod from '../lib/zod.js'
import type * as noSeries from '../noSeries.js'

const fullApi: ApiFromModules<{
	'convex/_generated/api': typeof convex__generated_api
	'convex/_generated/server': typeof convex__generated_server
	'convex/noSeries': typeof convex_noSeries
	'lib/engine': typeof lib_engine
	'lib/flowFields': typeof lib_flowFields
	'lib/index': typeof lib_index
	'lib/noSeries': typeof lib_noSeries
	'lib/queryHelpers': typeof lib_queryHelpers
	'lib/relations': typeof lib_relations
	'lib/types': typeof lib_types
	'lib/zod': typeof lib_zod
	noSeries: typeof noSeries
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

export const components = componentsGeneric() as unknown as {
	aggregate: {
		btree: {
			aggregateBetween: FunctionReference<
				'query',
				'internal',
				{ k1?: any; k2?: any; namespace?: any },
				{ count: number; sum: number }
			>
			aggregateBetweenBatch: FunctionReference<
				'query',
				'internal',
				{ queries: Array<{ k1?: any; k2?: any; namespace?: any }> },
				Array<{ count: number; sum: number }>
			>
			atNegativeOffset: FunctionReference<
				'query',
				'internal',
				{ k1?: any; k2?: any; namespace?: any; offset: number },
				{ k: any; s: number; v: any }
			>
			atOffset: FunctionReference<
				'query',
				'internal',
				{ k1?: any; k2?: any; namespace?: any; offset: number },
				{ k: any; s: number; v: any }
			>
			atOffsetBatch: FunctionReference<
				'query',
				'internal',
				{
					queries: Array<{
						k1?: any
						k2?: any
						namespace?: any
						offset: number
					}>
				},
				Array<{ k: any; s: number; v: any }>
			>
			get: FunctionReference<
				'query',
				'internal',
				{ key: any; namespace?: any },
				null | { k: any; s: number; v: any }
			>
			offset: FunctionReference<
				'query',
				'internal',
				{ k1?: any; key: any; namespace?: any },
				number
			>
			offsetUntil: FunctionReference<
				'query',
				'internal',
				{ k2?: any; key: any; namespace?: any },
				number
			>
			paginate: FunctionReference<
				'query',
				'internal',
				{
					cursor?: string
					k1?: any
					k2?: any
					limit: number
					namespace?: any
					order: 'asc' | 'desc'
				},
				{
					cursor: string
					isDone: boolean
					page: Array<{ k: any; s: number; v: any }>
				}
			>
			paginateNamespaces: FunctionReference<
				'query',
				'internal',
				{ cursor?: string; limit: number },
				{ cursor: string; isDone: boolean; page: Array<any> }
			>
			validate: FunctionReference<'query', 'internal', { namespace?: any }, any>
		}
		inspect: {
			display: FunctionReference<'query', 'internal', { namespace?: any }, any>
			dump: FunctionReference<'query', 'internal', { namespace?: any }, string>
			inspectNode: FunctionReference<
				'query',
				'internal',
				{ namespace?: any; node?: string },
				null
			>
			listTreeNodes: FunctionReference<
				'query',
				'internal',
				{ take?: number },
				Array<{
					_creationTime: number
					_id: string
					aggregate?: { count: number; sum: number }
					items: Array<{ k: any; s: number; v: any }>
					subtrees: Array<string>
				}>
			>
			listTrees: FunctionReference<
				'query',
				'internal',
				{ take?: number },
				Array<{
					_creationTime: number
					_id: string
					maxNodeSize: number
					namespace?: any
					root: string
				}>
			>
		}
		public: {
			clear: FunctionReference<
				'mutation',
				'internal',
				{ maxNodeSize?: number; namespace?: any; rootLazy?: boolean },
				null
			>
			delete_: FunctionReference<
				'mutation',
				'internal',
				{ key: any; namespace?: any },
				null
			>
			deleteIfExists: FunctionReference<
				'mutation',
				'internal',
				{ key: any; namespace?: any },
				any
			>
			init: FunctionReference<
				'mutation',
				'internal',
				{ maxNodeSize?: number; namespace?: any; rootLazy?: boolean },
				null
			>
			insert: FunctionReference<
				'mutation',
				'internal',
				{ key: any; namespace?: any; summand?: number; value: any },
				null
			>
			makeRootLazy: FunctionReference<
				'mutation',
				'internal',
				{ namespace?: any },
				null
			>
			replace: FunctionReference<
				'mutation',
				'internal',
				{
					currentKey: any
					namespace?: any
					newKey: any
					newNamespace?: any
					summand?: number
					value: any
				},
				null
			>
			replaceOrInsert: FunctionReference<
				'mutation',
				'internal',
				{
					currentKey: any
					namespace?: any
					newKey: any
					newNamespace?: any
					summand?: number
					value: any
				},
				any
			>
		}
	}
}
