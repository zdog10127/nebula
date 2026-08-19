import { AnimatePresence, motion } from 'framer-motion'
import { Clapperboard, Search } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { apiGet } from '../api/client'
import type { GifResultDto, GifSearchResult } from '../api/types'

export default function GifPicker({ onSelect }: { onSelect: (url: string) => void }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GifResultDto[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasError, setHasError] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  useEffect(() => {
    if (!open) return
    const handle = setTimeout(() => {
      setIsLoading(true)
      setHasError(false)
      const path = query.trim() ? `/api/gifs/search?q=${encodeURIComponent(query.trim())}` : '/api/gifs/trending'
      apiGet<GifSearchResult>(path)
        .then((result) => setResults(result.results))
        .catch(() => {
          setResults([])
          setHasError(true)
        })
        .finally(() => setIsLoading(false))
    }, 350)
    return () => clearTimeout(handle)
  }, [query, open])

  return (
    <div className="relative" ref={rootRef}>
      <button type="button" className="icon-btn" onClick={() => setOpen((v) => !v)} title="GIF">
        <Clapperboard size={19} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            className="card shadow-pop absolute bottom-full left-0 z-50 mb-2 w-80 p-2"
            initial={{ opacity: 0, scale: 0.95, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 6 }}
            transition={{ duration: 0.12 }}
          >
            <div className="relative mb-2">
              <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                className="field pl-8"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar GIFs..."
                autoFocus
              />
            </div>
            <div className="grid max-h-72 grid-cols-2 gap-1.5 overflow-y-auto">
              {isLoading && <p className="col-span-2 py-6 text-center text-xs text-muted-foreground">Carregando...</p>}
              {!isLoading && hasError && (
                <p className="col-span-2 py-6 text-center text-xs text-muted-foreground">
                  Busca de GIF indisponível no momento.
                </p>
              )}
              {!isLoading && !hasError && results.length === 0 && (
                <p className="col-span-2 py-6 text-center text-xs text-muted-foreground">Nenhum GIF encontrado.</p>
              )}
              {results.map((gif) => (
                <button
                  key={gif.id}
                  type="button"
                  className="overflow-hidden rounded-md bg-raised hover:opacity-80"
                  onClick={() => {
                    onSelect(gif.url)
                    setOpen(false)
                    setQuery('')
                  }}
                >
                  <img src={gif.previewUrl} alt="" className="h-24 w-full object-cover" />
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
