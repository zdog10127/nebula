import { lazy, Suspense } from 'react'
import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom'
import ProtectedRoute from './auth/ProtectedRoute'
import LoadingScreen from './components/LoadingScreen'
import UpdateBanner from './components/UpdateBanner'
import { isElectron } from './lib/platform'
import { ToastProvider } from './lib/ToastContext'

// Every route is its own chunk instead of one big bundle loaded up front. This matters most
// for the packaged desktop app: it boots straight to /login (see the redirect below), which
// used to drag in everything reachable from AppShell too — VoiceCallProvider and, through it,
// the livekit-client SDK, plus every page component — before the person had even signed in.
// Now the login screen only pays for its own code; AppShell (and voice/video) only loads once
// someone actually gets past auth.
const LandingPage = lazy(() => import('./pages/LandingPage'))
const LoginPage = lazy(() => import('./pages/LoginPage'))
const RegisterPage = lazy(() => import('./pages/RegisterPage'))
const AppShell = lazy(() => import('./pages/AppShell'))
const WelcomePage = lazy(() => import('./pages/WelcomePage'))
const DmView = lazy(() => import('./pages/DmView'))
const FriendsPage = lazy(() => import('./pages/FriendsPage'))
const DmChatView = lazy(() => import('./pages/DmChatView'))
const ChannelView = lazy(() => import('./pages/ChannelView'))
const ServerView = lazy(() => import('./pages/ServerView'))
const ServerIndexRedirect = lazy(() =>
  import('./pages/ServerView').then((m) => ({ default: m.ServerIndexRedirect })),
)

export default function App() {
  return (
    <ToastProvider>
      <UpdateBanner />
      <Router>
        <Suspense fallback={<LoadingScreen />}>
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
        </Suspense>
      </Router>
    </ToastProvider>
  )
}
