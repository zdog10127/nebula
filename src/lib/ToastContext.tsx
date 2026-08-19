import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, Info, X, XCircle } from 'lucide-react'
import { createContext, useCallback, useContext, useState } from 'react'
import type { ReactNode } from 'react'

type ToastVariant = 'error' | 'success' | 'info'

interface ToastItem {
  id: number
  message: string
  variant: ToastVariant
}

interface ToastContextValue {
  error: (message: string) => void
  success: (message: string) => void
  info: (message: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

let nextId = 0

const VARIANT_STYLES: Record<ToastVariant, string> = {
  error: 'border-dnd/40 bg-dnd/10',
  success: 'border-online/40 bg-online/10',
  info: 'border-accent-border bg-accent-soft',
}

const VARIANT_ICON_COLOR: Record<ToastVariant, string> = {
  error: 'text-dnd',
  success: 'text-online',
  info: 'text-accent',
}

function VariantIcon({ variant }: { variant: ToastVariant }) {
  if (variant === 'error') return <XCircle size={18} />
  if (variant === 'success') return <CheckCircle2 size={18} />
  return <Info size={18} />
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const push = useCallback(
    (message: string, variant: ToastVariant) => {
      const id = ++nextId
      setToasts((prev) => [...prev, { id, message, variant }])
      setTimeout(() => dismiss(id), 4500)
    },
    [dismiss],
  )

  const value: ToastContextValue = {
    error: (message) => push(message, 'error'),
    success: (message) => push(message, 'success'),
    info: (message) => push(message, 'info'),
  }

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-200 flex w-full max-w-sm flex-col gap-2">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 60, transition: { duration: 0.15 } }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className={`pointer-events-auto flex items-start gap-2.5 rounded-xl border px-4 py-3 shadow-elevated ${VARIANT_STYLES[t.variant]}`}
            >
              <span className={`mt-0.5 shrink-0 ${VARIANT_ICON_COLOR[t.variant]}`}>
                <VariantIcon variant={t.variant} />
              </span>
              <span className="flex-1 text-sm text-foreground">{t.message}</span>
              <button
                type="button"
                className="shrink-0 text-muted-foreground opacity-70 hover:opacity-100"
                onClick={() => dismiss(t.id)}
                aria-label="Fechar"
              >
                <X size={14} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
