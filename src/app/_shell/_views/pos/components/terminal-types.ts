import type { usePosTerminal } from '../hooks/use-pos-terminal'

export type PosTerminalReturn = ReturnType<typeof usePosTerminal>
export type Action = Parameters<PosTerminalReturn['dispatch']>[0]
