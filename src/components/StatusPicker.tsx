import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import type { PresenceStatus } from '../api/types'
import { useChatHub } from '../hubs/ChatHubContext'
import { STATUS_DOT_CLASS } from '../lib/presence'

const OPTIONS: { value: PresenceStatus; label: string }[] = [
  { value: 'Online', label: 'Online' },
  { value: 'Away', label: 'Ausente' },
  { value: 'DoNotDisturb', label: 'Não perturbe' },
  { value: 'Invisible', label: 'Invisível' },
]

export default function StatusPicker() {
  const connection = useChatHub()
  const [status, setStatus] = useState<PresenceStatus>('Online')
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  function select(value: PresenceStatus) {
    setStatus(value)
    setOpen(false)
    void connection?.invoke('SetStatus', value)
  }

  return (
    <div className="relative shrink-0" ref={rootRef}>
      <button
        type="button"
        className="icon-btn"
        onClick={() => setOpen((v) => !v)}
        title="Status"
      >
        <span className={`h-2.5 w-2.5 rounded-full ring-2 ring-panel ${STATUS_DOT_CLASS[status]}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            className="card absolute bottom-full left-0 z-50 mb-2 w-40 p-1.5 shadow-pop"
            initial={{ opacity: 0, scale: 0.95, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 6 }}
            transition={{ duration: 0.12 }}
          >
            {OPTIONS.map((o) => (
              <button
                key={o.value}
                type="button"
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-foreground hover:bg-panel-hover"
                onClick={() => select(o.value)}
              >
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${STATUS_DOT_CLASS[o.value]}`} />
                {o.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
