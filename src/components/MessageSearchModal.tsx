import { Search } from 'lucide-react'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { apiGet } from '../api/client'
import type { MessageDto } from '../api/types'
import Avatar from './Avatar'
import MessageContent from './MessageContent'
import Modal from './Modal'

export default function MessageSearchModal({ channelId, onClose }: { channelId: string; onClose: () => void }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<MessageDto[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  async function runSearch(e: FormEvent) {
    e.preventDefault()
    const trimmed = query.trim()
    if (!trimmed) return
    setIsSearching(true)
    try {
      const list = await apiGet<MessageDto[]>(`/api/channels/${channelId}/messages/search?q=${encodeURIComponent(trimmed)}`)
      setResults(list)
      setHasSearched(true)
    } finally {
      setIsSearching(false)
    }
  }

  return (
    <Modal title="Buscar mensagens" onClose={onClose} size="lg">
      <form className="mb-3 flex gap-2" onSubmit={(e) => void runSearch(e)}>
        <input
          className="field"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar neste canal..."
          autoFocus
        />
        <button type="submit" className="btn btn-primary shrink-0" disabled={isSearching || !query.trim()}>
          <Search size={16} />
          Buscar
        </button>
      </form>

      <div className="flex max-h-[55vh] flex-col gap-3 overflow-y-auto">
        {isSearching && <p className="py-6 text-center text-sm text-muted-foreground">Buscando...</p>}
        {!isSearching && hasSearched && results.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma mensagem encontrada.</p>
        )}
        {!isSearching &&
          results.map((m) => (
            <div key={m.id} className="flex gap-3 rounded-lg border border-border p-3">
              <Avatar url={m.authorAvatarUrl} name={m.authorDisplayName} size={32} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <strong className="text-sm font-semibold text-foreground">{m.authorDisplayName}</strong>
                  <span className="text-xs text-muted-foreground/70">{new Date(m.createdAt).toLocaleString()}</span>
                </div>
                <MessageContent text={m.content} />
              </div>
            </div>
          ))}
      </div>
    </Modal>
  )
}
