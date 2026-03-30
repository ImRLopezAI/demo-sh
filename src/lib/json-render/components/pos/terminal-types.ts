import type { usePosTerminal } from './use-pos-terminal'

export type PosTerminalReturn = ReturnType<typeof usePosTerminal>
export type Action = Parameters<PosTerminalReturn['dispatch']>[0]
