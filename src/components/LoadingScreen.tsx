import NebulaLoader from './NebulaLoader'

// Drop-in replacement for the old plain "Carregando..." text blocks (login redirect check,
// protected-route auth check, etc). Takes over the same `flex-1` slot those used.
export default function LoadingScreen({ label = 'Carregando...' }: { label?: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-canvas text-muted-foreground">
      <NebulaLoader size={32} />
      <p className="text-sm">{label}</p>
    </div>
  )
}
