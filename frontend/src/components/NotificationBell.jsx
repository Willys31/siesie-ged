import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell, Share2, Pencil, Trash2, RotateCcw, Info, Check, ExternalLink,
} from 'lucide-react'
import { notificationsService } from '../services/notifications'
import toast from 'react-hot-toast'

// ── Helpers ────────────────────────────────────────────────────────────────────

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'À l\'instant'
  if (m < 60) return `il y a ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `il y a ${h}h`
  return `il y a ${Math.floor(h / 24)}j`
}

const TYPE_META = {
  share:   { Icon: Share2,    color: 'text-purple-500 bg-purple-50 dark:bg-purple-900/30' },
  modify:  { Icon: Pencil,    color: 'text-orange-500 bg-orange-50 dark:bg-orange-900/30' },
  delete:  { Icon: Trash2,    color: 'text-red-500 bg-red-50 dark:bg-red-900/30' },
  restore: { Icon: RotateCcw, color: 'text-green-500 bg-green-50 dark:bg-green-900/30' },
  system:  { Icon: Info,      color: 'text-blue-500 bg-blue-50 dark:bg-blue-900/30' },
}

function NotifIcon({ type }) {
  const meta = TYPE_META[type] ?? TYPE_META.system
  const { Icon, color } = meta
  return (
    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${color}`}>
      <Icon className="w-3.5 h-3.5" />
    </div>
  )
}

// ── Composant principal ────────────────────────────────────────────────────────

export default function NotificationBell() {
  const navigate                      = useNavigate()
  const [open,         setOpen]        = useState(false)
  const [unread,       setUnread]      = useState(0)
  const [notifications,setNotifications] = useState([])
  const [loading,      setLoading]     = useState(false)
  const dropdownRef                   = useRef(null)

  // ── Polling du badge toutes les 30 s ─────────────────────────────────────────
  const fetchUnread = useCallback(async () => {
    try {
      const data = await notificationsService.getUnreadCount()
      setUnread(data.count)
    } catch {}
  }, [])

  useEffect(() => {
    fetchUnread()
    const id = setInterval(fetchUnread, 30000)
    return () => clearInterval(id)
  }, [fetchUnread])

  // ── Charger les 10 dernières notifs à l'ouverture ─────────────────────────────
  useEffect(() => {
    if (!open) return
    setLoading(true)
    notificationsService.list({ skip: 0, limit: 10 })
      .then((data) => setNotifications(data.items))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [open])

  // ── Fermer le dropdown au clic extérieur ──────────────────────────────────────
  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // ── Actions ───────────────────────────────────────────────────────────────────
  const handleClick = async (notif) => {
    if (!notif.est_lue) {
      try {
        await notificationsService.markRead(notif.id)
        setNotifications((prev) =>
          prev.map((n) => n.id === notif.id ? { ...n, est_lue: true } : n)
        )
        setUnread((u) => Math.max(0, u - 1))
      } catch {}
    }
    if (notif.document_id) {
      setOpen(false)
      navigate(`/documents/${notif.document_id}`)
    }
  }

  const handleMarkAll = async () => {
    try {
      await notificationsService.markAllRead()
      setNotifications((prev) => prev.map((n) => ({ ...n, est_lue: true })))
      setUnread(0)
      toast.success('Toutes les notifications marquées comme lues')
    } catch {
      toast.error('Erreur')
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bouton cloche */}
      <button
        onClick={() => setOpen((o) => !o)}
        title="Notifications"
        className="relative p-2 rounded-xl text-gray-500 dark:text-gray-400
                   hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200"
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white
                           text-[10px] font-bold rounded-full flex items-center justify-center px-1">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 mt-1.5 w-80 bg-white dark:bg-gray-800 rounded-xl
                        shadow-xl border border-gray-100 dark:border-gray-700 z-50 animate-fade-in overflow-hidden">
          {/* En-tête */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              Notifications
              {unread > 0 && (
                <span className="ml-2 text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded-full">
                  {unread}
                </span>
              )}
            </p>
            {unread > 0 && (
              <button
                onClick={handleMarkAll}
                className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
              >
                <Check className="w-3 h-3" /> Tout lire
              </button>
            )}
          </div>

          {/* Liste */}
          <div className="max-h-[360px] overflow-y-auto">
            {loading ? (
              <div className="py-10 flex justify-center">
                <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-10 text-center">
                <Bell className="w-8 h-8 text-gray-200 dark:text-gray-600 mx-auto mb-2" />
                <p className="text-sm text-gray-400 dark:text-gray-500">Aucune notification</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <button
                  key={notif.id}
                  onClick={() => handleClick(notif)}
                  className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors
                    hover:bg-gray-50 dark:hover:bg-gray-700/50
                    ${!notif.est_lue ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
                >
                  <NotifIcon type={notif.type} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm leading-tight ${!notif.est_lue ? 'font-semibold text-gray-900 dark:text-white' : 'font-medium text-gray-700 dark:text-gray-200'}`}>
                      {notif.titre}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                      {notif.message}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      {timeAgo(notif.date_creation)}
                    </p>
                  </div>
                  {!notif.est_lue && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full shrink-0 mt-1.5" />
                  )}
                </button>
              ))
            )}
          </div>

          {/* Pied */}
          <div className="border-t border-gray-100 dark:border-gray-700 px-4 py-2.5">
            <button
              onClick={() => { setOpen(false); navigate('/notifications') }}
              className="w-full flex items-center justify-center gap-1.5 text-xs text-blue-600 dark:text-blue-400
                         hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              Voir toutes les notifications
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
