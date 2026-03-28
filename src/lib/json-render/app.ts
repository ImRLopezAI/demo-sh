/**
 * json-render Next.js App Setup
 *
 * Creates the server-side utilities from the unified spec.
 * The Page component is built in the catch-all route file
 * using getPageData + PageRenderer.
 */
import { createNextApp } from '@json-render/next/server'
import { spec } from './specs'

export const { getPageData, generateMetadata, generateStaticParams } =
	createNextApp({ spec })
