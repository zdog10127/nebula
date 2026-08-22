import { Check, Gamepad2, MessageSquare, UserMinus, UserPlus, X } from 'lucide-react'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiError } from '../api/client'
import Avatar from '../components/Avatar'
import { STATUS_DOT_CLASS, STATUS_LABEL } from '../lib/presence'
import { useToast } from '../lib/ToastContext'
import { useSocial } from '../social/SocialContext'

export default function FriendsPage() {
  const { friends, friendRequests, sendFriendRequest, acceptFriendRequest, declineFriendRequest, cancelFriendRequest, removeFriend, getOrCreateDmChannel } =
    useSocial()
  const toast = useToast()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [isSending, setIsSending] = useState(false)

  const incoming = friendRequests.filter((r) => r.isIncoming)
  const outgoing = friendRequests.filter((r) => !r.isIncoming)

  async function handleSendRequest(e: FormEvent) {
    e.preventDefault()
    const trimmed = username.trim()
    if (!trimmed) return
    setIsSending(true)
    try {
      await sendFriendRequest(trimmed)
      toast.success(`Pedido de amizade enviado para ${trimmed}.`)
      setUsername('')
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Falha ao enviar pedido de amizade.')
    } finally {
      setIsSending(false)
    }
  }

  async function handleMessage(userId: string) {
    try {
      const channel = await getOrCreateDmChannel(userId)
      navigate(`/app/dm/${channel.id}`)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Falha ao abrir conversa.')
    }
  }

  return (
    <div className="flex-1 overflow-y-auto bg-panel px-6 py-6">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-5 text-xl font-semibold text-foreground">Amigos</h1>

        <form onSubmit={handleSendRequest} className="card mb-6 flex items-center gap-2 p-4">
          <input
            className="field"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Nome de usuário de quem você quer adicionar"
          />
          <button type="submit" className="btn btn-primary shrink-0" disabled={isSending || !username.trim()}>
            <UserPlus size={16} />
            Enviar pedido
          </button>
        </form>

        {incoming.length > 0 && (
          <section className="mb-6">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground/70">
              Pedidos recebidos — {incoming.length}
            </h2>
            <div className="flex flex-col gap-1.5">
              {incoming.map((r) => (
                <div key={r.id} className="card flex items-center gap-3 p-3">
                  <Avatar url={r.avatarUrl} name={r.displayName} size={36} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-foreground">{r.displayName}</div>
                    <div className="truncate text-xs text-muted-foreground">@{r.username}</div>
                  </div>
                  <button
                    type="button"
                    className="icon-btn h-8 w-8 text-online"
                    title="Aceitar"
                    onClick={() => void acceptFriendRequest(r.id)}
                  >
                    <Check size={16} />
                  </button>
                  <button
                    type="button"
                    className="icon-btn h-8 w-8 hover:text-dnd"
                    title="Recusar"
                    onClick={() => void declineFriendRequest(r.id)}
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {outgoing.length > 0 && (
          <section className="mb-6">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground/70">
              Pedidos enviados — {outgoing.length}
            </h2>
            <div className="flex flex-col gap-1.5">
              {outgoing.map((r) => (
                <div key={r.id} className="card flex items-center gap-3 p-3">
                  <Avatar url={r.avatarUrl} name={r.displayName} size={36} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-foreground">{r.displayName}</div>
                    <div className="truncate text-xs text-muted-foreground">Aguardando resposta...</div>
                  </div>
                  <button
                    type="button"
                    className="icon-btn h-8 w-8 hover:text-dnd"
                    title="Cancelar pedido"
                    onClick={() => void cancelFriendRequest(r.id)}
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground/70">
            Todos os amigos — {friends.length}
          </h2>
          {friends.length === 0 ? (
            <p className="text-sm text-muted-foreground">Você ainda não tem amigos adicionados.</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {friends.map((f) => (
                <div key={f.userId} className="card flex items-center gap-3 p-3">
                  <span className="relative shrink-0">
                    <Avatar url={f.avatarUrl} name={f.displayName} size={36} />
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-panel ${STATUS_DOT_CLASS[f.status]}`}
                      title={STATUS_LABEL[f.status]}
                    />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-foreground">{f.displayName}</div>
                    {f.currentActivity ? (
                      <div className="flex items-center gap-1 truncate text-xs text-accent">
                        <Gamepad2 size={11} className="shrink-0" />
                        <span className="truncate">Jogando {f.currentActivity}</span>
                      </div>
                    ) : (
                      <div className="truncate text-xs text-muted-foreground">{STATUS_LABEL[f.status]}</div>
                    )}
                  </div>
                  <button
                    type="button"
                    className="icon-btn h-8 w-8"
                    title="Enviar mensagem"
                    onClick={() => void handleMessage(f.userId)}
                  >
                    <MessageSquare size={16} />
                  </button>
                  <button
                    type="button"
                    className="icon-btn h-8 w-8 hover:text-dnd"
                    title="Remover amigo"
                    onClick={() => void removeFriend(f.userId)}
                  >
                    <UserMinus size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
