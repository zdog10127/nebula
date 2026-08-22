export interface ElectronScreenShareSource {
  id: string
  name: string
  thumbnail: string | null
}

export interface ElectronUpdateInfo {
  version: string
}

export interface ElectronUpdateProgress {
  percent: number
}

declare global {
  interface Window {
    electronScreenShare?: {
      onSources: (callback: (sources: ElectronScreenShareSource[]) => void) => () => void
      choose: (sourceId: string | null) => void
    }
    electronUpdater?: {
      onAvailable: (callback: (info: ElectronUpdateInfo) => void) => () => void
      onNotAvailable: (callback: () => void) => () => void
      onProgress: (callback: (progress: ElectronUpdateProgress) => void) => () => void
      onDownloaded: (callback: (info: ElectronUpdateInfo) => void) => () => void
      onError: (callback: (message: string) => void) => () => void
      download: () => Promise<void>
      install: () => Promise<void>
      check: () => Promise<void>
    }
  }
}
