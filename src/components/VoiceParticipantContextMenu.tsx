import { Copy, Mic, MicOff, MessageSquare, User, UserPlus } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiError } from '../api/client'
import { useProfileCard } from '../lib/ProfileCardContext'
import { useToast } from '../lib/ToastContext'
import { useSocial } from '../social/SocialContext'
import { useVoiceCall } from '../voice/VoiceCallContext'

const itemClass =
  'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-panel-hover disabled:opacity-50'

// A minimal participant shape rather than the full VoiceParticipantDto: this menu is used
// both from the sidebar (which has `username`, from the REST voice-participants payload)
// and from inside the call itself (LiveKit's participant object, which only carries the
// identity/name/avatar we set as metadata — no username). "Adicionar amigo" hides itself
// when username is unknown rather than guessing at it.
export interface VoiceParticipantMenuTarget {
  userId: string
  username?: string
  displayName: string
  avatarUrl: string | null
}

// Discord-style right-click menu for a participant shown in a voice channel's member
// list (sidebar or in-call). Only exposes the subset of Discord's menu we actually have
// the backing for — profile, DM, add friend, per-user volume/mute, copy id.
export default function VoiceParticipantContextMenu({
  x,
  y,
  participant,
  canControlAudio,
  onClose,
}: {
  x: number
  y: number
  participant: VoiceParticipantMenuTarget
  canControlAudio: boolean
  onClose: () => void
}) {
  const rootRef = useRef<HTMLDivElement>(null)
  const toast = useToast()
  const navigate = useNavigate()
  const { openProfile } = useProfileCard()
  const { friends, sendFriendRequest, getOrCreateDmChannel } = useSocial()
  const call = useVoiceCall()
  const [isSendingRequest, setIsSendingRequest] = useState(false)
  const isFriend = friends.some((f) => f.userId === participant.userId)
  const isLocallyMuted = call.locallyMutedIds.has(participant.userId)

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

  async function handleMessage() {
    try {
      const channel = await getOrCreateDmChannel(participant.userId)
      navigate(`/app/dm/${channel.id}`)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Falha ao abrir conversa.')
    } finally {
      onClose()
    }
  }

  async function handleAddFriend() {
    if (!participant.username) return
    setIsSendingRequest(true)
    try {
      await sendFriendRequest(participant.username)
      toast.success(`Pedido de amizade enviado para ${participant.displayName}.`)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Falha ao enviar pedido de amizade.')
    } finally {
      setIsSendingRequest(false)
      onClose()
    }
  }

  async function handleCopyId() {
    try {
      await navigator.clipboard.writeText(participant.userId)
      toast.success('ID copiado.')
    } catch {
      toast.error('Não foi possível copiar o ID.')
    }
    onClose()
  }

  const menuWidth = 240
  const estimatedHeight = 120 + (canControlAudio ? 90 : 0)
  const left = Math.min(x, window.innerWidth - menuWidth - 8)
  const top = Math.min(y, window.innerHeight - estimatedHeight - 8)

  return (
    <div
      ref={rootRef}
      className="card fixed z-50 w-60 p-1.5"
      style={{ left: Math.max(8, left), top: Math.max(8, top) }}
    >
      <div className="truncate px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground/70">
        {participant.displayName}
      </div>

      <button type="button" className={itemClass} onClick={() => { openProfile({ userId: participant.userId }); onClose() }}>
        <User size={15} /> Perfil
      </button>
      <button type="button" className={itemClass} onClick={() => void handleMessage()}>
        <MessageSquare size={15} /> Mensagem
      </button>
      {!isFriend && participant.username && (
        <button type="button" className={itemClass} disabled={isSendingRequest} onClick={() => void handleAddFriend()}>
          <UserPlus size={15} /> Adicionar amigo
        </button>
      )}

      {canControlAudio && (
        <>
          <div className="my-1 border-t border-border" />
          <div className="px-2 py-1.5">
            <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
              <span>Volume do usuário</span>
              <span>{call.participantVolumes[participant.userId] ?? 100}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={200}
              value={call.participantVolumes[participant.userId] ?? 100}
              onChange={(e) => call.setParticipantVolume(participant.userId, Number(e.target.value))}
              className="h-1 w-full accent-accent"
            />
          </div>
          <button type="button" className={itemClass} onClick={() => call.toggleParticipantMute(participant.userId)}>
            {isLocallyMuted ? <Mic size={15} /> : <MicOff size={15} />}
            {isLocallyMuted ? 'Reativar áudio' : 'Silenciar (só para você)'}
          </button>
        </>
      )}

      <div className="my-1 border-t border-border" />
      <button type="button" className={itemClass} onClick={() => void handleCopyId()}>
        <Copy size={15} /> Copiar ID do usuário
      </button>
    </div>
  )
}
