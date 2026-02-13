import aggregate from '@convex-dev/aggregate/convex.config'
import { defineApp } from 'convex/server'
import seeder from './components/seeder/convex.config'
import tableEngine from './components/tableEngine/convex.config'

const app = defineApp()
app.use(aggregate)
app.use(tableEngine)
app.use(seeder)
export default app
