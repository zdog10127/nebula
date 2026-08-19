import { useState } from 'react'
import type { FormEvent } from 'react'
import { ApiError, apiPost } from '../api/client'
import { useToast } from '../lib/ToastContext'
import Modal from './Modal'

interface Props {
  serverId: string
  onClose: () => void
  onCreated: () => Promise<void>
}

export default function CreateCategoryModal({ serverId, onClose, onCreated }: Props) {
  const toast = useToast()
  const [name, setName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      await apiPost(`/api/servers/${serverId}/categories`, { name })
      await onCreated()
      onClose()
      toast.success('Categoria criada!')
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Falha ao criar categoria.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal title="Criar categoria" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="label">
          Nome da categoria
          <input className="field" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
        </label>
        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
          {isSubmitting ? 'Criando...' : 'Criar'}
        </button>
      </form>
    </Modal>
  )
}
