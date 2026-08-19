import { Compass, MessageCircle, Plus } from 'lucide-react'
import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useServers } from '../servers/ServersContext'
import { useSocial } from '../social/SocialContext'
import CreateServerModal from './CreateServerModal'
import JoinServerModal from './JoinServerModal'

export default function ServerSidebar() {
  const { servers } = useServers()
  const { incomingRequestCount } = useSocial()
  const [modal, setModal] = useState<'create' | 'join' | null>(null)

  return (
    <nav className="flex w-[72px] shrink-0 flex-col items-center gap-2 overflow-y-auto overflow-x-visible bg-panel py-3">
      <NavLink to="/app/dm" className="group relative flex h-12 w-12 items-center justify-center text-sm font-semibold" title="Mensagens diretas">
        {({ isActive }) => (
          <>
            <span
              className={`flex h-12 w-12 items-center justify-center overflow-hidden transition-all duration-200 ${
                isActive
                  ? 'rounded-2xl bg-accent text-canvas shadow-[0_0_0_2px_var(--color-accent-soft)]'
                  : 'rounded-full bg-raised text-foreground group-hover:rounded-2xl group-hover:bg-accent group-hover:text-canvas'
              }`}
            >
              <MessageCircle size={22} />
            </span>
            {incomingRequestCount > 0 && (
              <span className="absolute -bottom-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-dnd px-1 text-[10px] font-bold text-white ring-2 ring-panel">
                {incomingRequestCount}
              </span>
            )}
          </>
        )}
      </NavLink>

      <div className="my-1 h-px w-8 bg-border" />

      {servers.map((server) => (
        <NavLink
          key={server.id}
          to={`/app/servers/${server.id}`}
          className="group relative flex h-12 w-12 items-center justify-center text-sm font-semibold"
          title={server.name}
        >
          {({ isActive }) => (
            <span
              className={`flex h-12 w-12 items-center justify-center overflow-hidden transition-all duration-200 ${
                isActive
                  ? 'rounded-2xl bg-accent text-canvas shadow-[0_0_0_2px_var(--color-accent-soft)]'
                  : 'rounded-full bg-raised text-foreground group-hover:rounded-2xl group-hover:bg-accent group-hover:text-canvas'
              }`}
            >
              {server.iconUrl ? (
                <img src={server.iconUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span>{initials(server.name)}</span>
              )}
            </span>
          )}
        </NavLink>
      ))}

      <div className="my-1 h-px w-8 bg-border" />

      <button
        type="button"
        className="flex h-12 w-12 items-center justify-center rounded-full bg-raised text-online transition-all duration-200 hover:rounded-2xl hover:bg-online hover:text-canvas"
        title="Criar server"
        onClick={() => setModal('create')}
      >
        <Plus size={22} />
      </button>
      <button
        type="button"
        className="flex h-12 w-12 items-center justify-center rounded-full bg-raised text-accent transition-all duration-200 hover:rounded-2xl hover:bg-accent hover:text-canvas"
        title="Entrar com convite"
        onClick={() => setModal('join')}
      >
        <Compass size={20} />
      </button>

      {modal === 'create' && <CreateServerModal onClose={() => setModal(null)} />}
      {modal === 'join' && <JoinServerModal onClose={() => setModal(null)} />}
    </nav>
  )
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join('')
}
