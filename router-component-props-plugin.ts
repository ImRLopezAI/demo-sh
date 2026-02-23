import type { Plugin } from 'vite'

const routeComponentPropsTypes = `declare module '@tanstack/react-router' {
  type RoutePath = keyof FileRoutesByPath

  type PreLoaderRoute<TPath extends RoutePath> =
    FileRoutesByPath[TPath]['preLoaderRoute']

  type LoaderDataFor<TPath extends RoutePath> =
    PreLoaderRoute<TPath>['types']['loaderData']

  type ParamsFor<TPath extends RoutePath> =
    PreLoaderRoute<TPath>['types']['allParams']

  type SearchFor<TPath extends RoutePath> =
    PreLoaderRoute<TPath>['types']['fullSearchSchema']

  type ContextFor<TPath extends RoutePath> =
    PreLoaderRoute<TPath>['types']['allContext']

  export type RouteComponentPropsStrict<TPath extends RoutePath = RoutePath> = {
    route: PreLoaderRoute<TPath>
    match: AnyRouteMatch & {
      routeId: PreLoaderRoute<TPath>['id']
      params: ParamsFor<TPath>
      search: SearchFor<TPath>
      context: ContextFor<TPath>
      loaderData: LoaderDataFor<TPath>
    }
    loaderData: LoaderDataFor<TPath>
    params: ParamsFor<TPath>
    search: SearchFor<TPath>
    context: ContextFor<TPath>
    location: ParsedLocation<{}>
    router: ReturnType<typeof import('@tanstack/react-router').useRouter>
    state: ReturnType<typeof import('@tanstack/react-router').useRouterState>
  }

  export type RouteComponentProps<TPath extends RoutePath = RoutePath> =
    RouteComponentPropsStrict<TPath>

  export function createFileRoute<
    TFilePath extends keyof FileRoutesByPath,
    TParentRoute extends AnyRoute = FileRoutesByPath[TFilePath]['parentRoute'],
    TId extends RouteConstraints['TId'] = FileRoutesByPath[TFilePath]['id'],
    TPath extends RouteConstraints['TPath'] = FileRoutesByPath[TFilePath]['path'],
    TFullPath extends RouteConstraints['TFullPath'] = FileRoutesByPath[TFilePath]['fullPath'],
  >(path?: TFilePath): <
    TRegister = Register,
    TSearchValidator = undefined,
    TParams = ResolveParams<TPath>,
    TRouteContextFn = AnyContext,
    TBeforeLoadFn = AnyContext,
    TLoaderDeps extends Record<string, any> = {},
    TLoaderFn = undefined,
    TChildren = unknown,
    TSSR = unknown,
    const TMiddlewares = unknown,
    THandlers = undefined
  >(
    options?: FileBaseRouteOptions<
      TRegister,
      TParentRoute,
      TId,
      TPath,
      TSearchValidator,
      TParams,
      TLoaderDeps,
      TLoaderFn,
      AnyContext,
      TRouteContextFn,
      TBeforeLoadFn,
      AnyContext,
      TSSR,
      TMiddlewares,
      THandlers
    > &
      Omit<
        UpdatableRouteOptions<
          TParentRoute,
          TId,
          TFullPath,
          TParams,
          TSearchValidator,
          TLoaderFn,
          TLoaderDeps,
          AnyContext,
          TRouteContextFn,
          TBeforeLoadFn
        >,
        'component'
      > & {
        component?:
          | RouteComponent
          | ((props: RouteComponentProps<TFilePath>) => any)
      }
  ) => Route<
    TRegister,
    TParentRoute,
    TPath,
    TFullPath,
    TFilePath,
    TId,
    TSearchValidator,
    TParams,
    AnyContext,
    TRouteContextFn,
    TBeforeLoadFn,
    TLoaderDeps,
    TLoaderFn,
    TChildren,
    unknown,
    TSSR,
    TMiddlewares,
    THandlers
  >
}`

const typeImportLine =
	"import type { AnyContext, AnyRoute, AnyRouteMatch, FileBaseRouteOptions, FileRoutesByPath, ParsedLocation, Register, ResolveParams, Route, RouteComponent, RouteConstraints, UpdatableRouteOptions } from '@tanstack/react-router'"
const reactImportLine = "import * as React from 'react'"
const useRouterStateImportLine =
	"import { useRouterState, useRouter } from '@tanstack/react-router'"
const attachCallLine = 'attachRouteComponentProps(routeTree)'

const runtimeHelperSource = `const wrappedRoutes = new WeakSet()
const wrappedComponents = new WeakSet()

function getRouteChildren(route) {
  const children = route?.children

  if (!children) return []
  if (Array.isArray(children)) return children
  if (typeof children === 'object') return Object.values(children)

  return []
}

function wrapComponent(route, Component) {
  if (wrappedComponents.has(Component)) {
    return Component
  }

  const Wrapped = function RouteComponentPropsWrapper() {
    const match = route.useMatch()
    const loaderData = route.useLoaderData()
    const router = useRouter()
    const state = useRouterState()

    const matchWithLoader = { ...match, loaderData }
    const props = {
      route,
      match: matchWithLoader,
      loaderData,
      params: match.params,
      search: match.search,
      context: match.context,
      location: state.location,
      router,
      state,
    }

    return React.createElement(Component, props)
  }

  const componentName =
    Component?.displayName || Component?.name || 'Anonymous'
  Wrapped.displayName = \`RouteComponentProps(\${componentName})\`
  if (Component?.preload) {
    Wrapped.preload = Component.preload
  }

  wrappedComponents.add(Wrapped)
  return Wrapped
}

function attachRouteComponentProps(route) {
  if (!route || typeof route !== 'object') {
    return
  }

  if (!wrappedRoutes.has(route)) {
    wrappedRoutes.add(route)
    const component = route.options?.component
    if (component) {
      route.update({
        component: wrapComponent(route, component),
      })
    }
  }

  for (const child of getRouteChildren(route)) {
    attachRouteComponentProps(child)
  }
}`

const footerLines = [
	typeImportLine,
	reactImportLine,
	routeComponentPropsTypes,
	useRouterStateImportLine,
	runtimeHelperSource,
	attachCallLine,
]

const runtimeFooterLines = [
	reactImportLine,
	useRouterStateImportLine,
	runtimeHelperSource,
	attachCallLine,
]

export function routeComponentPropsFooter(): Array<string> {
	return [...footerLines]
}

/**
 * Vite plugin that augments the generated route tree module with helpers to
 * inject fully typed RouteComponentProps into route components at runtime.
 *
 * When the target route tree file is transformed, it appends runtime helpers
 * (`attachRouteComponentProps`) plus the necessary React Router utilities so
 * route components receive match, loaderData, params, search, context, router,
 * and state props automatically. It skips transformation if the helper is
 * already present.
 *
 * @param options.routeTreeVarName Custom path suffix for the generated route tree file (default: `/routeTree.gen.ts`).
 * @returns Vite Plugin instance that post-processes the route tree module.
 */
export function routeComponentPropsVitePlugin(props?: {
	routeTreeVarName?: string
}): Plugin {
	const { routeTreeVarName = '/routeTree.gen.ts' } = props ?? {}
	return {
		name: 'router-component-props-vite',
		enforce: 'post',
		transform(code, id) {
			const [cleanId] = id.split('?')
			const normalizedId = cleanId.replace(/\\/g, '/')
			if (!normalizedId.endsWith(routeTreeVarName)) {
				return
			}
			if (code.includes(attachCallLine)) {
				return
			}

			const updated = `${code}\n\n${runtimeFooterLines.join('\n')}\n`
			return { code: updated, map: null }
		},
	}
}
