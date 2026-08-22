import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import ServerSidebar from '../components/ServerSidebar'
import { ChatHubProvider } from '../hubs/ChatHubContext'
import { ensureNotificationPermission } from '../lib/notify'
import { ProfileCardProvider } from '../lib/ProfileCardContext'
import { ServersProvider } from '../servers/ServersContext'
import { SocialProvider } from '../social/SocialContext'
import { VoiceCallProvider } from '../voice/VoiceCallContext'

export default function AppShell() {
  useEffect(() => {
    // Ask once per app load, while the user is already actively using the app (they just
    // logged in / landed on a protected route) — not blindly on first paint.
    void ensureNotificationPermission()
  }, [])

  return (
    <ServersProvider>
      <ChatHubProvider>
        <SocialProvider>
          {/* ProfileCardProvider must wrap VoiceCallProvider: VoiceCallProvider renders
              VoiceFullscreenOverlay (which uses useProfileCard) as a sibling of {children},
              not nested inside it, so it needs ProfileCardProvider higher up the tree. */}
          <ProfileCardProvider>
            <VoiceCallProvider>
              <div className="flex min-h-0 flex-1 bg-canvas text-muted-foreground">
                <ServerSidebar />
                <Outlet />
              </div>
            </VoiceCallProvider>
          </ProfileCardProvider>
        </SocialProvider>
      </ChatHubProvider>
    </ServersProvider>
  )
}
