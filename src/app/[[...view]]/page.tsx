import { Suspense } from 'react'
import LandingPage from '@/app/_shell/_views'
import { ModuleRoutePage } from '@/app/_shell/module-route-page'
import { NotFoundComponent } from '@/components/layout/errors/not-found'

export function normalizeViewSegments(
	view: string | string[] | undefined,
): string[] {
	if (Array.isArray(view)) {
		return view
	}

	return typeof view === 'string' ? [view] : []
}

async function CatchAllViewContent({
	params,
}: PageProps<'/[[...view]]'>) {
	const { view } = await params
	const segments = normalizeViewSegments(view)

	if (segments.length === 0) {
		return <LandingPage />
	}

	const [moduleId, ...viewSegments] = segments
	const viewId = viewSegments.length > 0 ? viewSegments.join('/') : 'dashboard'

	if (!moduleId || !viewId) {
		return <NotFoundComponent />
	}

	return <ModuleRoutePage moduleId={moduleId} viewId={viewId} />
}

export default function CatchAllViewPage(props: PageProps<'/[[...view]]'>) {
	return (
		<Suspense>
			<CatchAllViewContent {...props} />
		</Suspense>
	)
}
