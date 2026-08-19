import { useState } from 'react'
import type { FormEvent } from 'react'
import { ApiError, apiPost } from '../api/client'
import type { CategoryDto, ChannelType } from '../api/types'
import { useToast } from '../lib/ToastContext'
import Modal from './Modal'

interface Props {
  serverId: string
  categories: CategoryDto[]
  defaultCategoryId?: string | null
  onClose: () => void
  onCreated: () => Promise<void>
}

export default function CreateChannelModal({ serverId, categories, defaultCategoryId, onClose, onCreated }: Props) {
  const toast = useToast()
  const [name, setName] = useState('')
  const [type, setType] = useState<ChannelType>('Text')
  const [categoryId, setCategoryId] = useState(defaultCategoryId ?? '')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      await apiPost(`/api/servers/${serverId}/channels`, { name, type, categoryId: categoryId || null })
      await onCreated()
      onClose()
      toast.success('Canal criado!')
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Falha ao criar canal.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal title="Criar canal" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="label">
          Nome do canal
          <input className="field" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
        </label>
        <label className="label">
          Tipo
          <select className="field" value={type} onChange={(e) => setType(e.target.value as ChannelType)}>
            <option value="Text">Texto</option>
            <option value="Voice">Voz</option>
          </select>
        </label>
        {categories.length > 0 && (
          <label className="label">
            Categoria
            <select className="field" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">Sem categoria</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
          {isSubmitting ? 'Criando...' : 'Criar'}
        </button>
      </form>
    </Modal>
  )
}
