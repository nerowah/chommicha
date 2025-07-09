import { app } from 'electron'
import * as path from 'path'
import * as fs from 'fs'

interface Settings {
  language?: string
  theme?: 'dark' | 'light'
  gamePath?: string
  [key: string]: any
}

export class SettingsService {
  private settingsPath: string
  private settings: Settings = {}

  constructor() {
    const userDataPath = app.getPath('userData')
    this.settingsPath = path.join(userDataPath, 'settings.json')
    this.load()
  }

  private load(): void {
    try {
      if (fs.existsSync(this.settingsPath)) {
        const data = fs.readFileSync(this.settingsPath, 'utf-8')
        this.settings = JSON.parse(data)
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
      this.settings = {}
    }
  }

  private save(): void {
    try {
      const dir = path.dirname(this.settingsPath)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
      fs.writeFileSync(this.settingsPath, JSON.stringify(this.settings, null, 2))
    } catch (error) {
      console.error('Failed to save settings:', error)
    }
  }

  get(key?: string): any {
    if (!key) {
      return this.settings
    }
    return this.settings[key]
  }

  set(key: string, value: any): void {
    this.settings[key] = value
    this.save()
  }

  delete(key: string): void {
    delete this.settings[key]
    this.save()
  }

  clear(): void {
    this.settings = {}
    this.save()
  }
}
