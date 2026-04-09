import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import Layout from './components/Layout'
import Landing        from './pages/Landing'
import Login          from './pages/Login'
import Dashboard      from './pages/Dashboard'
import Documents      from './pages/Documents'
import DocumentDetail from './pages/DocumentDetail'
import Upload         from './pages/Upload'
import Search         from './pages/Search'
import Profile        from './pages/Profile'
import Administration from './pages/Administration'
import Corbeille      from './pages/Corbeille'
import ActivityLogs   from './pages/ActivityLogs'
import Notifications  from './pages/Notifications'
import SharedWithMe   from './pages/SharedWithMe'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <FullPageSpinner />
  return user ? children : <Navigate to="/landing" replace />
}

function AdminRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <FullPageSpinner />
  if (!user) return <Navigate to="/landing" replace />
  if (user.role !== 'admin') return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/landing" element={<Landing />} />
      <Route path="/login" element={<Login />} />

      <Route
        path="/"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index                   element={<Dashboard />} />
        <Route path="documents"        element={<Documents />} />
        <Route path="documents/:id"    element={<DocumentDetail />} />
        <Route path="upload"           element={<Upload />} />
        <Route path="search"           element={<Search />} />
        <Route path="profile"          element={<Profile />} />
        <Route path="corbeille"        element={<Corbeille />} />
        <Route path="activity-logs"    element={<ActivityLogs />} />
        <Route path="notifications"    element={<Notifications />} />
        <Route path="shared-with-me"   element={<SharedWithMe />} />
        <Route path="admin"            element={<AdminRoute><Administration /></AdminRoute>} />
      </Route>

      <Route path="*" element={<Navigate to="/landing" replace />} />
    </Routes>
  )
}

function FullPageSpinner() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-blue-800 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Chargement…</p>
      </div>
    </div>
  )
}
