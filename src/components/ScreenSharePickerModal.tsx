import { Monitor } from 'lucide-react'
import type { ElectronScreenShareSource } from '../electron'
import Modal from './Modal'

export default function ScreenSharePickerModal({
  sources,
  onChoose,
}: {
  sources: ElectronScreenShareSource[]
  onChoose: (sourceId: string | null) => void
}) {
  return (
    <Modal title="Compartilhar tela" onClose={() => onChoose(null)} size="lg">
      {sources.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma tela ou janela disponível.</p>
      ) : (
        <div className="grid max-h-[60vh] grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3">
          {sources.map((source) => (
            <button
              key={source.id}
              type="button"
              className="flex flex-col gap-1.5 rounded-lg border border-border bg-raised p-2 text-left transition-colors hover:border-accent-border hover:bg-panel-hover"
              onClick={() => onChoose(source.id)}
            >
              <div className="flex aspect-video items-center justify-center overflow-hidden rounded-md bg-panel">
                {source.thumbnail ? (
                  <img src={source.thumbnail} alt={source.name} className="h-full w-full object-cover" />
                ) : (
                  <Monitor size={24} className="text-muted-foreground" />
                )}
              </div>
              <span className="truncate text-xs text-foreground">{source.name}</span>
            </button>
          ))}
        </div>
      )}
    </Modal>
  )
}
