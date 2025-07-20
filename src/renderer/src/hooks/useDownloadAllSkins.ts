import { useState, useCallback, useEffect, useMemo } from 'react'
import { useChampionData } from './useChampionData'

interface DownloadProgress {
  totalSkins: number
  completedSkins: number
  currentSkin: string | null
  currentProgress: number
  downloadSpeed: number
  timeRemaining: number
  failedSkins: string[]
  isRunning: boolean
  isPaused: boolean
}

interface DownloadOptions {
  excludeChromas: boolean
  excludeVariants: boolean
  excludeLegacy: boolean
  excludeEsports: boolean
  onlyFavorites: boolean
  concurrency: number
}

export function useDownloadAllSkins() {
  const { championData } = useChampionData()
  const [isOptionsDialogOpen, setIsOptionsDialogOpen] = useState(false)
  const [isProgressDialogOpen, setIsProgressDialogOpen] = useState(false)
  const [progress, setProgress] = useState<DownloadProgress>({
    totalSkins: 0,
    completedSkins: 0,
    currentSkin: null,
    currentProgress: 0,
    downloadSpeed: 0,
    timeRemaining: 0,
    failedSkins: [],
    isRunning: false,
    isPaused: false
  })

  // Set up progress listener
  useEffect(() => {
    const unsubscribe = window.api.onDownloadAllSkinsProgress((progressData) => {
      setProgress(progressData)
    })

    return () => {
      unsubscribe()
    }
  }, [])

  const getAllSkinUrls = useCallback(
    (
      options: DownloadOptions = {
        excludeChromas: false,
        excludeVariants: false,
        excludeLegacy: false,
        excludeEsports: false,
        onlyFavorites: false,
        concurrency: 3
      }
    ): string[] => {
      if (!championData) return []

      const urls: string[] = []

      for (const champion of championData.champions) {
        for (const skin of champion.skins) {
          // Skip base skins (usually skin ID 0)
          if (skin.num === 0) continue

          // Filter by skin type
          if (options.excludeLegacy && skin.isLegacy) continue
          if (
            options.excludeEsports &&
            (skin.skinLines?.some((line) => [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].includes(line.id)) || // Popular esports line IDs
              skin.name.toLowerCase().includes('championship') ||
              skin.name.toLowerCase().includes('worlds') ||
              skin.name.toLowerCase().includes('msi') ||
              skin.name.toLowerCase().includes('lcs') ||
              skin.name.toLowerCase().includes('lec') ||
              skin.name.toLowerCase().includes('lck') ||
              skin.name.toLowerCase().includes('lpl'))
          )
            continue

          // Filter variants (skins with slashes or special naming patterns)
          if (
            options.excludeVariants &&
            (skin.name.includes('/') ||
              skin.name.includes('Prestige') ||
              skin.name.includes('Chroma') ||
              skin.name.includes('Border') ||
              skin.name.includes('Variant'))
          )
            continue

          // Use the English name or fallback to localized name for URL generation
          const championKey = champion.key
          const skinName = skin.nameEn || skin.name

          // Generate GitHub URL for skin
          const encodedChampionKey = encodeURIComponent(championKey)
          const encodedSkinName = encodeURIComponent(`${skinName}.zip`)
          const url = `https://github.com/darkseal-org/lol-skins/blob/main/skins/${encodedChampionKey}/${encodedSkinName}`

          urls.push(url)

          // Add chromas if they exist and not excluded
          if (!options.excludeChromas && skin.chromas && skin.chromaList) {
            for (const chroma of skin.chromaList) {
              const chromaName = `${skinName} ${chroma.id}.zip`
              const encodedChromaName = encodeURIComponent(chromaName)
              const chromaUrl = `https://github.com/darkseal-org/lol-skins/blob/main/skins/${encodedChampionKey}/chromas/${encodedSkinName.replace('.zip', '')}/${encodedChromaName}`
              urls.push(chromaUrl)
            }
          }
        }
      }

      return urls
    },
    [championData]
  )

  // Calculate total skin counts and estimated size
  const skinStats = useMemo(() => {
    if (!championData) return { totalCount: 0, estimatedSize: '0 MB' }

    const allUrls = getAllSkinUrls()
    const totalCount = allUrls.length
    const estimatedSize = `${Math.round(totalCount * 0.02)} MB` // Rough estimate of 150KB per skin

    return { totalCount, estimatedSize }
  }, [championData, getAllSkinUrls])

  const showOptionsDialog = useCallback(() => {
    setIsOptionsDialogOpen(true)
  }, [])

  const closeOptionsDialog = useCallback(() => {
    setIsOptionsDialogOpen(false)
  }, [])

  const startDownloadWithOptions = useCallback(
    async (options: DownloadOptions) => {
      const skinUrls = getAllSkinUrls(options)

      if (skinUrls.length === 0) {
        console.warn('No skins found to download')
        return
      }

      setIsProgressDialogOpen(true)

      try {
        const result = await window.api.downloadAllSkins(skinUrls, {
          excludeChromas: options.excludeChromas,
          concurrency: options.concurrency
        })

        if (!result.success) {
          console.error('Failed to start download:', result.error)
          // TODO: Show error toast
        }
      } catch (error) {
        console.error('Error starting download:', error)
        // TODO: Show error toast
      }
    },
    [getAllSkinUrls]
  )

  const pauseDownload = useCallback(async () => {
    try {
      await window.api.pauseBatchDownload()
    } catch (error) {
      console.error('Error pausing download:', error)
    }
  }, [])

  const resumeDownload = useCallback(async () => {
    try {
      await window.api.resumeBatchDownload()
    } catch (error) {
      console.error('Error resuming download:', error)
    }
  }, [])

  const cancelDownload = useCallback(async () => {
    try {
      await window.api.cancelBatchDownload()
      setIsProgressDialogOpen(false)
    } catch (error) {
      console.error('Error cancelling download:', error)
    }
  }, [])

  const retryFailedDownloads = useCallback(async () => {
    try {
      const result = await window.api.retryFailedDownloads()
      if (!result.success) {
        console.error('Failed to retry downloads:', result.error)
        // TODO: Show error toast
      }
    } catch (error) {
      console.error('Error retrying downloads:', error)
      // TODO: Show error toast
    }
  }, [])

  const closeProgressDialog = useCallback(() => {
    setIsProgressDialogOpen(false)
  }, [])

  // Auto-close progress dialog when download completes
  useEffect(() => {
    if (
      progress.totalSkins > 0 &&
      progress.completedSkins === progress.totalSkins &&
      !progress.isRunning
    ) {
      // Keep dialog open for a moment to show completion
      const timer = setTimeout(() => {
        setIsProgressDialogOpen(false)
      }, 3000)

      return () => clearTimeout(timer)
    }
    return undefined
  }, [progress])

  return {
    // Options dialog
    isOptionsDialogOpen,
    showOptionsDialog,
    closeOptionsDialog,

    // Progress dialog
    isProgressDialogOpen,
    progress,
    closeProgressDialog,

    // Download actions
    startDownloadWithOptions,
    pauseDownload,
    resumeDownload,
    cancelDownload,
    retryFailedDownloads,

    // Utility
    getAllSkinUrls,
    skinStats
  }
}
