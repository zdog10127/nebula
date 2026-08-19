import { Outlet } from 'react-router-dom'
import ServerSidebar from '../components/ServerSidebar'
import { ChatHubProvider } from '../hubs/ChatHubContext'
import { ProfileCardProvider } from '../lib/ProfileCardContext'
import { ServersProvider } from '../servers/ServersContext'
import { SocialProvider } from '../social/SocialContext'
import { VoiceCallProvider } from '../voice/VoiceCallContext'

export default function AppShell() {
  return (
    <ServersProvider>
      <ChatHubProvider>
        <SocialProvider>
          <VoiceCallProvider>
            <ProfileCardProvider>
              <div className="flex min-h-0 flex-1 bg-canvas text-muted-foreground">
                <ServerSidebar />
                <Outlet />
              </div>
            </ProfileCardProvider>
          </VoiceCallProvider>
        </SocialProvider>
      </ChatHubProvider>
    </ServersProvider>
  )
}
