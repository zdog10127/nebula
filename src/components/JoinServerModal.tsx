import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiError, apiPost } from '../api/client'
import type { ServerSummary } from '../api/types'
import { useToast } from '../lib/ToastContext'
import { useServers } from '../servers/ServersContext'
import Modal from './Modal'

export default function JoinServerModal({ onClose }: { onClose: () => void }) {
  const { refresh } = useServers()
  const navigate = useNavigate()
  const toast = useToast()
  const [code, setCode] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const server = await apiPost<ServerSummary>(`/api/servers/join/${encodeURIComponent(code.trim())}`)
      await refresh()
      onClose()
      navigate(`/app/servers/${server.id}`)
      toast.success(`Você entrou em ${server.name}!`)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Convite inválido.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal title="Entrar com convite" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="label">
          Código do convite
          <input className="field" value={code} onChange={(e) => setCode(e.target.value)} required autoFocus />
        </label>
        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
          {isSubmitting ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </Modal>
  )
}
