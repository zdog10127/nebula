import { Hash, Pin, Search, Volume2 } from 'lucide-react'
import { useState } from 'react'
import { useOutletContext, useParams } from 'react-router-dom'
import ChatView from '../components/ChatView'
import MemberList from '../components/MemberList'
import MessageSearchModal from '../components/MessageSearchModal'
import PinnedMessagesModal from '../components/PinnedMessagesModal'
import VoiceChannelView from '../components/VoiceChannelView'
import type { ServerOutletContext } from './ServerView'

export default function ChannelView() {
  const { server } = useOutletContext<ServerOutletContext>()
  const { channelId } = useParams<{ channelId: string }>()
  const [showPinned, setShowPinned] = useState(false)
  const [showSearch, setShowSearch] = useState(false)

  const channel = server.channels.find((c) => c.id === channelId)
  if (!channel)
    return <div className="flex flex-1 items-center justify-center bg-panel text-muted-foreground">Canal não encontrado.</div>

  return (
    <div className="flex min-w-0 flex-1 flex-col bg-panel">
      <div className="flex h-14 shrink-0 items-center gap-1.5 border-b border-border px-4 shadow-sm">
        {channel.type === 'Voice' ? (
          <Volume2 size={18} className="text-muted-foreground" />
        ) : (
          <Hash size={18} className="text-muted-foreground" />
        )}
        <h3 className="text-[15px] font-semibold">{channel.name}</h3>
        {channel.type === 'Text' && (
          <div className="ml-auto flex items-center gap-1">
            <button type="button" className="icon-btn" title="Mensagens fixadas" onClick={() => setShowPinned(true)}>
              <Pin size={17} />
            </button>
            <button type="button" className="icon-btn" title="Buscar mensagens" onClick={() => setShowSearch(true)}>
              <Search size={17} />
            </button>
          </div>
        )}
      </div>
      {showPinned && <PinnedMessagesModal channelId={channel.id} onClose={() => setShowPinned(false)} />}
      {showSearch && <MessageSearchModal channelId={channel.id} onClose={() => setShowSearch(false)} />}
      <div className="flex min-h-0 flex-1">
        {channel.type === 'Text' ? (
          <ChatView key={channel.id} channelId={channel.id} />
        ) : (
          <VoiceChannelView key={channel.id} channelId={channel.id} channelName={channel.name} />
        )}
        <MemberList serverId={server.id} />
      </div>
    </div>
  )
}
