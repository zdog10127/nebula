import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom'
import ProtectedRoute from './auth/ProtectedRoute'
import { isElectron } from './lib/platform'
import { ToastProvider } from './lib/ToastContext'
import ChannelView from './pages/ChannelView'
import DmChatView from './pages/DmChatView'
import DmView from './pages/DmView'
import FriendsPage from './pages/FriendsPage'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import AppShell from './pages/AppShell'
import ServerView, { ServerIndexRedirect } from './pages/ServerView'
import WelcomePage from './pages/WelcomePage'

export default function App() {
  return (
    <ToastProvider>
      <Router>
        <Routes>
          <Route path="/" element={isElectron() ? <Navigate to="/login" replace /> : <LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/app" element={<AppShell />}>
              <Route index element={<WelcomePage />} />
              <Route path="dm" element={<DmView />}>
                <Route index element={<FriendsPage />} />
                <Route path=":dmChannelId" element={<DmChatView />} />
              </Route>
              <Route path="servers/:serverId" element={<ServerView />}>
                <Route index element={<ServerIndexRedirect />} />
                <Route path="channels/:channelId" element={<ChannelView />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </ToastProvider>
  )
}
