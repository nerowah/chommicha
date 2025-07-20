import { EventEmitter } from 'events'
import { lcuConnector } from './lcuConnector'
import { settingsService } from './settingsService'

interface ChampSelectSession {
  gameId: number
  localPlayerCellId: number
  myTeam: Array<{
    cellId: number
    championId: number
    championPickIntent: number
    summonerId: number
    assignedPosition: string
  }>
  actions: Array<
    Array<{
      id: number
      actorCellId: number
      type: string
      championId: number
      completed: boolean
      isInProgress: boolean
    }>
  >
}

export class GameflowMonitor extends EventEmitter {
  private currentPhase: string = 'None'
  private lastLockedChampionId: number | null = null
  private monitoringActive: boolean = false
  private sessionCheckInterval: NodeJS.Timeout | null = null

  constructor() {
    super()
    this.setupEventListeners()
  }

  async start(): Promise<void> {
    this.monitoringActive = true

    // Subscribe to gameflow phase changes
    await lcuConnector.subscribe('OnJsonApiEvent_lol-gameflow_v1_gameflow-phase')

    // Subscribe to lobby changes for early queue ID detection
    await lcuConnector.subscribe('OnJsonApiEvent_lol-lobby_v2_lobby')

    // Check current phase
    const currentPhase = await lcuConnector.getGameflowPhase()
    this.handlePhaseChange(currentPhase)
  }

  stop(): void {
    this.monitoringActive = false
    this.stopSessionMonitoring()

    // Unsubscribe from LCU events
    lcuConnector.unsubscribe('OnJsonApiEvent_lol-gameflow_v1_gameflow-phase')
    lcuConnector.unsubscribe('OnJsonApiEvent_lol-champ-select_v1_session')
    lcuConnector.unsubscribe('OnJsonApiEvent_lol-lobby_v2_lobby')

    // Reset state
    this.currentPhase = 'None'
    this.lastLockedChampionId = null
  }

  private setupEventListeners(): void {
    // Listen for gameflow phase changes
    lcuConnector.on('gameflow-phase', (phase: string) => {
      this.handlePhaseChange(phase)
    })

    // Listen for champion select session updates
    lcuConnector.on('champ-select-session', (session: ChampSelectSession) => {
      this.handleChampSelectUpdate(session)
    })

    // Listen for lobby session updates (for early queue ID detection)
    lcuConnector.on('lobby-session', (lobby: any) => {
      this.handleLobbyUpdate(lobby)
    })

    // Handle connection events
    lcuConnector.on('connected', () => {
      if (this.monitoringActive) {
        this.start()
      }
    })

    lcuConnector.on('disconnected', () => {
      this.currentPhase = 'None'
      this.lastLockedChampionId = null
      this.stopSessionMonitoring()
    })
  }

  private handlePhaseChange(phase: string): void {
    const previousPhase = this.currentPhase
    this.currentPhase = phase

    this.emit('phase-changed', phase, previousPhase)

    if (phase === 'ChampSelect') {
      this.startChampSelectMonitoring()
    } else if (phase === 'ReadyCheck') {
      this.handleReadyCheck()
    } else {
      this.stopSessionMonitoring()
      this.lastLockedChampionId = null
    }
  }

  private async startChampSelectMonitoring(): Promise<void> {
    // Subscribe to champion select session updates
    await lcuConnector.subscribe('OnJsonApiEvent_lol-champ-select_v1_session')

    // Get initial session state
    const session = await lcuConnector.getChampSelectSession()
    if (session) {
      this.handleChampSelectUpdate(session)
    }

    // Start polling as backup (some events might be missed)
    this.sessionCheckInterval = setInterval(async () => {
      if (this.currentPhase === 'ChampSelect') {
        const session = await lcuConnector.getChampSelectSession()
        if (session) {
          this.handleChampSelectUpdate(session)
        }
      }
    }, 1000)
  }

  private stopSessionMonitoring(): void {
    lcuConnector.unsubscribe('OnJsonApiEvent_lol-champ-select_v1_session')

    if (this.sessionCheckInterval) {
      clearInterval(this.sessionCheckInterval)
      this.sessionCheckInterval = null
    }
  }

  private async handleChampSelectUpdate(session: ChampSelectSession): Promise<void> {
    if (!session || !session.myTeam) {
      return
    }

    // Find local player
    const localPlayer = session.myTeam.find((player) => player.cellId === session.localPlayerCellId)
    if (!localPlayer) {
      return
    }

    const currentChampionId = localPlayer.championId || localPlayer.championPickIntent

    if (currentChampionId) {
      // Check if this champion is actually locked by checking the actions
      let isActuallyLocked = false

      if (session.actions && localPlayer.championId) {
        const allActions = session.actions.flat()
        const localPlayerPickAction = allActions.find(
          (action) =>
            action.actorCellId === session.localPlayerCellId &&
            action.type === 'pick' &&
            action.championId === localPlayer.championId
        )

        if (localPlayerPickAction) {
          isActuallyLocked = localPlayerPickAction.completed
        }
      }

      // Check if this is a newly locked champion
      if (isActuallyLocked && localPlayer.championId !== this.lastLockedChampionId) {
        this.lastLockedChampionId = localPlayer.championId

        // Get queue ID
        let queueId = null
        try {
          const gameflowSession = await lcuConnector.getGameflowSession()
          if (gameflowSession?.gameData?.queue?.id) {
            queueId = gameflowSession.gameData.queue.id
          }
        } catch (error) {
          console.log('Failed to get queue ID:', error)
        }

        this.emit('champion-selected', {
          championId: localPlayer.championId,
          isLocked: true,
          isHover: false,
          session: session,
          queueId: queueId
        })
      }
    }
  }

  private handleLobbyUpdate(lobby: any): void {
    if (!lobby?.gameConfig?.queueId) {
      return
    }

    const queueId = lobby.gameConfig.queueId

    // Emit lobby queue ID immediately when lobby is created/updated
    // This happens much earlier than champion select, providing instant queue detection
    this.emit('queue-id-detected', { queueId })
  }

  getCurrentPhase(): string {
    return this.currentPhase
  }

  isInChampSelect(): boolean {
    return this.currentPhase === 'ChampSelect'
  }

  private async handleReadyCheck(): Promise<void> {
    // Check if auto-accept is enabled
    const autoAcceptEnabled = settingsService.get('autoAcceptEnabled')

    if (!autoAcceptEnabled) {
      return
    }

    // Wait 2 seconds before accepting (like the reference implementation)
    setTimeout(async () => {
      try {
        // Make sure we're still in ReadyCheck phase
        const currentPhase = await lcuConnector.getGameflowPhase()
        if (currentPhase !== 'ReadyCheck') {
          return
        }

        // Accept the ready check
        await lcuConnector.request('POST', '/lol-matchmaking/v1/ready-check/accept')

        this.emit('ready-check-accepted')
      } catch (error) {
        console.error('[GameflowMonitor] Failed to auto-accept ready check:', error)
      }
    }, 2000)
  }
}

// Singleton instance
export const gameflowMonitor = new GameflowMonitor()
