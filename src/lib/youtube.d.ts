// Minimal ambient types for the YouTube IFrame Player API — just what NowPlayingWidget
// actually calls. Not pulling in @types/youtube to avoid an extra dependency for this.
//
// Everything lives inside `declare global` on purpose: this file has a top-level `export {}`
// (needed so it's treated as a module and doesn't leak into every other file), and once a
// .d.ts file is a module, a bare top-level `declare namespace` is scoped to that module only —
// it would NOT be visible as a global `YT` namespace elsewhere. `declare global { ... }` is
// the escape hatch that puts its contents back in the global scope regardless.
declare global {
  namespace YT {
    enum PlayerState {
      UNSTARTED = -1,
      ENDED = 0,
      PLAYING = 1,
      PAUSED = 2,
      BUFFERING = 3,
      CUED = 5,
    }

    interface PlayerEvent {
      target: Player
    }

    interface OnStateChangeEvent extends PlayerEvent {
      data: number
    }

    interface PlayerVars {
      autoplay?: 0 | 1
      mute?: 0 | 1
      controls?: 0 | 1
      disablekb?: 0 | 1
      fs?: 0 | 1
      modestbranding?: 0 | 1
      playsinline?: 0 | 1
      rel?: 0 | 1
      origin?: string
    }

    interface PlayerOptions {
      height?: string | number
      width?: string | number
      videoId?: string
      playerVars?: PlayerVars
      events?: {
        onReady?: (event: PlayerEvent) => void
        onStateChange?: (event: OnStateChangeEvent) => void
        onError?: (event: PlayerEvent & { data: number }) => void
      }
    }

    class Player {
      constructor(elementId: string | HTMLElement, options: PlayerOptions)
      playVideo(): void
      pauseVideo(): void
      mute(): void
      unMute(): void
      isMuted(): boolean
      seekTo(seconds: number, allowSeekAhead: boolean): void
      getCurrentTime(): number
      getPlayerState(): number
      destroy(): void
    }
  }

  interface Window {
    YT?: typeof YT
    onYouTubeIframeAPIReady?: () => void
  }
}

export {}
