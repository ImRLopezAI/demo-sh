/* eslint-disable */
import type {
	QueryBuilder,
	MutationBuilder,
	ActionBuilder,
	HttpActionBuilder,
} from 'convex/server'

export declare const query: QueryBuilder<any, 'public'>
export declare const internalQuery: QueryBuilder<any, 'internal'>
export declare const mutation: MutationBuilder<any, 'public'>
export declare const internalMutation: MutationBuilder<any, 'internal'>
export declare const action: ActionBuilder<any, 'public'>
export declare const internalAction: ActionBuilder<any, 'internal'>
export declare const httpAction: HttpActionBuilder
