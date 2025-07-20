import { ElectronAPI } from '@electron-toolkit/preload'
import { SkinInfo } from '../main/types'

export interface IApi {
  detectGame: () => Promise<{ success: boolean; gamePath?: string | null; error?: string }>
  browseGameFolder: () => Promise<{ success: boolean; gamePath?: string }>
  downloadSkin: (url: string) => Promise<{ success: boolean; skinInfo?: SkinInfo; error?: string }>
  listDownloadedSkins: () => Promise<{ success: boolean; skins?: SkinInfo[]; error?: string }>
  deleteSkin: (
    championName: string,
    skinName: string
  ) => Promise<{ success: boolean; error?: string }>

  // Batch download management
  downloadAllSkins: (
    skinUrls: string[],
    options?: { excludeChromas?: boolean; concurrency?: number }
  ) => Promise<{ success: boolean; error?: string }>
  pauseBatchDownload: () => Promise<{ success: boolean; error?: string }>
  resumeBatchDownload: () => Promise<{ success: boolean; error?: string }>
  cancelBatchDownload: () => Promise<{ success: boolean; error?: string }>
  getBatchDownloadState: () => Promise<{
    success: boolean
    data?: {
      totalSkins: number
      completedSkins: number
      currentSkin: string | null
      currentProgress: number
      downloadSpeed: number
      timeRemaining: number
      failedSkins: string[]
      isRunning: boolean
      isPaused: boolean
    } | null
    error?: string
  }>
  onDownloadAllSkinsProgress: (
    callback: (progress: {
      totalSkins: number
      completedSkins: number
      currentSkin: string | null
      currentProgress: number
      downloadSpeed: number
      timeRemaining: number
      failedSkins: string[]
      isRunning: boolean
      isPaused: boolean
    }) => void
  ) => () => void
  retryFailedDownloads: () => Promise<{ success: boolean; error?: string }>

  // File import
  importSkinFile: (
    filePath: string,
    options?: { championName?: string; skinName?: string; imagePath?: string }
  ) => Promise<{ success: boolean; skinInfo?: SkinInfo; error?: string }>
  importSkinFilesBatch: (filePaths: string[]) => Promise<{
    success: boolean
    totalFiles: number
    successCount: number
    failedCount: number
    results: Array<{
      filePath: string
      success: boolean
      skinInfo?: SkinInfo
      error?: string
    }>
  }>
  validateSkinFile: (filePath: string) => Promise<{ valid: boolean; error?: string }>
  browseSkinFile: () => Promise<{ success: boolean; filePath?: string }>
  browseSkinFiles: () => Promise<{ success: boolean; filePaths?: string[] }>
  browseImageFile: () => Promise<{ success: boolean; filePath?: string }>

  // File path helper
  getPathForFile: (file: File) => string

  runPatcher: (
    gamePath: string,
    selectedSkins: string[]
  ) => Promise<{ success: boolean; message?: string }>
  stopPatcher: () => Promise<{ success: boolean; error?: string }>
  isPatcherRunning: () => Promise<boolean>
  fetchChampionData: (
    language?: string
  ) => Promise<{ success: boolean; message: string; championCount?: number }>
  loadChampionData: (language?: string) => Promise<{ success: boolean; data?: any; error?: string }>
  checkChampionUpdates: (
    language?: string
  ) => Promise<{ success: boolean; needsUpdate?: boolean; error?: string }>

  // Favorites
  addFavorite: (
    championKey: string,
    skinId: string,
    skinName: string,
    chromaId?: string,
    chromaName?: string
  ) => Promise<{ success: boolean; error?: string }>
  removeFavorite: (
    championKey: string,
    skinId: string,
    chromaId?: string
  ) => Promise<{ success: boolean; error?: string }>
  isFavorite: (championKey: string, skinId: string, chromaId?: string) => Promise<boolean>
  getFavorites: () => Promise<{ success: boolean; favorites?: any[]; error?: string }>
  getFavoritesByChampion: (
    championKey: string
  ) => Promise<{ success: boolean; favorites?: any[]; error?: string }>

  // Tools management
  checkToolsExist: () => Promise<boolean>
  downloadTools: () => Promise<{ success: boolean; error?: string }>
  getToolsInfo: () => Promise<{
    success: boolean
    downloadUrl?: string
    version?: string
    error?: string
  }>
  onToolsDownloadProgress: (callback: (progress: number) => void) => () => void

  // Window controls
  minimizeWindow: () => void
  maximizeWindow: () => void
  closeWindow: () => void
  isWindowMaximized: () => Promise<boolean>

  // Settings
  getSettings: (key?: string) => Promise<any>
  setSettings: (key: string, value: any) => Promise<void>
  getSystemLocale: () => Promise<{ success: boolean; locale: string }>

  // Auto-updater
  checkForUpdates: () => Promise<{ success: boolean; updateInfo?: any; error?: string }>
  downloadUpdate: () => Promise<{ success: boolean; error?: string }>
  quitAndInstall: () => void
  cancelUpdate: () => Promise<{ success: boolean }>
  getUpdateChangelog: () => Promise<{ success: boolean; changelog?: string | null; error?: string }>
  getUpdateInfo: () => Promise<any>
  onUpdateChecking: (callback: () => void) => () => void
  onUpdateAvailable: (callback: (info: any) => void) => () => void
  onUpdateNotAvailable: (callback: () => void) => () => void
  onUpdateError: (callback: (error: string) => void) => () => void
  onUpdateDownloadProgress: (callback: (progress: any) => void) => () => void
  onUpdateDownloaded: (callback: () => void) => () => void

  // App info
  getAppVersion: () => Promise<string>

  // Custom skin images
  getCustomSkinImage: (
    modPath: string
  ) => Promise<{ success: boolean; imageUrl?: string | null; error?: string }>
  editCustomSkin: (
    modPath: string,
    newName: string,
    newImagePath?: string
  ) => Promise<{ success: boolean; error?: string }>
  deleteCustomSkin: (modPath: string) => Promise<{ success: boolean; error?: string }>

  // Patcher events
  onPatcherStatus: (callback: (status: string) => void) => () => void
  onPatcherMessage: (callback: (message: string) => void) => () => void
  onPatcherError: (callback: (error: string) => void) => () => void

  openExternal: (url: string) => Promise<{ success: boolean; error?: string }>

  // P2P File Transfer APIs
  getModFileInfo: (filePath: string) => Promise<{
    success: boolean
    data?: {
      fileName: string
      size: number
      hash: string
      mimeType: string
    }
    error?: string
  }>
  readFileChunk: (
    filePath: string,
    offset: number,
    length: number
  ) => Promise<{ success: boolean; data?: ArrayBuffer; error?: string }>
  prepareTempFile: (
    fileName: string
  ) => Promise<{ success: boolean; path?: string; error?: string }>
  writeFileFromChunks: (
    filePath: string,
    chunks: ArrayBuffer[],
    expectedHash: string
  ) => Promise<{ success: boolean; error?: string }>
  importFile: (
    filePath: string,
    options?: any
  ) => Promise<{ success: boolean; skinInfo?: SkinInfo; error?: string }>

  // LCU Connection APIs
  lcuConnect: () => Promise<{ success: boolean; error?: string }>
  lcuDisconnect: () => Promise<{ success: boolean }>
  lcuGetStatus: () => Promise<{ connected: boolean; gameflowPhase: string }>
  lcuGetCurrentPhase: () => Promise<{ success: boolean; phase?: string; error?: string }>
  lcuGetChampSelectSession: () => Promise<{ success: boolean; session?: any; error?: string }>
  lcuGetOwnedChampions: () => Promise<{ success: boolean; champions?: any[]; error?: string }>
  lcuGetAllChampions: () => Promise<{ success: boolean; champions?: any[]; error?: string }>

  // Auto Ban/Pick APIs
  setAutoPickChampions: (championIds: number[]) => Promise<{ success: boolean; error?: string }>
  setAutoBanChampions: (championIds: number[]) => Promise<{ success: boolean; error?: string }>

  // LCU Events
  onLcuConnected: (callback: () => void) => () => void
  onLcuDisconnected: (callback: () => void) => () => void
  onLcuPhaseChanged: (
    callback: (data: { phase: string; previousPhase: string }) => void
  ) => () => void
  onLcuChampionSelected: (
    callback: (data: { championId: number; isLocked: boolean; isHover: boolean }) => void
  ) => () => void
  onLcuReadyCheckAccepted: (callback: () => void) => () => void
  onLcuQueueIdDetected: (callback: (data: { queueId: number }) => void) => () => void

  // Team Composition APIs
  getTeamComposition: () => Promise<{
    success: boolean
    composition?: { championIds: number[]; allLocked: boolean; inFinalization: boolean }
    error?: string
  }>
  isReadyForSmartApply: () => Promise<{ success: boolean; ready?: boolean; error?: string }>
  getSmartApplySummary: (
    selectedSkins: any[],
    teamChampionIds: number[],
    autoSyncedSkins?: any[]
  ) => Promise<{ success: boolean; summary?: any; error?: string }>
  smartApplySkins: (
    gamePath: string,
    selectedSkins: any[],
    teamChampionIds: number[],
    autoSyncedSkins?: any[]
  ) => Promise<{ success: boolean; summary?: any; error?: string }>

  // Team Composition Events
  onTeamCompositionUpdated: (
    callback: (composition: {
      championIds: number[]
      allLocked: boolean
      inFinalization: boolean
    }) => void
  ) => () => void
  onReadyForSmartApply: (
    callback: (composition: {
      championIds: number[]
      allLocked: boolean
      inFinalization: boolean
    }) => void
  ) => () => void
  onTeamReset: (callback: (newPhase?: string) => void) => () => void

  // Overlay management
  createOverlay: () => Promise<{ success: boolean; error?: string }>
  destroyOverlay: () => Promise<{ success: boolean; error?: string }>
  setOverlayAutoSelectedSkin: (skinData: {
    championKey: string
    championName: string
    skinId: string | number
    skinName: string
    skinNum: number
    rarity?: string
  }) => Promise<{ success: boolean; error?: string }>

  // MultiRitoFixes API
  checkMultiRitoFixTool: () => Promise<{ success: boolean; exists?: boolean; error?: string }>
  downloadMultiRitoFixTool: () => Promise<{ success: boolean; error?: string }>
  fixModIssues: (modPath: string) => Promise<{ success: boolean; error?: string; output?: string }>
  onMultiRitoFixDownloadProgress: (callback: (progress: number) => void) => () => void
  onFixModProgress: (callback: (message: string) => void) => () => void

  // Settings change events from tray
  onSettingsChanged: (callback: (key: string, value: any) => void) => () => void
  onOpenSettings: (callback: () => void) => () => void
  onLanguageChanged: (callback: (language: string) => void) => () => void

  // Skin update management
  checkSkinUpdates: (
    skinPaths?: string[]
  ) => Promise<{ success: boolean; data?: Record<string, any>; error?: string }>
  updateSkin: (skinInfo: SkinInfo) => Promise<{ success: boolean; data?: SkinInfo; error?: string }>
  bulkUpdateSkins: (skinInfos: SkinInfo[]) => Promise<{
    success: boolean
    data?: { updated: SkinInfo[]; failed: Array<{ skin: SkinInfo; error: string }> }
    error?: string
  }>
  generateMetadataForExistingSkins: () => Promise<{ success: boolean; error?: string }>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: IApi
  }
}
