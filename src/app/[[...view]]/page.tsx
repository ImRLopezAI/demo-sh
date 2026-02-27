import { ModuleRoutePage } from '@/app/_shell/module-route-page'
import { NotFoundComponent } from '@/components/layout/errors/not-found'

interface CatchAllViewPageProps {
	params: {
		view?: string | string[]
	}
}

export default function CatchAllViewPage({ params }: CatchAllViewPageProps) {
	const segments = Array.isArray(params.view)
		? params.view
		: typeof params.view === 'string'
			? [params.view]
			: []

	if (segments.length === 0) {
		return <NotFoundComponent />
	}

	const [moduleId, ...viewSegments] = segments
	const viewId = viewSegments.length > 0 ? viewSegments.join('/') : 'dashboard'

	if (!moduleId || !viewId) {
		return <NotFoundComponent />
	}

	return <ModuleRoutePage moduleId={moduleId} viewId={viewId} />
}
