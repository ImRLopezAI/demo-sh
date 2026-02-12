import { defineApp } from "convex/server"
import tableEngine from "./components/tableEngine/convex.config"

const app = defineApp()
app.use(tableEngine)
export default app
