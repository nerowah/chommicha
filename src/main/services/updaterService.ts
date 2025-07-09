import { autoUpdater, CancellationToken } from 'electron-updater'
import { BrowserWindow } from 'electron'
import axios from 'axios'

export class UpdaterService {
  private mainWindow: BrowserWindow | null = null
  private updateInfo: any = null
  private cancellationToken: CancellationToken | null = null

  constructor() {
    autoUpdater.autoDownload = false
    autoUpdater.autoRunAppAfterInstall = true

    this.setupEventListeners()
  }

  setMainWindow(window: BrowserWindow) {
    this.mainWindow = window
  }

  private setupEventListeners() {
    autoUpdater.on('checking-for-update', () => {
      this.sendToWindow('update-checking')
    })

    autoUpdater.on('update-available', (info) => {
      this.updateInfo = info
      this.sendToWindow('update-available', info)
    })

    autoUpdater.on('update-not-available', () => {
      this.sendToWindow('update-not-available')
    })

    autoUpdater.on('error', (err) => {
      this.sendToWindow('update-error', err.message)
    })

    autoUpdater.on('download-progress', (progressObj) => {
      this.sendToWindow('update-download-progress', progressObj)
    })

    autoUpdater.on('update-downloaded', () => {
      this.sendToWindow('update-downloaded')
      // Immediately quit and install
      autoUpdater.quitAndInstall(true, true)
    })
  }

  private sendToWindow(channel: string, data?: any) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, data)
    }
  }

  async checkForUpdates() {
    // Skip update check in development mode
    // if (is.dev) {
    //   console.log('Skipping update check in development mode')
    //   return null
    // }

    try {
      const result = await autoUpdater.checkForUpdates()
      return result
    } catch (error) {
      console.error('Error checking for updates:', error)
      throw error
    }
  }

  async downloadUpdate() {
    try {
      this.cancellationToken = new CancellationToken()
      await autoUpdater.downloadUpdate(this.cancellationToken)
    } catch (error) {
      console.error('Error downloading update:', error)
      throw error
    }
  }

  cancelUpdate() {
    if (this.cancellationToken) {
      this.cancellationToken.cancel()
      this.cancellationToken = null
    }
  }

  quitAndInstall() {
    autoUpdater.quitAndInstall()
  }

  async getChangelog(): Promise<string | null> {
    try {
      if (!this.updateInfo || !this.updateInfo.version) {
        return null
      }

      const owner = 'hoangvu12'
      const repo = 'chommicha'
      const version = this.updateInfo.version

      // Try to fetch changes.md from the GitHub release
      const url = `https://raw.githubusercontent.com/${owner}/${repo}/v${version}/changes.md`

      try {
        const response = await axios.get(url)
        return response.data
      } catch {
        // If not found in release tag, try main branch
        const mainUrl = `https://raw.githubusercontent.com/${owner}/${repo}/main/changes.md`
        const response = await axios.get(mainUrl)
        return response.data
      }
    } catch (error) {
      console.error('Error fetching changelog:', error)
      return null
    }
  }

  getUpdateInfo() {
    return this.updateInfo
  }
}
