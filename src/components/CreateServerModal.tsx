import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiError, apiPost } from '../api/client'
import type { ServerSummary } from '../api/types'
import { useToast } from '../lib/ToastContext'
import { useServers } from '../servers/ServersContext'
import Modal from './Modal'

export default function CreateServerModal({ onClose }: { onClose: () => void }) {
  const { refresh } = useServers()
  const navigate = useNavigate()
  const toast = useToast()
  const [name, setName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const server = await apiPost<ServerSummary>('/api/servers', { name })
      await refresh()
      onClose()
      navigate(`/app/servers/${server.id}`)
      toast.success('Servidor criado!')
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Falha ao criar server.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal title="Criar server" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="label">
          Nome do server
          <input className="field" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} autoFocus />
        </label>
        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
          {isSubmitting ? 'Criando...' : 'Criar'}
        </button>
      </form>
    </Modal>
  )
}
