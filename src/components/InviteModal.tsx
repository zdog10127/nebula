import { Check, Copy, RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { ApiError, apiPost } from '../api/client'
import type { InviteDto } from '../api/types'
import { useToast } from '../lib/ToastContext'
import Modal from './Modal'

export default function InviteModal({ serverId, onClose }: { serverId: string; onClose: () => void }) {
  const toast = useToast()
  const [invite, setInvite] = useState<InviteDto | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    createInvite()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function createInvite() {
    setIsCreating(true)
    try {
      const result = await apiPost<InviteDto>(`/api/servers/${serverId}/invites`, {})
      setInvite(result)
      setCopied(false)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Falha ao criar convite.')
    } finally {
      setIsCreating(false)
    }
  }

  async function copyCode() {
    if (!invite) return
    try {
      await navigator.clipboard.writeText(invite.code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      toast.error('Não foi possível copiar o código.')
    }
  }

  return (
    <Modal title="Convidar para o server" onClose={onClose}>
      <div className="flex flex-col gap-4">
        {invite && (
          <div>
            <p className="mb-2 text-sm text-muted-foreground">Compartilhe este código:</p>
            <div className="flex items-center gap-2 rounded-lg border border-border-strong bg-raised px-3 py-2.5">
              <code className="flex-1 text-center text-lg tracking-wider text-foreground">{invite.code}</code>
              <button type="button" className="icon-btn" onClick={() => void copyCode()} title="Copiar código">
                {copied ? <Check size={16} className="text-online" /> : <Copy size={16} />}
              </button>
            </div>
          </div>
        )}
        <button type="button" className="btn btn-secondary" onClick={() => void createInvite()} disabled={isCreating}>
          <RefreshCw size={15} className={isCreating ? 'animate-spin' : ''} />
          {isCreating ? 'Gerando...' : 'Gerar novo convite'}
        </button>
      </div>
    </Modal>
  )
}
