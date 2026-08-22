import {
  ChevronDown,
  ChevronUp,
  FolderPlus,
  Hash,
  LogOut,
  MicOff,
  Music,
  Pencil,
  Plus,
  Settings,
  Trash2,
  UserPlus,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { NavLink, useNavigate, useParams } from 'react-router-dom'
import { ApiError, apiDelete, apiGet, apiPatch } from '../api/client'
import type {
  CategoryDto,
  ChannelDto,
  MemberDto,
  MyPermissionsDto,
  NowPlayingDto,
  ServerDetail,
  UnreadCountDto,
  VoiceParticipantDto,
} from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { useChatHub } from '../hubs/ChatHubContext'
import { hasPermission } from '../lib/permissions'
import { showNotification } from '../lib/notify'
import { useProfileCard } from '../lib/ProfileCardContext'
import { useToast } from '../lib/ToastContext'
import { useServers } from '../servers/ServersContext'
import type { VoiceCallContextValue } from '../voice/VoiceCallContext'
import { useVoiceCall } from '../voice/VoiceCallContext'
import Avatar from './Avatar'
import ConfirmModal from './ConfirmModal'
import CreateCategoryModal from './CreateCategoryModal'
import CreateChannelModal from './CreateChannelModal'
import InviteModal from './InviteModal'
import ProfileSettingsModal from './ProfileSettingsModal'
import ServerSettingsModal from './ServerSettingsModal'
import StatusPicker from './StatusPicker'
import VoiceControls from './VoiceControls'
import VoiceParticipantContextMenu from './VoiceParticipantContextMenu'

interface Props {
  server: ServerDetail
  refreshServer: () => Promise<void>
}

type ModalState =
  | { type: 'channel'; categoryId: string | null }
  | { type: 'category' }
  | { type: 'invite' }
  | { type: 'profile' }
  | { type: 'server' }
  | { type: 'delete-category'; category: CategoryDto }
  | null

export default function ChannelSidebar({ server, refreshServer }: Props) {
  const { user, logout } = useAuth()
  const connection = useChatHub()
  const call = useVoiceCall()
  const { isServerMuted } = useServers()
  const toast = useToast()
  const navigate = useNavigate()
  const { channelId: activeChannelId } = useParams<{ channelId?: string }>()
  const [modal, setModal] = useState<ModalState>(null)
  const [voiceParticipants, setVoiceParticipants] = useState<Record<string, VoiceParticipantDto[]>>({})
  const [nowPlayingChannels, setNowPlayingChannels] = useState<Set<string>>(new Set())
  const [myPermissions, setMyPermissions] = useState<MyPermissionsDto | null>(null)
  const [isDeletingCategory, setIsDeletingCategory] = useState(false)
  const [unreadCounts, setUnreadCounts] = useState<Record<string, UnreadCountDto>>({})
  const [membersById, setMembersById] = useState<Record<string, MemberDto>>({})

  const canManageChannels = hasPermission(myPermissions, 'ManageChannels')
  const canInvite = hasPermission(myPermissions, 'CreateInvite')
  const canOpenSettings =
    !!myPermissions &&
    (myPermissions.isOwner ||
      hasPermission(myPermissions, 'ManageServer') ||
      hasPermission(myPermissions, 'ManageRoles') ||
      hasPermission(myPermissions, 'KickMembers') ||
      hasPermission(myPermissions, 'BanMembers'))

  useEffect(() => {
    let cancelled = false
    void apiGet<MyPermissionsDto>(`/api/servers/${server.id}/my-permissions`).then((p) => {
      if (!cancelled) setMyPermissions(p)
    })
    return () => {
      cancelled = true
    }
  }, [server.id])

  useEffect(() => {
    let cancelled = false
    void apiGet<Record<string, VoiceParticipantDto[]>>(`/api/servers/${server.id}/voice-participants`).then((map) => {
      if (!cancelled) setVoiceParticipants(map)
    })
    return () => {
      cancelled = true
    }
  }, [server.id])

  useEffect(() => {
    if (!connection) return

    const handler = (channelId: string, participants: VoiceParticipantDto[]) => {
      setVoiceParticipants((prev) => ({ ...prev, [channelId]: participants }))
    }

    connection.on('VoiceParticipantsChanged', handler)
    return () => {
      connection.off('VoiceParticipantsChanged', handler)
    }
  }, [connection])

  useEffect(() => {
    if (!connection) return

    const handler = (channelId: string, dto: NowPlayingDto | null) => {
      setNowPlayingChannels((prev) => {
        const next = new Set(prev)
        if (dto) next.add(channelId)
        else next.delete(channelId)
        return next
      })
    }

    connection.on('NowPlayingChanged', handler)
    return () => {
      connection.off('NowPlayingChanged', handler)
    }
  }, [connection])

  useEffect(() => {
    let cancelled = false
    void apiGet<Record<string, UnreadCountDto>>(`/api/servers/${server.id}/unread`).then((map) => {
      if (!cancelled) setUnreadCounts(map)
    })
    return () => {
      cancelled = true
    }
  }, [server.id])

  useEffect(() => {
    let cancelled = false
    void apiGet<MemberDto[]>(`/api/servers/${server.id}/members`).then((list) => {
      if (!cancelled) setMembersById(Object.fromEntries(list.map((m) => [m.userId, m])))
    })
    return () => {
      cancelled = true
    }
  }, [server.id])

  useEffect(() => {
    if (!connection) return

    const onUnreadPing = (channelId: string, pingServerId: string, authorId: string, mentionedUserIds: string[]) => {
      if (pingServerId !== server.id || authorId === user?.userId) return
      const isActiveChannel = channelId === activeChannelId

      if (!isActiveChannel) {
        setUnreadCounts((prev) => {
          const existing = prev[channelId]
          return {
            ...prev,
            [channelId]: {
              count: (existing?.count ?? 0) + 1,
              hasMention: (existing?.hasMention ?? false) || mentionedUserIds.includes(user?.userId ?? ''),
            },
          }
        })
      }

      // Notify whenever the message lands somewhere other than the channel you're
      // actively looking at, or the app is in the background even if it is that channel —
      // unless the person silenced this server (right-click the server icon).
      if ((!isActiveChannel || !document.hasFocus()) && !isServerMuted(server.id)) {
        const channel = server.channels.find((c) => c.id === channelId)
        const author = membersById[authorId]
        showNotification(`${server.name} — #${channel?.name ?? 'canal'}`, {
          body: author ? `${author.nickname ?? author.displayName} enviou uma mensagem` : 'Nova mensagem',
          onClick: () => navigate(`/app/servers/${server.id}/channels/${channelId}`),
        })
      }
    }

    connection.on('UnreadPing', onUnreadPing)
    return () => {
      connection.off('UnreadPing', onUnreadPing)
    }
  }, [connection, server, activeChannelId, user?.userId, membersById, navigate, isServerMuted])

  const uncategorized = server.channels.filter((c) => !c.categoryId)
  const uncategorizedText = uncategorized.filter((c) => c.type === 'Text').sort((a, b) => a.position - b.position)
  const uncategorizedVoice = uncategorized.filter((c) => c.type === 'Voice').sort((a, b) => a.position - b.position)
  const sortedCategories = [...(server.categories ?? [])].sort((a, b) => a.position - b.position)

  async function moveChannel(list: ChannelDto[], channel: ChannelDto, direction: -1 | 1) {
    const idx = list.findIndex((c) => c.id === channel.id)
    const target = list[idx + direction]
    if (!target) return
    try {
      await apiPatch(`/api/servers/${server.id}/channels/${channel.id}/move`, { categoryId: channel.categoryId, position: target.position })
      await apiPatch(`/api/servers/${server.id}/channels/${target.id}/move`, { categoryId: target.categoryId, position: channel.position })
      await refreshServer()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Falha ao reordenar canal.')
    }
  }

  async function renameCategory(category: CategoryDto, name: string) {
    try {
      await apiPatch(`/api/servers/${server.id}/categories/${category.id}`, { name })
      await refreshServer()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Falha ao renomear categoria.')
    }
  }

  async function confirmDeleteCategory(category: CategoryDto) {
    setIsDeletingCategory(true)
    try {
      await apiDelete(`/api/servers/${server.id}/categories/${category.id}`)
      await refreshServer()
      toast.success('Categoria excluída.')
      setModal(null)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Falha ao excluir categoria.')
    } finally {
      setIsDeletingCategory(false)
    }
  }

  return (
    <nav className="flex w-60 shrink-0 flex-col overflow-y-auto border-r border-border bg-canvas">
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-3.5 shadow-sm">
        <h2 className="truncate text-[15px] font-semibold" title={server.description ?? undefined}>
          {server.name}
        </h2>
        {(canInvite || canOpenSettings) && (
          <div className="flex shrink-0 gap-1">
            {canInvite && (
              <button type="button" className="icon-btn" onClick={() => setModal({ type: 'invite' })} title="Convidar">
                <UserPlus size={17} />
              </button>
            )}
            {canOpenSettings && (
              <button type="button" className="icon-btn" onClick={() => setModal({ type: 'server' })} title="Configurações do server">
                <Settings size={17} />
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 px-2 pt-3">
        <ChannelGroup label="Texto" onAdd={canManageChannels ? () => setModal({ type: 'channel', categoryId: null }) : undefined}>
          {uncategorizedText.map((channel, i, list) => (
            <ChannelRow
              key={channel.id}
              channel={channel}
              serverId={server.id}
              participants={voiceParticipants[channel.id]}
              hasMusic={nowPlayingChannels.has(channel.id)}
              unread={channel.id === activeChannelId ? undefined : unreadCounts[channel.id]}
              canManageChannels={canManageChannels}
              canMoveUp={i > 0}
              canMoveDown={i < list.length - 1}
              onMoveUp={() => void moveChannel(list, channel, -1)}
              onMoveDown={() => void moveChannel(list, channel, 1)}
              onVoiceClick={channel.type === 'Voice' ? () => void call.join(channel.id, channel.name) : undefined}
              call={call}
              ownUserId={user?.userId}
            />
          ))}
        </ChannelGroup>

        <ChannelGroup label="Voz" onAdd={canManageChannels ? () => setModal({ type: 'channel', categoryId: null }) : undefined}>
          {uncategorizedVoice.map((channel, i, list) => (
            <ChannelRow
              key={channel.id}
              channel={channel}
              serverId={server.id}
              participants={voiceParticipants[channel.id]}
              hasMusic={nowPlayingChannels.has(channel.id)}
              unread={channel.id === activeChannelId ? undefined : unreadCounts[channel.id]}
              canManageChannels={canManageChannels}
              canMoveUp={i > 0}
              canMoveDown={i < list.length - 1}
              onMoveUp={() => void moveChannel(list, channel, -1)}
              onMoveDown={() => void moveChannel(list, channel, 1)}
              onVoiceClick={channel.type === 'Voice' ? () => void call.join(channel.id, channel.name) : undefined}
              call={call}
              ownUserId={user?.userId}
            />
          ))}
        </ChannelGroup>

        {sortedCategories.map((category) => {
          const channels = server.channels.filter((c) => c.categoryId === category.id).sort((a, b) => a.position - b.position)
          return (
            <CategoryGroup
              key={category.id}
              category={category}
              canManageChannels={canManageChannels}
              onAddChannel={() => setModal({ type: 'channel', categoryId: category.id })}
              onRename={(name) => void renameCategory(category, name)}
              onDelete={() => setModal({ type: 'delete-category', category })}
            >
              {channels.map((channel, i, list) => (
                <ChannelRow
                  key={channel.id}
                  channel={channel}
                  serverId={server.id}
                  participants={voiceParticipants[channel.id]}
                  hasMusic={nowPlayingChannels.has(channel.id)}
                  unread={channel.id === activeChannelId ? undefined : unreadCounts[channel.id]}
                  canManageChannels={canManageChannels}
                  canMoveUp={i > 0}
                  canMoveDown={i < list.length - 1}
                  onMoveUp={() => void moveChannel(list, channel, -1)}
                  onMoveDown={() => void moveChannel(list, channel, 1)}
                  onVoiceClick={channel.type === 'Voice' ? () => void call.join(channel.id, channel.name) : undefined}
                  call={call}
                  ownUserId={user?.userId}
                />
              ))}
            </CategoryGroup>
          )
        })}

        {canManageChannels && (
          <button
            type="button"
            className="mb-2 flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-panel-hover hover:text-foreground"
            onClick={() => setModal({ type: 'category' })}
          >
            <FolderPlus size={14} /> Nova categoria
          </button>
        )}
      </div>

      {call.channelId && (
        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-border bg-raised px-3 py-2">
          <div className="flex min-w-0 items-center gap-1.5 text-xs font-semibold text-online">
            <Volume2 size={14} className="shrink-0" />
            <span className="truncate">{call.channelName}</span>
          </div>
          <VoiceControls compact />
        </div>
      )}

      <div className="flex shrink-0 items-center gap-2 border-t border-border bg-panel px-2 py-2">
        <StatusPicker />
        <Avatar url={user?.avatarUrl} name={user?.displayName ?? ''} size={30} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-foreground">{user?.displayName}</div>
          {user?.customStatusText && (
            <div className="truncate text-xs text-muted-foreground">
              {user.customStatusEmoji && <span className="mr-1">{user.customStatusEmoji}</span>}
              {user.customStatusText}
            </div>
          )}
        </div>
        <button type="button" className="icon-btn" onClick={() => setModal({ type: 'profile' })} title="Configurações de perfil">
          <Settings size={16} />
        </button>
        <button type="button" className="icon-btn hover:text-dnd" onClick={() => void logout()} title="Sair">
          <LogOut size={16} />
        </button>
      </div>

      {modal?.type === 'channel' && (
        <CreateChannelModal
          serverId={server.id}
          categories={server.categories ?? []}
          defaultCategoryId={modal.categoryId}
          onClose={() => setModal(null)}
          onCreated={refreshServer}
        />
      )}
      {modal?.type === 'category' && (
        <CreateCategoryModal serverId={server.id} onClose={() => setModal(null)} onCreated={refreshServer} />
      )}
      {modal?.type === 'invite' && <InviteModal serverId={server.id} onClose={() => setModal(null)} />}
      {modal?.type === 'profile' && <ProfileSettingsModal onClose={() => setModal(null)} />}
      {modal?.type === 'server' && <ServerSettingsModal server={server} onClose={() => setModal(null)} onUpdated={refreshServer} />}
      {modal?.type === 'delete-category' && (
        <ConfirmModal
          title="Excluir categoria"
          message={`Tem certeza que quer excluir "${modal.category.name}"? Os canais dentro dela não serão excluídos, apenas desagrupados.`}
          confirmLabel="Excluir"
          isLoading={isDeletingCategory}
          onConfirm={() => void confirmDeleteCategory(modal.category)}
          onClose={() => setModal(null)}
        />
      )}
    </nav>
  )
}

function ChannelGroup({ label, onAdd, children }: { label: string; onAdd?: () => void; children: ReactNode }) {
  return (
    <div className="mb-3">
      <div className="group flex items-center justify-between px-2 pb-1">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/70">{label}</span>
        {onAdd && (
          <button
            type="button"
            className="icon-btn h-5 w-5 opacity-0 group-hover:opacity-100"
            onClick={onAdd}
            title={`Criar canal de ${label.toLowerCase()}`}
          >
            <Plus size={14} />
          </button>
        )}
      </div>
      <div className="flex flex-col gap-0.5">{children}</div>
    </div>
  )
}

function CategoryGroup({
  category,
  canManageChannels,
  onAddChannel,
  onRename,
  onDelete,
  children,
}: {
  category: CategoryDto
  canManageChannels: boolean
  onAddChannel: () => void
  onRename: (name: string) => void
  onDelete: () => void
  children: ReactNode
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState(category.name)

  function submitRename() {
    const trimmed = name.trim()
    if (trimmed && trimmed !== category.name) onRename(trimmed)
    else setName(category.name)
    setIsEditing(false)
  }

  return (
    <div className="mb-3">
      <div className="group flex items-center justify-between gap-1 px-2 pb-1">
        {isEditing ? (
          <input
            className="field h-6 flex-1 py-0 text-xs"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={submitRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submitRename()
              if (e.key === 'Escape') {
                setName(category.name)
                setIsEditing(false)
              }
            }}
            autoFocus
          />
        ) : (
          <span className="truncate text-xs font-semibold uppercase tracking-wide text-muted-foreground/70">{category.name}</span>
        )}
        {canManageChannels && !isEditing && (
          <div className="flex shrink-0 gap-0.5 opacity-0 group-hover:opacity-100">
            <button type="button" className="icon-btn h-5 w-5" onClick={() => setIsEditing(true)} title="Renomear categoria">
              <Pencil size={12} />
            </button>
            <button type="button" className="icon-btn h-5 w-5 hover:text-dnd" onClick={onDelete} title="Excluir categoria">
              <Trash2 size={12} />
            </button>
            <button type="button" className="icon-btn h-5 w-5" onClick={onAddChannel} title="Criar canal nesta categoria">
              <Plus size={12} />
            </button>
          </div>
        )}
      </div>
      <div className="flex flex-col gap-0.5">{children}</div>
    </div>
  )
}

function ChannelRow({
  channel,
  serverId,
  participants,
  hasMusic,
  unread,
  canManageChannels,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  onVoiceClick,
  call,
  ownUserId,
}: {
  channel: ChannelDto
  serverId: string
  participants?: VoiceParticipantDto[]
  hasMusic?: boolean
  unread?: UnreadCountDto
  canManageChannels: boolean
  canMoveUp: boolean
  canMoveDown: boolean
  onMoveUp: () => void
  onMoveDown: () => void
  onVoiceClick?: () => void
  call?: VoiceCallContextValue
  ownUserId?: string
}) {
  const isInThisVoiceChannel = channel.type === 'Voice' && call?.channelId === channel.id
  const { openProfile } = useProfileCard()
  const [participantMenu, setParticipantMenu] = useState<{ x: number; y: number; participant: VoiceParticipantDto } | null>(
    null,
  )
  return (
    <div className="group/row">
      <div className="flex items-center gap-0.5">
        <NavLink
          to={`/app/servers/${serverId}/channels/${channel.id}`}
          onClick={onVoiceClick}
          className={({ isActive }) =>
            `flex min-w-0 flex-1 items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium transition-colors ${
              isActive ? 'bg-accent-soft text-accent' : 'text-muted-foreground hover:bg-panel-hover hover:text-foreground'
            }`
          }
        >
          {channel.type === 'Voice' ? (
            <Volume2 size={16} className="shrink-0 opacity-70" />
          ) : (
            <Hash size={16} className={`shrink-0 opacity-70 ${unread?.count ? 'text-foreground' : ''}`} />
          )}
          <span className={`truncate ${unread?.count ? 'font-semibold text-foreground' : ''}`}>{channel.name}</span>
          {!!unread?.count && (
            <span
              className={`ml-auto flex h-4.5 min-w-4.5 shrink-0 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white ${
                unread.hasMention ? 'bg-dnd' : 'bg-muted-foreground'
              }`}
            >
              {unread.count > 99 ? '99+' : unread.count}
            </span>
          )}
        </NavLink>
        {canManageChannels && (
          <div className="flex shrink-0 opacity-0 group-hover/row:opacity-100">
            <button type="button" className="icon-btn h-6 w-6" disabled={!canMoveUp} onClick={onMoveUp} title="Mover para cima">
              <ChevronUp size={13} />
            </button>
            <button type="button" className="icon-btn h-6 w-6" disabled={!canMoveDown} onClick={onMoveDown} title="Mover para baixo">
              <ChevronDown size={13} />
            </button>
          </div>
        )}
      </div>
      {channel.type === 'Voice' && ((participants && participants.length > 0) || hasMusic) && (
        <ul className="mb-1 flex flex-col gap-1 py-1 pl-7 pr-2">
          {hasMusic && (
            <li className="flex items-center gap-1.5 text-xs text-accent">
              <Music size={13} className="shrink-0" />
              <span className="truncate">Music</span>
            </li>
          )}
          {participants?.map((p) => {
            const isSelf = p.userId === ownUserId
            // Live speaking state only exists for the LiveKit room we're actually connected
            // to — there's no way to know who's talking in a voice channel we're not in.
            const isSpeaking = isInThisVoiceChannel && !!call?.speakingIds.has(p.userId)
            return (
              <li key={p.userId}>
                <button
                  type="button"
                  className="flex w-full items-center gap-1.5 rounded px-1 -mx-1 py-0.5 text-left text-xs text-muted-foreground hover:bg-panel-hover"
                  onClick={() => !isSelf && openProfile({ userId: p.userId })}
                  onContextMenu={(e) => {
                    if (isSelf) return
                    e.preventDefault()
                    setParticipantMenu({ x: e.clientX, y: e.clientY, participant: p })
                  }}
                >
                  <span
                    className={`flex shrink-0 rounded-full border transition-colors duration-100 ${
                      isSpeaking ? 'border-online' : 'border-transparent'
                    }`}
                  >
                    <Avatar url={p.avatarUrl} name={p.displayName} size={18} />
                  </span>
                  <span className="min-w-0 flex-1 truncate">{p.displayName}</span>
                  {p.isDeafened ? (
                    <VolumeX size={11} className="shrink-0 text-dnd" />
                  ) : p.isMuted ? (
                    <MicOff size={11} className="shrink-0 text-dnd" />
                  ) : null}
                </button>
              </li>
            )
          })}
        </ul>
      )}
      {participantMenu && (
        <VoiceParticipantContextMenu
          x={participantMenu.x}
          y={participantMenu.y}
          participant={participantMenu.participant}
          canControlAudio={isInThisVoiceChannel}
          onClose={() => setParticipantMenu(null)}
        />
      )}
    </div>
  )
}
