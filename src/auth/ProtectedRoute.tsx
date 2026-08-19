import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './AuthContext'

export default function ProtectedRoute() {
  const { user, isLoading } = useAuth()

  if (isLoading)
    return <div className="flex flex-1 items-center justify-center bg-canvas text-muted-foreground">Carregando...</div>
  if (!user) return <Navigate to="/login" replace />

  return <Outlet />
}
