import { Paperclip, Pencil, Pin, PinOff, Send, Trash2, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { ApiError, apiDelete, apiGet, apiPatch, apiPost, apiUpload } from '../api/client'
import type { AttachmentSummary, MessageDto, ReactionSummary } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { isHubConnected, useChatHub } from '../hubs/ChatHubContext'
import { embeddableGifUrl } from '../lib/gif'
import { useProfileCard } from '../lib/ProfileCardContext'
import { useToast } from '../lib/ToastContext'
import Avatar from './Avatar'
import ConfirmModal from './ConfirmModal'
import EmojiPicker from './EmojiPicker'
import GifPicker from './GifPicker'
import MessageContent from './MessageContent'

export default function ChatView({ channelId }: { channelId: string }) {
  const { user } = useAuth()
  const connection = useChatHub()
  const toast = useToast()
  const { openProfile } = useProfileCard()
  const [messages, setMessages] = useState<MessageDto[]>([])
  const [content, setContent] = useState('')
  const [pendingAttachment, setPendingAttachment] = useState<AttachmentSummary | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let cancelled = false
    void apiGet<MessageDto[]>(`/api/channels/${channelId}/messages`).then((history) => {
      if (!cancelled) setMessages(history)
    })
    return () => {
      cancelled = true
    }
  }, [channelId])

  useEffect(() => {
    void apiPost(`/api/channels/${channelId}/read`)
  }, [channelId])

  useEffect(() => {
    if (!connection || !isHubConnected(connection)) return

    void connection.invoke('JoinChannel', channelId)

    const onReceive = (message: MessageDto) => {
      if (message.channelId !== channelId) return
      setMessages((prev) => [...prev, message])
      void apiPost(`/api/channels/${channelId}/read`)
    }
    const onEdited = (message: MessageDto) => {
      if (message.channelId !== channelId) return
      setMessages((prev) => prev.map((m) => (m.id === message.id ? message : m)))
    }
    const onDeleted = (messageId: string) => {
      setMessages((prev) => prev.filter((m) => m.id !== messageId))
    }
    const onReactionsChanged = (messageId: string, reactions: ReactionSummary[]) => {
      setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, reactions } : m)))
    }
    const onPinChanged = (message: MessageDto) => {
      if (message.channelId !== channelId) return
      setMessages((prev) => prev.map((m) => (m.id === message.id ? message : m)))
    }

    connection.on('ReceiveMessage', onReceive)
    connection.on('MessageEdited', onEdited)
    connection.on('MessageDeleted', onDeleted)
    connection.on('MessageReactionsChanged', onReactionsChanged)
    connection.on('MessagePinned', onPinChanged)
    connection.on('MessageUnpinned', onPinChanged)

    return () => {
      connection.off('ReceiveMessage', onReceive)
      connection.off('MessageEdited', onEdited)
      connection.off('MessageDeleted', onDeleted)
      connection.off('MessageReactionsChanged', onReactionsChanged)
      connection.off('MessagePinned', onPinChanged)
      connection.off('MessageUnpinned', onPinChanged)
      void connection.invoke('LeaveChannel', channelId)
    }
  }, [connection, channelId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  async function handleSend(e: FormEvent) {
    e.preventDefault()
    if (!content.trim() && !pendingAttachment) return

    const body: { content: string; attachmentIds?: string[] } = { content: content || '(anexo)' }
    if (pendingAttachment) body.attachmentIds = [pendingAttachment.id]

    try {
      await apiPost(`/api/channels/${channelId}/messages`, body)
      setContent('')
      setPendingAttachment(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Falha ao enviar mensagem.')
    }
  }

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setIsUploading(true)
    try {
      const attachment = await apiUpload<AttachmentSummary>('/api/attachments', file)
      setPendingAttachment(attachment)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Falha ao enviar arquivo.')
    } finally {
      setIsUploading(false)
    }
  }

  async function sendGif(url: string) {
    try {
      await apiPost(`/api/channels/${channelId}/messages`, { content: url })
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Falha ao enviar GIF.')
    }
  }

  async function saveEdit(messageId: string) {
    try {
      await apiPatch(`/api/messages/${messageId}`, { content: editContent })
      setEditingId(null)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Falha ao editar mensagem.')
    }
  }

  async function confirmDeleteMessage() {
    if (!pendingDeleteId) return
    setIsDeleting(true)
    try {
      await apiDelete(`/api/messages/${pendingDeleteId}`)
      setPendingDeleteId(null)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Falha ao excluir mensagem.')
    } finally {
      setIsDeleting(false)
    }
  }

  async function togglePin(message: MessageDto) {
    try {
      if (message.isPinned) await apiDelete(`/api/messages/${message.id}/pin`)
      else await apiPost(`/api/messages/${message.id}/pin`)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Falha ao fixar mensagem.')
    }
  }

  async function toggleReaction(message: MessageDto, emoji: string) {
    const existing = message.reactions.find((r) => r.emoji === emoji)
    const reactedByMe = existing?.userIds.includes(user?.userId ?? '') ?? false

    try {
      if (reactedByMe) {
        await apiDelete(`/api/messages/${message.id}/reactions/${encodeURIComponent(emoji)}`)
      } else {
        await apiPost(`/api/messages/${message.id}/reactions`, { emoji })
      }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Falha ao reagir à mensagem.')
    }
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
        {messages.map((message) => (
          <div key={message.id} className="group relative flex gap-3 rounded-lg px-2 py-1 -mx-2 hover:bg-panel-hover/60">
            <button type="button" onClick={() => openProfile({ userId: message.authorId })} className="shrink-0">
              <Avatar url={message.authorAvatarUrl} name={message.authorDisplayName} size={38} className="mt-0.5" />
            </button>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <button type="button" onClick={() => openProfile({ userId: message.authorId })}>
                  <strong className="text-sm font-semibold text-foreground hover:underline">
                    {message.authorDisplayName}
                  </strong>
                </button>
                <span className="text-xs text-muted-foreground/70">{new Date(message.createdAt).toLocaleString()}</span>
                {message.editedAt && <span className="text-xs text-muted-foreground/50">(editado)</span>}
              </div>

              {editingId === message.id ? (
                <div className="mt-1 flex gap-2">
                  <input
                    className="field"
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    autoFocus
                  />
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
                <MessageContent text={message.content} />
              )}

              {message.attachments.map((att) => (
                <div key={att.id} className="mt-1.5">
                  {att.contentType.startsWith('image/') ? (
                    <img
                      src={att.url}
                      alt={att.fileName}
                      className="max-h-60 max-w-xs rounded-lg border border-border object-cover"
                    />
                  ) : (
                    <a
                      href={att.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border-strong bg-raised px-3 py-2 text-sm text-accent hover:underline"
                    >
                      <Paperclip size={14} /> {att.fileName}
                    </a>
                  )}
                </div>
              ))}

              {message.reactions.length > 0 && (
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  {message.reactions.map((r) => {
                    const reactedByMe = r.userIds.includes(user?.userId ?? '')
                    return (
                      <button
                        key={r.emoji}
                        type="button"
                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors ${
                          reactedByMe
                            ? 'border-accent-border bg-accent-soft text-accent'
                            : 'border-border-strong bg-raised text-muted-foreground hover:border-accent-border'
                        }`}
                        onClick={() => void toggleReaction(message, r.emoji)}
                      >
                        {r.emoji} {r.userIds.length}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {editingId !== message.id && (
              <div className="absolute right-2 top-0 z-10 hidden -translate-y-1/2 items-center gap-0.5 rounded-lg border border-border-strong bg-raised p-1 shadow-md group-hover:flex">
                <EmojiPicker onSelect={(emoji) => void toggleReaction(message, emoji)} />
                <button
                  type="button"
                  className={`icon-btn h-7 w-7 ${message.isPinned ? 'text-accent' : ''}`}
                  onClick={() => void togglePin(message)}
                  title={message.isPinned ? 'Desafixar' : 'Fixar mensagem'}
                >
                  {message.isPinned ? <PinOff size={13} /> : <Pin size={13} />}
                </button>
                {message.authorId === user?.userId && (
                  <>
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
                  </>
                )}
              </div>
            )}
          </div>
        ))}
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
        {pendingAttachment && (
          <div className="flex items-center gap-1.5 rounded-lg bg-raised px-2.5 py-1.5 text-xs text-muted-foreground">
            <Paperclip size={13} /> {pendingAttachment.fileName}
            <button type="button" className="icon-btn h-5 w-5" onClick={() => setPendingAttachment(null)}>
              <X size={12} />
            </button>
          </div>
        )}
        <label className="icon-btn cursor-pointer" title="Anexar arquivo">
          <Paperclip size={19} />
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => void handleFileChange(e)}
            disabled={isUploading}
            hidden
          />
        </label>
        <EmojiPicker onSelect={(emoji) => setContent((prev) => prev + emoji)} />
        <GifPicker onSelect={(url) => void sendGif(url)} />
        <input
          className="field"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Enviar mensagem..."
        />
        <button type="submit" className="icon-btn text-accent hover:text-accent-hover" disabled={isUploading}>
          <Send size={19} />
        </button>
      </form>
    </div>
  )
}
