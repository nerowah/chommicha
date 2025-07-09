import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FixedSizeGrid as Grid } from 'react-window'
import type { Champion, Skin } from '../App'
import type { SelectedSkin } from '../store/atoms'
import { isOldFormatCustomId } from '../utils/customModId'
import { ChromaColorPie } from './ChromaColorPie'
import { ChromaSelectionDialog } from './ChromaSelectionDialog'
import { Button } from './ui/button'

interface VirtualizedSkinGridProps {
  skins: Array<{ champion: Champion; skin: Skin }>
  viewMode: 'compact' | 'comfortable' | 'spacious' | 'list'
  downloadedSkins: Array<{ championName: string; skinName: string; localPath?: string }>
  selectedSkins: SelectedSkin[]
  favorites: Set<string>
  loading: boolean
  onSkinClick: (champion: Champion, skin: Skin, chromaId?: string) => void
  onToggleFavorite: (champion: Champion, skin: Skin) => void
  onDeleteCustomSkin?: (skinPath: string, skinName: string) => void
  onEditCustomSkin?: (skinPath: string, currentName: string) => void
  containerWidth: number
  containerHeight: number
}

export const VirtualizedSkinGrid: React.FC<VirtualizedSkinGridProps> = ({
  skins,
  viewMode,
  downloadedSkins,
  selectedSkins,
  favorites,
  loading,
  onSkinClick,
  onToggleFavorite,
  onDeleteCustomSkin,
  onEditCustomSkin,
  containerWidth,
  containerHeight
}) => {
  const gridRef = useRef<Grid>(null)
  const [chromaDialogState, setChromaDialogState] = useState<{
    open: boolean
    champion: Champion | null
    skin: Skin | null
  }>({ open: false, champion: null, skin: null })

  // Calculate grid dimensions based on view mode
  const { columnCount, columnWidth, rowHeight } = useMemo(() => {
    const gap = 24 // 6 * 4px (gap-6 in tailwind)
    const padding = 64 // 8 * 8px (px-8 in tailwind)
    const availableWidth = containerWidth - padding

    let cols: number
    let itemWidth: number
    let itemHeight: number

    switch (viewMode) {
      case 'compact':
        // Match: grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10
        if (availableWidth >= 1280)
          cols = 10 // xl
        else if (availableWidth >= 1024)
          cols = 8 // lg
        else if (availableWidth >= 768)
          cols = 6 // md
        else if (availableWidth >= 640)
          cols = 4 // sm
        else cols = 3
        itemWidth = (availableWidth - gap * (cols - 1)) / cols
        itemHeight = itemWidth * 1.49 + 40 // aspect-[0.67] + padding
        break
      case 'comfortable':
        // Match: grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6
        if (availableWidth >= 1280)
          cols = 6 // xl
        else if (availableWidth >= 1024)
          cols = 5 // lg
        else if (availableWidth >= 768)
          cols = 4 // md
        else if (availableWidth >= 640)
          cols = 3 // sm
        else cols = 2
        itemWidth = (availableWidth - gap * (cols - 1)) / cols
        itemHeight = itemWidth * 1.49 + 56 // aspect-[0.67] + padding
        break
      case 'spacious':
        // Match: grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4
        if (availableWidth >= 1024)
          cols = 4 // lg
        else if (availableWidth >= 768)
          cols = 3 // md
        else if (availableWidth >= 640)
          cols = 2 // sm
        else cols = 1
        itemWidth = (availableWidth - gap * (cols - 1)) / cols
        itemHeight = itemWidth * 1.49 + 80 // aspect-[0.67] + padding
        break
      default:
        cols = 1
        itemWidth = availableWidth
        itemHeight = 80 // List view height
    }

    return {
      columnCount: cols,
      columnWidth: itemWidth + gap,
      rowHeight: itemHeight + gap
    }
  }, [viewMode, containerWidth])

  const rowCount = Math.ceil(skins.length / columnCount)
  const [customImages, setCustomImages] = useState<Record<string, string>>({})

  const getSkinImageUrl = useCallback(
    (championKey: string, skinNum: number, skinId: string, modPath?: string) => {
      // Check if it's a custom skin (either in Custom section or with custom ID)
      if (modPath && customImages[modPath]) {
        return customImages[modPath]
      }

      if (championKey === 'Custom' || skinId.startsWith('custom_')) {
        // Return a placeholder image for custom mods without custom image
        return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzA4IiBoZWlnaHQ9IjU2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iMzA4IiBoZWlnaHQ9IjU2MCIgZmlsbD0iIzM3NDE1MSIvPgogIDx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iNDgiIGZpbGw9IiNhMGE0YWIiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiPkN1c3RvbTwvdGV4dD4KPC9zdmc+'
      }
      return `https://ddragon.leagueoflegends.com/cdn/img/champion/loading/${championKey}_${skinNum}.jpg`
    },
    [customImages]
  )

  // Load custom images
  useEffect(() => {
    const loadCustomImages = async () => {
      // Find all custom skins (both in Custom section and champion sections)
      const customSkins = skins.filter(
        (s) => s.champion.key === 'Custom' || s.skin.id.startsWith('custom_')
      )

      for (const { champion, skin } of customSkins) {
        const modPath = downloadedSkins.find(
          (ds) =>
            ds.skinName.startsWith('[User]') &&
            ds.skinName.includes(skin.name) &&
            (champion.key === 'Custom' || ds.championName === champion.key)
        )?.localPath

        if (modPath) {
          const result = await window.api.getCustomSkinImage(modPath)
          if (result.success && result.imageUrl) {
            setCustomImages((prev) => ({ ...prev, [modPath]: result.imageUrl! }))
          }
        }
      }
    }

    loadCustomImages()
  }, [skins, downloadedSkins])

  const Cell = useCallback(
    ({ columnIndex, rowIndex, style }) => {
      const index = rowIndex * columnCount + columnIndex
      if (index >= skins.length) return null

      const { champion, skin } = skins[index]
      const skinFileName = `${skin.lolSkinsName || skin.nameEn || skin.name}.zip`.replace(/:/g, '')
      const downloadedSkin = downloadedSkins.find((ds) => {
        if (champion.key === 'Custom') {
          // For custom mods, match by [User] prefix and skin name
          return ds.skinName.startsWith('[User]') && ds.skinName.includes(skin.name)
        }
        return (
          ds.championName === champion.key &&
          (ds.skinName === skinFileName ||
            (ds.skinName.includes(`[User]`) && ds.skinName.includes(skin.name)))
        )
      })
      const isDownloaded = !!downloadedSkin
      const isUserSkin = downloadedSkin?.skinName?.includes('[User]')
      const isFavorite = favorites.has(`${champion.key}_${skin.id}`)
      const isSelected = selectedSkins.some((s) => {
        // Direct match
        if (s.championKey === champion.key && s.skinId === skin.id && !s.chromaId) {
          return true
        }

        // Backward compatibility: check if old format ID matches current skin
        if (
          skin.id.startsWith('custom_') &&
          s.skinId.startsWith('custom_') &&
          isOldFormatCustomId(s.skinId) &&
          s.championKey === champion.key &&
          s.skinName === skin.name &&
          !s.chromaId
        ) {
          return true
        }

        return false
      })

      // Adjust style to account for gap
      const adjustedStyle = {
        ...style,
        left: style.left + 32, // Add padding
        top: style.top + 24, // Add padding for search bar
        width: style.width - 24, // Subtract gap
        height: style.height - 24 // Subtract gap
      }

      const chromas = skin.chromaList || []

      if (viewMode === 'list') {
        return (
          <div style={adjustedStyle}>
            <div
              className={`flex items-center gap-4 p-3 bg-surface rounded-lg transition-all duration-200 cursor-pointer border-2
                ${
                  isSelected
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/20'
                    : 'border-border hover:border-border-strong hover:shadow-md dark:hover:shadow-dark-soft'
                }`}
              onClick={() => !loading && onSkinClick(champion, skin)}
            >
              <img
                src={getSkinImageUrl(champion.key, skin.num, skin.id, downloadedSkin?.localPath)}
                alt={skin.name}
                className="w-16 h-16 object-cover rounded"
                loading="lazy"
              />
              <div className="flex-1">
                <p className="font-medium text-text-primary">{skin.name}</p>
                <p className="text-sm text-text-secondary">{champion.name}</p>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                    isSelected ? 'bg-primary-500 border-primary-500' : 'bg-surface border-border'
                  }`}
                >
                  {isSelected && (
                    <svg
                      className="w-3 h-3 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </div>
                {chromas.length > 0 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-8 h-8 p-1 bg-surface hover:bg-secondary-100 dark:hover:bg-secondary-800 border border-border"
                    onClick={(e) => {
                      e.stopPropagation()
                      setChromaDialogState({ open: true, champion, skin })
                    }}
                    title={`${chromas.length} chromas available`}
                  >
                    <ChromaColorPie
                      colors={chromas.map((c) => c.colors[0])}
                      size={24}
                      className=""
                    />
                  </Button>
                )}
                {/* Rarity gem for list view */}
                {skin.rarityGemPath && (
                  <img
                    src={skin.rarityGemPath}
                    alt={skin.rarity}
                    className="w-6 h-6 object-contain"
                  />
                )}
                {isDownloaded && (
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center ${
                      isUserSkin ? 'bg-blue-600' : 'bg-green-600'
                    }`}
                  >
                    <span className="text-white text-xs">{isUserSkin ? 'U' : '↓'}</span>
                  </span>
                )}
                <Button
                  variant={isFavorite ? 'secondary' : 'ghost'}
                  size="icon"
                  className={`w-8 h-8 rounded-full ${
                    isFavorite
                      ? 'bg-red-100 dark:bg-red-900/30 text-red-500 hover:bg-red-200 dark:hover:bg-red-900/40'
                      : ''
                  }`}
                  onClick={(e) => {
                    e.stopPropagation()
                    onToggleFavorite(champion, skin)
                  }}
                >
                  {isFavorite ? '❤️' : '🤍'}
                </Button>
                {/* Edit and Delete buttons for custom mods in list view */}
                {(champion.key === 'Custom' || skin.id.startsWith('custom_')) &&
                  downloadedSkin &&
                  isUserSkin && (
                    <>
                      {onEditCustomSkin && (
                        <Button
                          variant="default"
                          size="icon"
                          className="w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-700"
                          onClick={(e) => {
                            e.stopPropagation()
                            onEditCustomSkin(downloadedSkin.localPath!, skin.name)
                          }}
                          title="Edit custom mod"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                        </Button>
                      )}
                      {onDeleteCustomSkin && (
                        <Button
                          variant="destructive"
                          size="icon"
                          className="w-8 h-8 rounded-full"
                          onClick={(e) => {
                            e.stopPropagation()
                            if (confirm(`Are you sure you want to delete "${skin.name}"?`)) {
                              onDeleteCustomSkin(downloadedSkin.localPath!, downloadedSkin.skinName)
                            }
                          }}
                          title="Delete custom mod"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </Button>
                      )}
                    </>
                  )}
              </div>
            </div>
          </div>
        )
      }

      // Card views
      return (
        <div style={adjustedStyle}>
          <div
            className={`group relative bg-surface rounded-xl overflow-hidden transform transition-all duration-300 ease-out border-2
              ${
                isSelected
                  ? 'border-primary-500 shadow-xl dark:shadow-dark-large scale-[1.02]'
                  : 'border-border hover:shadow-xl dark:hover:shadow-dark-large shadow-md dark:shadow-dark-soft hover:-translate-y-1 hover:scale-[1.02] hover:border-border-strong'
              } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            <div
              className="relative aspect-[0.67] overflow-hidden bg-secondary-100 dark:bg-secondary-900"
              onClick={() => !loading && onSkinClick(champion, skin)}
            >
              <img
                src={getSkinImageUrl(champion.key, skin.num, skin.id, downloadedSkin?.localPath)}
                alt={skin.name}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
              <div className="absolute top-2 left-2 px-2 py-1 bg-black bg-opacity-75 backdrop-blur-sm rounded-lg text-xs text-white font-medium transform transition-all duration-300 group-hover:scale-105">
                {champion.name}
              </div>
              {isSelected && (
                <div className="absolute top-2 right-2 w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center shadow-lg transform transition-all duration-300 group-hover:scale-110">
                  <svg
                    className="w-5 h-5 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
              )}
              {isDownloaded && !isSelected && (
                <div
                  className={`absolute bottom-2 right-2 w-6 h-6 rounded-full flex items-center justify-center shadow-soft transform transition-all duration-300 group-hover:scale-110 ${
                    isUserSkin ? 'bg-blue-600' : 'bg-green-600'
                  }`}
                  title={isUserSkin ? 'User Import' : 'Downloaded'}
                >
                  <span className="text-white text-xs">{isUserSkin ? 'U' : '↓'}</span>
                </div>
              )}
              <Button
                variant="ghost"
                size="icon"
                className={`absolute bottom-2 left-2 w-8 h-8 rounded-full transition-all
                    ${
                      isFavorite
                        ? 'bg-white/10 backdrop-blur-sm text-red-500 hover:bg-white/20'
                        : 'bg-white/10 backdrop-blur-sm text-white/70 hover:text-white hover:bg-white/20'
                    }`}
                onClick={(e) => {
                  e.stopPropagation()
                  onToggleFavorite(champion, skin)
                }}
                title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              >
                {isFavorite ? '❤️' : '🤍'}
              </Button>
              {/* Floating chroma button for grid mode */}
              {chromas.length > 0 && (
                <div
                  className="absolute bottom-2 left-12 w-8 h-8 rounded-full bg-white dark:bg-charcoal-800 backdrop-blur-sm hover:bg-charcoal-50 dark:hover:bg-charcoal-700 transition-all cursor-pointer shadow-lg flex items-center justify-center ring-2 ring-white dark:ring-charcoal-700"
                  onClick={(e) => {
                    e.stopPropagation()
                    setChromaDialogState({ open: true, champion, skin })
                  }}
                  title={`${chromas.length} chromas available`}
                >
                  <ChromaColorPie colors={chromas.map((c) => c.colors[0])} size={28} className="" />
                </div>
              )}
              {/* Rarity gem */}
              {skin.rarityGemPath && (
                <div className="absolute bottom-2 left-[5.5rem] w-8 h-8">
                  <img
                    src={skin.rarityGemPath}
                    alt={skin.rarity}
                    className="w-full h-full object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
                  />
                </div>
              )}
              {/* Edit and Delete buttons for custom mods */}
              {(champion.key === 'Custom' || skin.id.startsWith('custom_')) &&
                downloadedSkin &&
                isUserSkin && (
                  <>
                    {onEditCustomSkin && (
                      <Button
                        variant="default"
                        size="icon"
                        className="absolute top-2 right-2 w-6 h-6 rounded-full bg-blue-600/90 hover:bg-blue-700 opacity-0 group-hover:opacity-100 shadow-lg"
                        onClick={(e) => {
                          e.stopPropagation()
                          onEditCustomSkin(downloadedSkin.localPath!, skin.name)
                        }}
                        title="Edit custom mod"
                      >
                        <svg
                          className="w-3 h-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2.5}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                      </Button>
                    )}
                    {onDeleteCustomSkin && (
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-10 right-2 w-6 h-6 rounded-full opacity-0 group-hover:opacity-100 shadow-lg"
                        onClick={(e) => {
                          e.stopPropagation()
                          if (confirm(`Are you sure you want to delete "${skin.name}"?`)) {
                            onDeleteCustomSkin(downloadedSkin.localPath!, downloadedSkin.skinName)
                          }
                        }}
                        title="Delete custom mod"
                      >
                        <svg
                          className="w-3 h-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2.5}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </Button>
                    )}
                  </>
                )}
            </div>
            <div
              className={`bg-white dark:bg-charcoal-800 ${viewMode === 'spacious' ? 'p-4' : viewMode === 'comfortable' ? 'p-3' : 'p-2'} cursor-pointer hover:bg-charcoal-50 dark:hover:bg-charcoal-700 transition-colors`}
              onClick={(e) => {
                e.stopPropagation()
                !loading && onSkinClick(champion, skin)
              }}
            >
              <p
                className={`${viewMode === 'spacious' ? 'text-base' : viewMode === 'comfortable' ? 'text-sm' : 'text-xs'} font-semibold text-charcoal-900 dark:text-charcoal-100 truncate`}
              >
                {skin.name}
              </p>
            </div>
          </div>
        </div>
      )
    },
    [
      skins,
      columnCount,
      viewMode,
      downloadedSkins,
      selectedSkins,
      favorites,
      loading,
      onSkinClick,
      onToggleFavorite,
      onDeleteCustomSkin,
      onEditCustomSkin,
      getSkinImageUrl
    ]
  )

  return (
    <>
      <Grid
        ref={gridRef}
        columnCount={columnCount}
        columnWidth={columnWidth}
        height={containerHeight}
        rowCount={rowCount}
        rowHeight={rowHeight}
        width={containerWidth}
        className="scrollbar-thin scrollbar-thumb-charcoal-300 dark:scrollbar-thumb-charcoal-700 scrollbar-track-transparent"
      >
        {Cell}
      </Grid>

      {chromaDialogState.champion && chromaDialogState.skin && (
        <ChromaSelectionDialog
          open={chromaDialogState.open}
          onOpenChange={(open) => {
            if (!open) {
              setChromaDialogState({ open: false, champion: null, skin: null })
            }
          }}
          champion={chromaDialogState.champion}
          skin={chromaDialogState.skin}
          chromas={chromaDialogState.skin.chromaList || []}
          selectedSkins={selectedSkins}
          downloadedSkins={downloadedSkins}
          onChromaSelect={onSkinClick}
        />
      )}
    </>
  )
}
