import {
	mutation as rawMutation,
	query as rawQuery,
} from "./_generated/server"
import { engine } from "./engine"

export const { mutation, query } = engine.functions(
	rawMutation,
	rawQuery,
)
