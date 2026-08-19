import { AnimatePresence, motion } from 'framer-motion'
import { Smile } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

const EMOJIS = [
  '😀', '😂', '😅', '😊', '😍', '😘', '😜', '🤔', '😎', '🥳',
  '😢', '😭', '😡', '😱', '🥺', '😴', '🤒', '🤯', '🥶', '😇',
  '👍', '👎', '👏', '🙌', '🙏', '💪', '🤝', '👋', '✌️', '🤙',
  '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💔', '💯',
  '🔥', '✨', '🎉', '🎊', '🎁', '🏆', '⭐', '💀', '👀', '💤',
  '🐶', '🐱', '🐭', '🐹', '🦊', '🐻', '🐼', '🐸', '🐵', '🦄',
  '🍕', '🍔', '🍟', '🌮', '🍩', '🍦', '☕', '🍺', '🎮', '🎧',
]

export default function EmojiPicker({ onSelect }: { onSelect: (emoji: string) => void }) {
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

  return (
    <div className="relative" ref={rootRef}>
      <button type="button" className="icon-btn" onClick={() => setOpen((v) => !v)} title="Emoji">
        <Smile size={19} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            className="card absolute bottom-full left-0 z-50 mb-2 grid w-64 grid-cols-7 gap-0.5 overflow-y-auto p-2 shadow-pop"
            style={{ maxHeight: 220 }}
            initial={{ opacity: 0, scale: 0.95, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 6 }}
            transition={{ duration: 0.12 }}
          >
            {EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                className="rounded-md p-1 text-lg leading-none hover:bg-panel-hover"
                onClick={() => {
                  onSelect(emoji)
                  setOpen(false)
                }}
              >
                {emoji}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
