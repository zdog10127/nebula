import { DownloadCloud, RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { isElectron } from '../lib/platform'
import { useToast } from '../lib/ToastContext'

type UpdateState =
  | { phase: 'idle' }
  | { phase: 'available'; version: string }
  | { phase: 'downloading'; percent: number }
  | { phase: 'downloaded'; version: string }

// Renders nothing in the browser — auto-update only exists for the packaged desktop app
// (electron-updater in electron/main.cjs, bridged in via preload.cjs). Every release is
// published by hand-uploading a new Nebula-Setup.exe + latest.yml to the same S3/CloudFront
// `downloads/` folder the exe already lives in, so there's no delta/differential download —
// clicking "Baixar agora" always pulls the full new installer.
export default function UpdateBanner() {
  const toast = useToast()
  const [state, setState] = useState<UpdateState>({ phase: 'idle' })

  useEffect(() => {
    const updater = window.electronUpdater
    if (!isElectron() || !updater) return

    const offAvailable = updater.onAvailable((info) => setState({ phase: 'available', version: info.version }))
    const offNotAvailable = updater.onNotAvailable(() => toast.info('Você já está na versão mais recente.'))
    const offProgress = updater.onProgress((progress) =>
      setState({ phase: 'downloading', percent: Math.round(progress.percent) }),
    )
    const offDownloaded = updater.onDownloaded((info) => setState({ phase: 'downloaded', version: info.version }))
    const offError = updater.onError((message) => toast.error(`Falha ao verificar atualizações: ${message}`))

    return () => {
      offAvailable()
      offNotAvailable()
      offProgress()
      offDownloaded()
      offError()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!isElectron() || state.phase === 'idle') return null

  return (
    <div className="pointer-events-none fixed bottom-4 left-4 z-200">
      <div className="pointer-events-auto flex items-center gap-3 rounded-xl border border-accent-border bg-accent-soft px-4 py-3 shadow-elevated">
        <span className="shrink-0 text-accent">
          {state.phase === 'downloaded' ? <RefreshCw size={18} /> : <DownloadCloud size={18} />}
        </span>

        <div className="min-w-0">
          {state.phase === 'available' && (
            <p className="text-sm text-foreground">Nova versão disponível (v{state.version})</p>
          )}
          {state.phase === 'downloading' && (
            <>
              <p className="text-sm text-foreground">Baixando atualização... {state.percent}%</p>
              <div className="mt-1.5 h-1 w-40 overflow-hidden rounded-full bg-raised">
                <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${state.percent}%` }} />
              </div>
            </>
          )}
          {state.phase === 'downloaded' && (
            <p className="text-sm text-foreground">Atualização v{state.version} pronta para instalar</p>
          )}
        </div>

        {state.phase === 'available' && (
          <button
            type="button"
            className="btn btn-primary shrink-0 px-3 py-1.5 text-sm"
            onClick={() => void window.electronUpdater?.download()}
          >
            Baixar agora
          </button>
        )}
        {state.phase === 'downloaded' && (
          <button
            type="button"
            className="btn btn-primary shrink-0 px-3 py-1.5 text-sm"
            onClick={() => void window.electronUpdater?.install()}
          >
            Reiniciar e instalar
          </button>
        )}
      </div>
    </div>
  )
}
