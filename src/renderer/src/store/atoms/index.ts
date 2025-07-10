

// Added for P2P sync feature
import { atom } from 'jotai'

export interface AutoSyncedSkin {
  skinId: string
  championKey: string
  peerId: string
}

export const autoSyncedSkinsAtom = atom<AutoSyncedSkin[]>([])
export const peerSkinsAtom = atom<AutoSyncedSkin[]>([])
