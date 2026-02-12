import { defineComponent } from "convex/server"
import aggregate from "@convex-dev/aggregate/convex.config"

const component = defineComponent("tableEngine")
component.use(aggregate)
export default component
