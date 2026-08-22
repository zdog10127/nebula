// Lazily loads the YouTube IFrame Player API script exactly once, no matter how many
// components ask for it concurrently. Used by NowPlayingWidget to control playback
// imperatively (mute/unmute/seek) without ever remounting the player — remounting on every
// mute toggle was the root cause of the "toca e trava" freeze bug with the old raw <iframe>.
let apiPromise: Promise<typeof YT> | null = null

export function loadYoutubeIframeApi(): Promise<typeof YT> {
  if (apiPromise) return apiPromise

  apiPromise = new Promise((resolve) => {
    if (window.YT?.Player) {
      resolve(window.YT)
      return
    }

    const previousCallback = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      previousCallback?.()
      resolve(window.YT!)
    }

    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const script = document.createElement('script')
      script.src = 'https://www.youtube.com/iframe_api'
      script.async = true
      document.head.appendChild(script)
    }
  })

  return apiPromise
}
