export async function downloadBinaryPayload(
	payload: unknown,
	fallbackFilename: string,
) {
	let blob: Blob | null = null
	let filename = fallbackFilename

	if (payload instanceof Blob) {
		blob = payload
		if ('name' in payload && typeof payload.name === 'string') {
			filename = payload.name
		}
	} else if (
		typeof payload === 'object' &&
		payload !== null &&
		'arrayBuffer' in payload &&
		typeof payload.arrayBuffer === 'function'
	) {
		const typedPayload = payload as {
			arrayBuffer: () => Promise<ArrayBuffer>
			type?: string
			name?: string
		}
		const arrayBuffer = await typedPayload.arrayBuffer()
		blob = new Blob([arrayBuffer], {
			type: typedPayload.type ?? 'application/octet-stream',
		})
		if (typeof typedPayload.name === 'string' && typedPayload.name.length > 0) {
			filename = typedPayload.name
		}
	}

	if (!blob) {
		throw new Error('Response payload is not a downloadable file')
	}

	const objectUrl = URL.createObjectURL(blob)
	const link = document.createElement('a')
	link.href = objectUrl
	link.download = filename
	document.body.appendChild(link)
	link.click()
	document.body.removeChild(link)
	URL.revokeObjectURL(objectUrl)
}
