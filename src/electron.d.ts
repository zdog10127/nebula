export interface ElectronScreenShareSource {
  id: string
  name: string
  thumbnail: string | null
}

declare global {
  interface Window {
    electronScreenShare?: {
      onSources: (callback: (sources: ElectronScreenShareSource[]) => void) => () => void
      choose: (sourceId: string | null) => void
    }
  }
}
