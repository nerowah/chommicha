# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Chommicha is an Electron-based desktop application for managing League of Legends skins. It uses React with TypeScript for the UI and follows a standard three-process Electron architecture. The application is not affiliated with Riot Games and skins are client-side only.

## Common Development Commands

```bash
# Install dependencies (always use pnpm)
pnpm install

# Run in development mode
npm run dev

# Type checking (runs both node and web checks)
npm run typecheck

# Linting
npm run lint

# Format code with Prettier
npm run format

# Build for Windows
npm run build:win

# Build without packaging (for testing)
npm run build:unpack

# Fetch champion data from Riot API
npm run fetch-champion-data
```

## Architecture Overview

### Process Architecture

- **Main Process** (`src/main/`): Handles system operations, window management, and services
- **Renderer Process** (`src/renderer/`): React UI with TypeScript
- **Preload** (`src/preload/`): Secure bridge between main and renderer processes

### Key Services (Main Process)

All services are in `src/main/services/`:

- `gameDetector.ts`: Detects League of Legends installation
- `skinDownloader.ts`: Downloads and manages skins
- `modToolsWrapper.ts`: Interfaces with cslol-tools
- `championDataService.ts`: Manages champion metadata
- `favoritesService.ts`: User favorites functionality
- `settingsService.ts`: Application settings
- `updaterService.ts`: Auto-update functionality
- `lcuConnector.ts`: League Client connectivity
- `peerDiscovery.ts` & `peerSync.ts`: P2P sync functionality

### State Management

- Uses **Jotai** for atomic state management
- Main atoms in `src/renderer/src/store/atoms.ts`
- Categorized atoms in `src/renderer/src/store/atoms/`
- Settings persistence through main process service

### IPC Communication Pattern

- All IPC handlers defined in `src/main/index.ts`
- Exposed APIs in `src/preload/index.ts`
- Consistent response format: `{ success: boolean, data?: any, error?: string }`

### UI Stack

- **React 19** with TypeScript
- **Tailwind CSS** with custom theme configuration
- **i18next** for internationalization
- **Radix UI** primitives for accessible components
- **react-window** for virtualized lists
- **Sonner** for toast notifications
- Component library in `src/renderer/src/components/ui/`

### Supported Languages

- English (US) - en_US
- Vietnamese - vi_VN
- Spanish (Argentina) - es_AR
- Japanese - ja_JP
- Korean - ko_KR
- Russian - ru_RU
- Chinese (Simplified) - zh_CN

### Build Configuration

- **Vite** for development and building
- **electron-builder** for packaging (Windows NSIS installer)
- Path aliases: `@` for src directories, `@renderer` for renderer src
- Separate TypeScript configs for node and web contexts
- GitHub releases configured for auto-updates

### Code Style

- Prettier configuration: single quotes, no semicolons, 100 char width
- ESLint with Electron toolkit config
- Full TypeScript coverage across all processes

## Development Workflow

After implementing any feature or making significant changes, always run the following commands in order:

```bash
# 1. Type checking - ensures TypeScript compilation passes
npm run typecheck

# 2. Linting - checks code quality and style
npm run lint

# 3. Code formatting - ensures consistent formatting
npm run format
```

These commands help maintain code quality and catch potential issues early. Run them before committing changes or considering a feature complete.
