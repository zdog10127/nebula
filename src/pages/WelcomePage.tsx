import { Sparkles } from 'lucide-react'
import { useServers } from '../servers/ServersContext'

export default function WelcomePage() {
  const { servers, isLoading } = useServers()

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-panel px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-accent">
        <Sparkles size={26} />
      </div>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : servers.length === 0 ? (
        <>
          <h2 className="text-xl">Bem-vindo</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            Você ainda não tem nenhum server. Crie um ou entre com um convite pela barra à esquerda.
          </p>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">Selecione um server na barra à esquerda.</p>
      )}
    </div>
  )
}
