import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell, Check, ChevronLeft, ChevronRight,
  Share2, Pencil, Trash2, RotateCcw, Info,
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
  share:   { Icon: Share2,    color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400', label: 'Partage' },
  modify:  { Icon: Pencil,    color: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400', label: 'Modification' },
  delete:  { Icon: Trash2,    color: 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400',             label: 'Suppression' },
  restore: { Icon: RotateCcw, color: 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400',     label: 'Restauration' },
  system:  { Icon: Info,      color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400',         label: 'Système' },
}

const LIMIT = 20

// ── Composant principal ────────────────────────────────────────────────────────

export default function Notifications() {
  const navigate = useNavigate()

  const [notifications, setNotifications] = useState([])
  const [total,         setTotal]         = useState(0)
  const [unread,        setUnread]        = useState(0)
  const [loading,       setLoading]       = useState(true)
  const [page,          setPage]          = useState(0)

  const fetchNotifications = useCallback(async () => {
    setLoading(true)
    try {
      const data = await notificationsService.list({ skip: page * LIMIT, limit: LIMIT })
      setNotifications(data.items)
      setTotal(data.total)
      setUnread(data.unread_count)
    } catch {
      toast.error('Erreur lors du chargement des notifications')
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => { fetchNotifications() }, [fetchNotifications])

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

  const totalPages = Math.ceil(total / LIMIT)

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      {/* En-tête */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Bell className="w-6 h-6 text-gray-400 dark:text-gray-500" />
            Notifications
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {total} notification{total !== 1 ? 's' : ''}
            {unread > 0 && (
              <span className="ml-2 text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full font-medium">
                {unread} non lue{unread > 1 ? 's' : ''}
              </span>
            )}
          </p>
        </div>
        {unread > 0 && (
          <button onClick={handleMarkAll}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold
                       text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20
                       hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors">
            <Check className="w-4 h-4" />
            Tout marquer comme lu
          </button>
        )}
      </div>

      {/* Contenu */}
      {loading ? (
        <NotifSkeleton />
      ) : notifications.length === 0 ? (
        <div className="card p-16 flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center">
            <Bell className="w-8 h-8 text-gray-300 dark:text-gray-500" />
          </div>
          <div>
            <p className="font-semibold text-gray-700 dark:text-gray-200">Aucune notification</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              Vous serez notifié des partages, modifications et suppressions
            </p>
          </div>
        </div>
      ) : (
        <div className="card overflow-hidden divide-y divide-gray-50 dark:divide-gray-700">
          {notifications.map((notif) => {
            const meta = TYPE_META[notif.type] ?? TYPE_META.system
            const { Icon, color, label } = meta
            return (
              <button
                key={notif.id}
                onClick={() => handleClick(notif)}
                className={`w-full flex items-start gap-4 px-5 py-4 text-left transition-colors
                  hover:bg-gray-50 dark:hover:bg-gray-800/40
                  ${!notif.est_lue ? 'bg-blue-50/40 dark:bg-blue-900/5' : ''}`}
              >
                {/* Icône */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
                  <Icon className="w-4.5 h-4.5" />
                </div>

                {/* Contenu */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${color}`}>{label}</span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">{timeAgo(notif.date_creation)}</span>
                  </div>
                  <p className={`text-sm mt-1 leading-snug ${!notif.est_lue ? 'font-semibold text-gray-900 dark:text-white' : 'font-medium text-gray-700 dark:text-gray-200'}`}>
                    {notif.titre}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                    {notif.message}
                  </p>
                </div>

                {/* Indicateur non-lu */}
                {!notif.est_lue && (
                  <div className="w-2.5 h-2.5 bg-blue-500 rounded-full shrink-0 mt-2" />
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {page * LIMIT + 1}–{Math.min((page + 1) * LIMIT, total)} sur {total}
          </p>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage((p) => p - 1)} disabled={page === 0}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 transition-colors">
              <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-300" />
            </button>
            <span className="text-sm text-gray-600 dark:text-gray-300 font-medium px-2">{page + 1} / {totalPages}</span>
            <button onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages - 1}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 transition-colors">
              <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-300" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function NotifSkeleton() {
  return (
    <div className="card overflow-hidden divide-y divide-gray-50 dark:divide-gray-700 animate-pulse">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-start gap-4 px-5 py-4">
          <div className="skeleton w-10 h-10 rounded-xl shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="skeleton h-4 w-24 rounded-full" />
            <div className="skeleton h-4 w-52" />
            <div className="skeleton h-3 w-72" />
          </div>
        </div>
      ))}
    </div>
  )
}
