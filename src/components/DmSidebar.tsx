import { LogOut, Settings, Users } from 'lucide-react'
import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useSocial } from '../social/SocialContext'
import Avatar from './Avatar'
import ProfileSettingsModal from './ProfileSettingsModal'
import StatusPicker from './StatusPicker'
import { STATUS_DOT_CLASS } from '../lib/presence'

export default function DmSidebar() {
  const { user, logout } = useAuth()
  const { dmChannels, incomingRequestCount } = useSocial()
  const [showProfileSettings, setShowProfileSettings] = useState(false)

  return (
    <nav className="flex w-60 shrink-0 flex-col bg-panel">
      <div className="flex-1 overflow-y-auto px-2 pt-3">
        <NavLink
          to="/app/dm"
          end
          className={({ isActive }) =>
            `relative mb-3 flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium ${
              isActive ? 'bg-accent-soft text-accent' : 'text-muted-foreground hover:bg-panel-hover hover:text-foreground'
            }`
          }
        >
          <Users size={16} className="shrink-0 opacity-70" />
          Amigos
          {incomingRequestCount > 0 && (
            <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-dnd px-1 text-[10px] font-bold text-white">
              {incomingRequestCount}
            </span>
          )}
        </NavLink>

        <div className="mb-1 flex items-center justify-between px-2 pb-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/70">Mensagens diretas</span>
        </div>
        <div className="flex flex-col gap-0.5">
          {dmChannels.map((dm) => (
            <NavLink
              key={dm.id}
              to={`/app/dm/${dm.id}`}
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium transition-colors ${
                  isActive ? 'bg-accent-soft text-accent' : 'text-muted-foreground hover:bg-panel-hover hover:text-foreground'
                }`
              }
            >
              <span className="relative shrink-0">
                <Avatar url={dm.otherAvatarUrl} name={dm.otherDisplayName} size={26} />
                <span
                  className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-panel ${STATUS_DOT_CLASS[dm.otherStatus]}`}
                />
              </span>
              <span className="min-w-0 flex-1 truncate">{dm.otherDisplayName}</span>
            </NavLink>
          ))}
          {dmChannels.length === 0 && (
            <p className="px-2 py-2 text-xs text-muted-foreground">
              Nenhuma conversa ainda. Adicione um amigo pra começar a conversar.
            </p>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 border-t border-border bg-panel px-2 py-2">
        <StatusPicker />
        <Avatar url={user?.avatarUrl} name={user?.displayName ?? ''} size={30} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-foreground">{user?.displayName}</div>
        </div>
        <button type="button" className="icon-btn" onClick={() => setShowProfileSettings(true)} title="Configurações de perfil">
          <Settings size={16} />
        </button>
        <button type="button" className="icon-btn hover:text-dnd" onClick={() => void logout()} title="Sair">
          <LogOut size={16} />
        </button>
      </div>

      {showProfileSettings && <ProfileSettingsModal onClose={() => setShowProfileSettings(false)} />}
    </nav>
  )
}
