import { Volume2 } from 'lucide-react'
import { useVoiceCall } from '../voice/VoiceCallContext'
import VoiceCallStage from './VoiceCallStage'

// Mounted once, app-wide, from VoiceCallProvider itself — so entering fullscreen takes over
// the whole app (sidebars included), not just whichever channel view happens to be routed in.
export default function VoiceFullscreenOverlay() {
  const call = useVoiceCall()
  if (!call.isFullscreen || !call.channelId) return null

  const hasWatchedShare = call.availableShares.some((s) => call.watchedTrackSids.has(s.trackSid))

  if (hasWatchedShare) {
    // Immersive video-player mode: VoiceCallStage renders its own full-bleed layout with the
    // participant list/controls floating over the bottom of the video, so this wrapper just
    // hands it the entire viewport — no header bar or padding eating into the video, which is
    // exactly what made fullscreen not actually use the whole screen before.
    return (
      <div className="fixed inset-0 z-40 bg-black">
        <VoiceCallStage fullscreen />
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-canvas">
      <div className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-4">
        <Volume2 size={16} className="text-online" />
        <h3 className="text-[15px] font-semibold text-foreground">{call.channelName}</h3>
      </div>
      <div className="flex flex-1 items-center justify-center overflow-y-auto p-8">
        <VoiceCallStage fullscreen />
      </div>
    </div>
  )
}
