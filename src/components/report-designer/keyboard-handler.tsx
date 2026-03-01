'use client'

import * as React from 'react'
import { useShallow } from 'zustand/react/shallow'
import {
	redoDesignerHistory,
	undoDesignerHistory,
	useReportDesignerStore,
} from './store'

export function KeyboardHandler() {
	const {
		selectedBandId,
		selectedElementIds,
		copy,
		cut,
		paste,
		removeElements,
		selectAllInBand,
		nudgeSelected,
		duplicateElements,
	} = useReportDesignerStore(
		useShallow((state) => ({
			selectedBandId: state.selectedBandId,
			selectedElementIds: state.selectedElementIds,
			copy: state.copy,
			cut: state.cut,
			paste: state.paste,
			removeElements: state.removeElements,
			selectAllInBand: state.selectAllInBand,
			nudgeSelected: state.nudgeSelected,
			duplicateElements: state.duplicateElements,
		})),
	)

	React.useEffect(() => {
		function isEditableTarget(target: EventTarget | null): boolean {
			if (!(target instanceof HTMLElement)) return false
			const tag = target.tagName.toLowerCase()
			return (
				tag === 'input' ||
				tag === 'textarea' ||
				target.isContentEditable ||
				tag === 'select'
			)
		}

		function onKeyDown(event: KeyboardEvent) {
			if (isEditableTarget(event.target)) return
			const cmd = event.metaKey || event.ctrlKey

			if (cmd && event.key.toLowerCase() === 'z') {
				event.preventDefault()
				if (event.shiftKey) {
					redoDesignerHistory()
				} else {
					undoDesignerHistory()
				}
				return
			}
			if (cmd && event.key.toLowerCase() === 'y') {
				event.preventDefault()
				redoDesignerHistory()
				return
			}
			if (cmd && event.key.toLowerCase() === 'c') {
				event.preventDefault()
				copy()
				return
			}
			if (cmd && event.key.toLowerCase() === 'x') {
				event.preventDefault()
				cut()
				return
			}
			if (cmd && event.key.toLowerCase() === 'v') {
				event.preventDefault()
				if (selectedBandId) paste(selectedBandId)
				return
			}
			if (cmd && event.key.toLowerCase() === 'a') {
				event.preventDefault()
				if (selectedBandId) selectAllInBand(selectedBandId)
				return
			}
			if (cmd && event.key.toLowerCase() === 'd') {
				event.preventDefault()
				duplicateElements(selectedElementIds)
				return
			}
			if (event.key === 'Delete' || event.key === 'Backspace') {
				event.preventDefault()
				removeElements(selectedElementIds)
				return
			}
			if (event.key === 'ArrowLeft') {
				event.preventDefault()
				nudgeSelected(-4, 0)
				return
			}
			if (event.key === 'ArrowRight') {
				event.preventDefault()
				nudgeSelected(4, 0)
				return
			}
			if (event.key === 'ArrowUp') {
				event.preventDefault()
				nudgeSelected(0, -4)
				return
			}
			if (event.key === 'ArrowDown') {
				event.preventDefault()
				nudgeSelected(0, 4)
			}
		}

		window.addEventListener('keydown', onKeyDown)
		return () => window.removeEventListener('keydown', onKeyDown)
	}, [
		copy,
		cut,
		duplicateElements,
		nudgeSelected,
		paste,
		removeElements,
		selectAllInBand,
		selectedBandId,
		selectedElementIds,
	])

	return null
}
