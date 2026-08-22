import { BellOff, BellRing } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { useServers } from '../servers/ServersContext'

const itemClass =
  'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-panel-hover disabled:opacity-50'

// Minimal right-click menu on a server icon in ServerSidebar — today just the
// mute/unmute toggle the person asked for ("silenciar o servidor"). Same
// click-outside/escape pattern as VoiceParticipantContextMenu/RoleAssignMenu.
export default function ServerContextMenu({
  x,
  y,
  serverId,
  serverName,
  onClose,
}: {
  x: number
  y: number
  serverId: string
  serverName: string
  onClose: () => void
}) {
  const rootRef = useRef<HTMLDivElement>(null)
  const { isServerMuted, toggleServerMute } = useServers()
  const muted = isServerMuted(serverId)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) onClose()
    }
    function onEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', onClickOutside)
    document.addEventListener('keydown', onEscape)
    return () => {
      document.removeEventListener('mousedown', onClickOutside)
      document.removeEventListener('keydown', onEscape)
    }
  }, [onClose])

  const menuWidth = 220
  const estimatedHeight = 70
  const left = Math.min(x, window.innerWidth - menuWidth - 8)
  const top = Math.min(y, window.innerHeight - estimatedHeight - 8)

  return (
    <div
      ref={rootRef}
      className="card fixed z-50 w-56 p-1.5"
      style={{ left: Math.max(8, left), top: Math.max(8, top) }}
    >
      <div className="truncate px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground/70">
        {serverName}
      </div>
      <button
        type="button"
        className={itemClass}
        onClick={() => {
          toggleServerMute(serverId)
          onClose()
        }}
      >
        {muted ? <BellRing size={15} /> : <BellOff size={15} />}
        {muted ? 'Reativar notificações' : 'Silenciar servidor'}
      </button>
    </div>
  )
}
