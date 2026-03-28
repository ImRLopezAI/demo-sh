/**
 * Catch-all page — delegates entirely to json-render.
 *
 * Following the @json-render/next pattern:
 *   createNextApp → { getPageData, generateMetadata, generateStaticParams }
 *   page.tsx re-exports metadata + staticParams, renders via PageRenderer.
 */
import { Suspense } from 'react'
import {
	generateMetadata,
	generateStaticParams,
	getPageData,
} from '@/lib/json-render/app'
import { JsonRenderPage } from '@/lib/json-render/page-renderer-wrapper'

export { generateMetadata, generateStaticParams }
export default function Page(props: PageProps<'/[[...slug]]'>) {
	return (
		<Suspense>
			<PageContent {...props} />
		</Suspense>
	)
}

async function PageContent(props: PageProps<'/[[...slug]]'>) {
	const pageData = await getPageData(props)
	if (!pageData) {
		const { NotFoundComponent } = await import(
			'@/components/layout/errors/not-found'
		)
		return <NotFoundComponent />
	}

	return (
		<JsonRenderPage
			spec={pageData.spec}
			initialState={pageData.initialState}
			layoutSpec={pageData.layoutSpec}
		/>
	)
}
