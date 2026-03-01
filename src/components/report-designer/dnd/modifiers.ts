import { snap } from '../utils'

export function snapPositionToGrid(
	x: number,
	y: number,
	gridSize: number,
): { x: number; y: number } {
	return {
		x: snap(x, gridSize),
		y: snap(y, gridSize),
	}
}
