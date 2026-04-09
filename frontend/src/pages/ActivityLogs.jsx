import { useCallback, useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, ClipboardList, FileText, Filter, User } from 'lucide-react'
import { activityLogsService } from '../services/activityLogs'
import { adminService } from '../services/admin'
import { useAuth } from '../hooks/useAuth'
import toast from 'react-hot-toast'

// ── Constantes d'affichage ─────────────────────────────────────────────────

const ACTION_COLORS = {
  upload:   'bg-green-100  text-green-700  dark:bg-green-900/30  dark:text-green-400',
  restore:  'bg-green-100  text-green-700  dark:bg-green-900/30  dark:text-green-400',
  download: 'bg-blue-100   text-blue-700   dark:bg-blue-900/30   dark:text-blue-400',
  modify:   'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  delete:   'bg-red-100    text-red-700    dark:bg-red-900/30    dark:text-red-400',
  login:    'bg-gray-100   text-gray-600   dark:bg-gray-700      dark:text-gray-400',
  share:    'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
}

const ACTION_LABELS = {
  upload:   'Upload',
  restore:  'Restauration',
  download: 'Téléchargement',
  modify:   'Modification',
  delete:   'Suppression',
  login:    'Connexion',
  share:    'Partage',
}

const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString('fr-FR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : '—'

const LIMIT = 20

// ── Composant principal ────────────────────────────────────────────────────

export default function ActivityLogs() {
  const { user } = useAuth()
  const isAdmin  = user?.role === 'admin'

  const [logs,   setLogs]   = useState([])
  const [total,  setTotal]  = useState(0)
  const [loading,setLoading]= useState(true)
  const [page,   setPage]   = useState(0)

  // Filtres
  const [filterAction, setFilterAction] = useState('')
  const [filterUser,   setFilterUser]   = useState('')
  const [dateDebut,    setDateDebut]    = useState('')
  const [dateFin,      setDateFin]      = useState('')
  const [users,        setUsers]        = useState([])

  // Charger la liste des utilisateurs pour le filtre admin
  useEffect(() => {
    if (isAdmin) {
      adminService.getUsers().then(setUsers).catch(() => {})
    }
  }, [isAdmin])

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const params = {
        skip:  page * LIMIT,
        limit: LIMIT,
        ...(filterAction            && { action:     filterAction }),
        ...(isAdmin && filterUser   && { user_id:    filterUser   }),
        ...(dateDebut               && { date_debut: dateDebut    }),
        ...(dateFin                 && { date_fin:   dateFin      }),
      }
      const res = await activityLogsService.list(params)
      setLogs(res.items)
      setTotal(res.total)
    } catch {
      toast.error('Erreur lors du chargement des logs')
    } finally {
      setLoading(false)
    }
  }, [page, filterAction, filterUser, dateDebut, dateFin, isAdmin])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  // Réinitialise la page quand un filtre change
  const onFilter = (setter) => (e) => {
    setter(e.target.value)
    setPage(0)
  }

  const totalPages = Math.ceil(total / LIMIT)

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      {/* En-tête */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <ClipboardList className="w-6 h-6 text-gray-400 dark:text-gray-500" />
          Journal d'activité
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          {total} événement{total !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Filtres */}
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-gray-400 dark:text-gray-500" />
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Filtres</span>
        </div>
        <div className={`grid gap-3 ${isAdmin ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-2 lg:grid-cols-3'}`}>
          {/* Type d'action */}
          <select value={filterAction} onChange={onFilter(setFilterAction)} className="input text-sm">
            <option value="">Toutes les actions</option>
            {Object.entries(ACTION_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>

          {/* Utilisateur (admin seulement) */}
          {isAdmin && (
            <select value={filterUser} onChange={onFilter(setFilterUser)} className="input text-sm">
              <option value="">Tous les utilisateurs</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.nom_complet}</option>
              ))}
            </select>
          )}

          {/* Date début */}
          <input
            type="date"
            value={dateDebut}
            onChange={onFilter(setDateDebut)}
            className="input text-sm"
          />

          {/* Date fin */}
          <input
            type="date"
            value={dateFin}
            onChange={onFilter(setDateFin)}
            className="input text-sm"
          />
        </div>
      </div>

      {/* Tableau */}
      {loading ? (
        <LogSkeleton isAdmin={isAdmin} />
      ) : logs.length === 0 ? (
        <div className="card p-14 flex flex-col items-center gap-3 text-center">
          <ClipboardList className="w-10 h-10 text-gray-300 dark:text-gray-600" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">Aucune activité trouvée</p>
          <p className="text-sm text-gray-400 dark:text-gray-500">Essayez d'ajuster les filtres</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700">
                  <Th>Date / Heure</Th>
                  {isAdmin && <Th>Utilisateur</Th>}
                  <Th>Action</Th>
                  <Th>Document</Th>
                  <Th>Détails</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                    {/* Date */}
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap font-mono text-xs">
                      {fmtDate(log.date_action)}
                    </td>

                    {/* Utilisateur */}
                    {isAdmin && (
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span className="text-gray-700 dark:text-gray-200 whitespace-nowrap">
                            {log.user_nom || `#${log.user_id}`}
                          </span>
                        </div>
                      </td>
                    )}

                    {/* Action */}
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold
                          ${ACTION_COLORS[log.action] ?? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}
                      >
                        {ACTION_LABELS[log.action] ?? log.action}
                      </span>
                    </td>

                    {/* Document */}
                    <td className="px-4 py-3 max-w-[200px]">
                      {log.document_titre ? (
                        <div className="flex items-center gap-1.5 min-w-0">
                          <FileText className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span className="text-gray-700 dark:text-gray-200 truncate">
                            {log.document_titre}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500">—</span>
                      )}
                    </td>

                    {/* Détails */}
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs max-w-[200px] truncate">
                      {log.details || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {page * LIMIT + 1}–{Math.min((page + 1) * LIMIT, total)} sur {total}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => p - 1)}
                  disabled={page === 0}
                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700
                             disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                </button>
                <span className="text-xs text-gray-600 dark:text-gray-300 font-medium px-2">
                  {page + 1} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= totalPages - 1}
                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700
                             disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Th({ children }) {
  return (
    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
      {children}
    </th>
  )
}

function LogSkeleton({ isAdmin }) {
  const cols = isAdmin ? 5 : 4
  return (
    <div className="card overflow-hidden animate-pulse">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="flex gap-4 px-4 py-3.5 border-b border-gray-100 dark:border-gray-700">
          <div className="skeleton h-4 w-32" />
          {isAdmin && <div className="skeleton h-4 w-28" />}
          <div className="skeleton h-5 w-20 rounded-full" />
          <div className="skeleton h-4 w-40" />
          <div className="skeleton h-4 w-24" />
        </div>
      ))}
    </div>
  )
}
