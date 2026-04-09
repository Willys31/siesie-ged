import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  Home, FolderOpen, UploadCloud, Search, Trash2, ClipboardList,
  FileText, LogOut, ChevronDown, Menu, Sun, Moon, Shield, UserCircle, Users,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useDarkMode } from '../context/DarkModeContext'
import { documentsService } from '../services/documents'
import { API_BASE_URL } from '../services/api'
import NotificationBell from './NotificationBell'
import toast from 'react-hot-toast'

const NAV = [
  { to: '/',              label: 'Tableau de bord',    icon: Home,        end: true  },
  { to: '/documents',     label: 'Documents',          icon: FolderOpen,  end: false },
  { to: '/shared-with-me',label: 'Partagés avec moi',  icon: Users,       end: false },
  { to: '/upload',        label: 'Upload',             icon: UploadCloud, end: false },
  { to: '/search',        label: 'Recherche',          icon: Search,      end: false },
  { to: '/corbeille',     label: 'Corbeille',          icon: Trash2,      end: false, badge: true },
]

const ADMIN_NAV = [
  { to: '/admin',          label: 'Administration',    icon: Shield,        end: false },
  { to: '/activity-logs',  label: "Journal d'activité", icon: ClipboardList, end: false },
]

function NavItem({ to, label, icon: Icon, end, onClick, badgeCount }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
         transition-all duration-150 ${
           isActive
             ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
             : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100'
         }`
      }
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span className="flex-1">{label}</span>
      {badgeCount > 0 && (
        <span className="ml-auto text-xs font-bold bg-red-500 text-white rounded-full px-1.5 py-0.5 min-w-[20px] text-center leading-tight">
          {badgeCount > 99 ? '99+' : badgeCount}
        </span>
      )}
    </NavLink>
  )
}

function Sidebar({ open, onClose, user }) {
  const [trashCount, setTrashCount] = useState(0)

  useEffect(() => {
    if (!user) return
    documentsService.listTrash({ limit: 1 })
      .then((res) => setTrashCount(res.total))
      .catch(() => {})
  }, [user])

  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-black/20 z-20 lg:hidden" onClick={onClose} />
      )}
      <aside
        className={`
          fixed left-0 top-0 h-screen w-60
          bg-white dark:bg-gray-900
          border-r border-gray-100 dark:border-gray-800
          flex flex-col z-30 transition-transform duration-300
          ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-gray-100 dark:border-gray-800">
          <div className="w-9 h-9 bg-blue-800 rounded-xl flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-gray-900 dark:text-white text-sm leading-tight">SieSie</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 truncate">Gestion documentaire</p>
          </div>
        </div>

        {/* Nav principale */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV.map(({ to, label, icon, end, badge }) => (
            <NavItem
              key={to}
              to={to}
              label={label}
              icon={icon}
              end={end}
              onClick={onClose}
              badgeCount={badge ? trashCount : 0}
            />
          ))}

          {/* Section Admin */}
          {user?.role === 'admin' && (
            <>
              <div className="px-2 pt-5 pb-1.5">
                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                  Administration
                </p>
              </div>
              {ADMIN_NAV.map(({ to, label, icon, end }) => (
                <NavItem key={to} to={to} label={label} icon={icon} end={end} onClick={onClose} />
              ))}
            </>
          )}
        </nav>

        <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-800">
          <p className="text-xs text-gray-400 dark:text-gray-600">v1.0.0</p>
        </div>
      </aside>
    </>
  )
}

function DarkToggle() {
  const { dark, toggleDark } = useDarkMode()
  return (
    <button
      onClick={toggleDark}
      title={dark ? 'Passer en mode clair' : 'Passer en mode sombre'}
      className="p-2 rounded-xl text-gray-500 dark:text-gray-400
                 hover:bg-gray-100 dark:hover:bg-gray-800
                 transition-all duration-200"
    >
      <span className="relative w-5 h-5 block">
        <Sun
          className={`w-5 h-5 absolute inset-0 transition-all duration-300
            ${dark ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 rotate-90 scale-50'}`}
        />
        <Moon
          className={`w-5 h-5 absolute inset-0 transition-all duration-300
            ${dark ? 'opacity-0 -rotate-90 scale-50' : 'opacity-100 rotate-0 scale-100'}`}
        />
      </span>
    </button>
  )
}

function Avatar({ user, size = 'sm' }) {
  const sz = size === 'sm' ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm'
  const initials = user?.nom_complet
    ?.split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase() || '?'

  if (user?.avatar_path) {
    return (
      <img
        src={`${API_BASE_URL}/avatars/${user.avatar_path}`}
        alt={user.nom_complet}
        className={`${sz} rounded-full object-cover shrink-0 border-2 border-white dark:border-gray-700`}
      />
    )
  }
  return (
    <div className={`${sz} bg-blue-800 rounded-full flex items-center justify-center text-white font-bold shrink-0`}>
      {initials}
    </div>
  )
}

function Header({ onMenuToggle }) {
  const { user, logout } = useAuth()
  const navigate         = useNavigate()
  const [open, setOpen]  = useState(false)

  const handleLogout = () => {
    setOpen(false)
    logout()
    toast.success('Déconnexion réussie')
    navigate('/login', { replace: true })
  }

  const roleBadge = user?.role === 'admin'
    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
    : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'

  return (
    <header className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-5 h-14 flex items-center justify-between shrink-0 transition-colors duration-300">
      <button
        className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        onClick={onMenuToggle}
      >
        <Menu className="w-5 h-5 text-gray-600 dark:text-gray-400" />
      </button>
      <div className="hidden lg:block" />

      <div className="flex items-center gap-2">
        <DarkToggle />
        <NotificationBell />

        <div className="relative">
          <button
            onClick={() => setOpen(!open)}
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-150"
          >
            <Avatar user={user} size="sm" />
            <div className="hidden sm:block text-left min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-white leading-tight truncate max-w-32">
                {user?.nom_complet}
              </p>
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium capitalize ${roleBadge}`}>
                {user?.role}
              </span>
            </div>
            <ChevronDown
              className={`w-4 h-4 text-gray-400 dark:text-gray-500 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
            />
          </button>

          {open && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
              <div className="absolute right-0 mt-1.5 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 py-1.5 z-20 animate-fade-in">
                <div className="px-4 py-2.5 border-b border-gray-100 dark:border-gray-700">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Mon compte</p>
                  <p className="text-sm text-gray-800 dark:text-gray-200 font-medium mt-0.5 truncate">{user?.email}</p>
                </div>
                <button
                  onClick={() => { setOpen(false); navigate('/profile') }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors mt-1"
                >
                  <UserCircle className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                  Mon profil
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Se déconnecter
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

export default function Layout() {
  const { user } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100 dark:bg-gray-950 transition-colors duration-300">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} user={user} />
      <div className="flex-1 flex flex-col min-w-0 lg:ml-60">
        <Header onMenuToggle={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
        <footer className="shrink-0 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 px-6 py-3 transition-colors duration-300">
          <p className="text-xs text-gray-400 dark:text-gray-600 text-center">
            © 2025 SieSie. Tous droits réservés.
          </p>
        </footer>
      </div>
    </div>
  )
}
