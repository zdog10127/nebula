import {
  Download,
  Image as ImageIcon,
  LogIn,
  Mic,
  Monitor,
  Music,
  ShieldCheck,
  Smile,
  Users,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import NebulaLogo from '../components/NebulaLogo'
import ThemeBackdrop from '../components/ThemeBackdrop'

const FEATURES = [
  {
    icon: Mic,
    title: 'Chamadas de voz e vídeo',
    description: 'Entre em uma sala com um clique, veja quem está falando ou mutado, e compartilhe sua tela.',
  },
  {
    icon: Monitor,
    title: 'Compartilhamento de tela',
    description: 'Mostre o que está fazendo para o resto do servidor em tempo real, direto do navegador.',
  },
  {
    icon: ShieldCheck,
    title: 'Cargos e permissões',
    description: 'Crie cargos personalizados com cores e permissões específicas para organizar sua comunidade.',
  },
  {
    icon: Users,
    title: 'Categorias e canais',
    description: 'Organize seu servidor em categorias, canais de texto e de voz do jeito que fizer sentido pra você.',
  },
  {
    icon: ImageIcon,
    title: 'GIFs e avatares animados',
    description: 'Busque e envie GIFs direto no chat, e use imagens animadas como avatar e banner de perfil.',
  },
  {
    icon: Music,
    title: 'Escuta compartilhada',
    description: 'Compartilhe um vídeo do YouTube ou um áudio com a sala e ouçam juntos, em sincronia.',
  },
  {
    icon: Smile,
    title: 'Perfis personalizados',
    description: 'Bio, pronomes, status personalizado e banner — deixe seu perfil com a sua cara.',
  },
]

export default function LandingPage() {
  return (
    <div className="flex-1 overflow-y-auto bg-canvas">
      <header className="sticky top-0 z-20 border-b border-border bg-canvas/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <NebulaLogo size={28} />
            <span className="text-lg font-semibold text-foreground">Nébula</span>
          </div>
          <Link to="/login" className="btn btn-secondary">
            <LogIn size={16} />
            Entrar
          </Link>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden px-6 pb-20 pt-20 text-center">
          <ThemeBackdrop />

          <div className="relative z-10 mx-auto max-w-2xl">
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              Sua comunidade, do seu jeito
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
              Nébula é uma plataforma de chat e voz para comunidades: servidores, canais, cargos, chamadas de voz e
              vídeo, tudo em um só lugar. Use direto no navegador ou baixe o app para Windows.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link to="/login" className="btn btn-primary px-6 py-3 text-base">
                <LogIn size={18} />
                Usar no navegador
              </Link>
              <a href="/downloads/Nebula-Setup.exe" className="btn btn-secondary px-6 py-3 text-base">
                <Download size={18} />
                Baixar para Windows
              </a>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Gratuito. Não precisa instalar nada para usar pelo navegador.
            </p>
          </div>
        </section>

        <section className="border-t border-border px-6 py-16">
          <div className="mx-auto max-w-6xl">
            <div className="mx-auto max-w-xl text-center">
              <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">Tudo que a sua comunidade precisa</h2>
              <p className="mt-3 text-sm text-muted-foreground">
                Feito para conversar, jogar e ficar em contato com o pessoal.
              </p>
            </div>

            <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map(({ icon: Icon, title, description }) => (
                <div key={title} className="card flex flex-col gap-3 p-6 text-left">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent">
                    <Icon size={20} />
                  </div>
                  <h3 className="text-base font-semibold text-foreground">{title}</h3>
                  <p className="text-sm text-muted-foreground">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-border px-6 py-16">
          <div className="card relative mx-auto flex max-w-4xl flex-col items-center gap-4 overflow-hidden p-10 text-center">
            <div className="pointer-events-none absolute -bottom-24 left-1/2 h-[300px] w-[300px] -translate-x-1/2 rounded-full bg-accent/10 blur-[100px]" />
            <h2 className="relative z-10 text-2xl font-semibold text-foreground">Pronto para começar?</h2>
            <p className="relative z-10 max-w-md text-sm text-muted-foreground">
              Crie sua conta pelo navegador em segundos, ou baixe o app para Windows e tenha a bandeja do sistema,
              notificações e um app dedicado só para o Nébula.
            </p>
            <div className="relative z-10 mt-2 flex flex-wrap items-center justify-center gap-3">
              <Link to="/register" className="btn btn-primary px-6 py-3 text-base">
                Criar conta
              </Link>
              <a href="/downloads/Nebula-Setup.exe" className="btn btn-secondary px-6 py-3 text-base">
                <Download size={18} />
                Baixar app
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border px-6 py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} NovaCode.
      </footer>
    </div>
  )
}
