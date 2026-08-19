import { Pencil, Send, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useParams } from 'react-router-dom'
import { ApiError, apiDelete, apiGet, apiPatch, apiPost } from '../api/client'
import type { DmMessageDto } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import Avatar from '../components/Avatar'
import ConfirmModal from '../components/ConfirmModal'
import EmojiPicker from '../components/EmojiPicker'
import GifPicker from '../components/GifPicker'
import { isHubConnected, useChatHub } from '../hubs/ChatHubContext'
import { embeddableGifUrl } from '../lib/gif'
import { STATUS_DOT_CLASS, STATUS_LABEL } from '../lib/presence'
import { useToast } from '../lib/ToastContext'
import { useSocial } from '../social/SocialContext'

export default function DmChatView() {
  const { dmChannelId } = useParams<{ dmChannelId: string }>()
  const { user } = useAuth()
  const connection = useChatHub()
  const toast = useToast()
  const { dmChannels } = useSocial()
  const [messages, setMessages] = useState<DmMessageDto[]>([])
  const [content, setContent] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const channel = dmChannels.find((c) => c.id === dmChannelId)

  useEffect(() => {
    if (!dmChannelId) return
    let cancelled = false
    void apiGet<DmMessageDto[]>(`/api/dm/channels/${dmChannelId}/messages`).then((history) => {
      if (!cancelled) setMessages(history)
    })
    return () => {
      cancelled = true
    }
  }, [dmChannelId])

  useEffect(() => {
    if (!connection || !isHubConnected(connection) || !dmChannelId) return

    const onReceive = (message: DmMessageDto) => {
      if (message.dmChannelId !== dmChannelId) return
      setMessages((prev) => [...prev, message])
    }
    const onEdited = (message: DmMessageDto) => {
      if (message.dmChannelId !== dmChannelId) return
      setMessages((prev) => prev.map((m) => (m.id === message.id ? message : m)))
    }
    const onDeleted = (messageId: string) => {
      setMessages((prev) => prev.filter((m) => m.id !== messageId))
    }

    connection.on('DmMessageReceived', onReceive)
    connection.on('DmMessageEdited', onEdited)
    connection.on('DmMessageDeleted', onDeleted)

    return () => {
      connection.off('DmMessageReceived', onReceive)
      connection.off('DmMessageEdited', onEdited)
      connection.off('DmMessageDeleted', onDeleted)
    }
  }, [connection, dmChannelId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  async function handleSend(e: FormEvent) {
    e.preventDefault()
    if (!content.trim() || !dmChannelId) return
    try {
      await apiPost(`/api/dm/channels/${dmChannelId}/messages`, { content })
      setContent('')
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Falha ao enviar mensagem.')
    }
  }

  async function sendGif(url: string) {
    if (!dmChannelId) return
    try {
      await apiPost(`/api/dm/channels/${dmChannelId}/messages`, { content: url })
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Falha ao enviar GIF.')
    }
  }

  async function saveEdit(messageId: string) {
    try {
      await apiPatch(`/api/dm/messages/${messageId}`, { content: editContent })
      setEditingId(null)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Falha ao editar mensagem.')
    }
  }

  async function confirmDeleteMessage() {
    if (!pendingDeleteId) return
    setIsDeleting(true)
    try {
      await apiDelete(`/api/dm/messages/${pendingDeleteId}`)
      setPendingDeleteId(null)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Falha ao excluir mensagem.')
    } finally {
      setIsDeleting(false)
    }
  }

  if (!dmChannelId) return null

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      {channel && (
        <div className="flex shrink-0 items-center gap-2 border-b border-border px-4 py-3">
          <span className="relative shrink-0">
            <Avatar url={channel.otherAvatarUrl} name={channel.otherDisplayName} size={28} />
            <span
              className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-canvas ${STATUS_DOT_CLASS[channel.otherStatus]}`}
            />
          </span>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-foreground">{channel.otherDisplayName}</div>
            <div className="truncate text-xs text-muted-foreground">{STATUS_LABEL[channel.otherStatus]}</div>
          </div>
        </div>
      )}

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
        {messages.map((message) => {
          const isMine = message.authorId === user?.userId
          const author = isMine
            ? { name: user?.displayName ?? '', avatarUrl: user?.avatarUrl ?? null }
            : { name: channel?.otherDisplayName ?? '', avatarUrl: channel?.otherAvatarUrl ?? null }
          return (
            <div key={message.id} className="group flex gap-3 rounded-lg px-2 py-1 -mx-2 hover:bg-panel-hover/60">
              <Avatar url={author.avatarUrl} name={author.name} size={38} className="mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <strong className="text-sm font-semibold text-foreground">{author.name}</strong>
                  <span className="text-xs text-muted-foreground/70">{new Date(message.createdAt).toLocaleString()}</span>
                  {message.editedAt && <span className="text-xs text-muted-foreground/50">(editado)</span>}
                </div>

                {editingId === message.id ? (
                  <div className="mt-1 flex gap-2">
                    <input className="field" value={editContent} onChange={(e) => setEditContent(e.target.value)} autoFocus />
                    <button type="button" className="btn btn-primary" onClick={() => void saveEdit(message.id)}>
                      Salvar
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={() => setEditingId(null)}>
                      Cancelar
                    </button>
                  </div>
                ) : embeddableGifUrl(message.content) ? (
                  <img
                    src={embeddableGifUrl(message.content)!}
                    alt="GIF"
                    className="mt-1 max-h-72 max-w-xs rounded-lg border border-border"
                  />
                ) : (
                  <p className="whitespace-pre-wrap break-words text-[15px] text-foreground/90">{message.content}</p>
                )}

                {isMine && editingId !== message.id && (
                  <div className="mt-1 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      type="button"
                      className="icon-btn h-7 w-7"
                      onClick={() => {
                        setEditingId(message.id)
                        setEditContent(message.content)
                      }}
                      title="Editar"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      type="button"
                      className="icon-btn h-7 w-7 hover:text-dnd"
                      onClick={() => setPendingDeleteId(message.id)}
                      title="Excluir"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {pendingDeleteId && (
        <ConfirmModal
          title="Excluir mensagem"
          message="Tem certeza que quer excluir esta mensagem? Essa ação não pode ser desfeita."
          confirmLabel="Excluir"
          isLoading={isDeleting}
          onConfirm={() => void confirmDeleteMessage()}
          onClose={() => setPendingDeleteId(null)}
        />
      )}

      <form className="flex items-center gap-2 border-t border-border px-4 py-3" onSubmit={handleSend}>
        <EmojiPicker onSelect={(emoji) => setContent((prev) => prev + emoji)} />
        <GifPicker onSelect={(url) => void sendGif(url)} />
        <input
          className="field"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={channel ? `Mensagem para ${channel.otherDisplayName}` : 'Enviar mensagem...'}
        />
        <button type="submit" className="icon-btn text-accent hover:text-accent-hover">
          <Send size={19} />
        </button>
      </form>
    </div>
  )
}
