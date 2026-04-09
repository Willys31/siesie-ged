import { useEffect, useState } from 'react'
import {
  Users, Shield, UserCheck, UserX, ChevronDown,
  RefreshCw, ToggleLeft, ToggleRight,
} from 'lucide-react'
import { adminService } from '../services/admin'
import { useAuth } from '../hooks/useAuth'
import toast from 'react-hot-toast'

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

const ROLES = [
  { value: 'utilisateur', label: 'Utilisateur' },
  { value: 'admin',       label: 'Admin' },
]

export default function Administration() {
  const { user: me } = useAuth()
  const [users,    setUsers]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [updating, setUpdating] = useState(null) // id of user being updated

  const load = async () => {
    setLoading(true)
    try {
      const data = await adminService.getUsers()
      setUsers(data)
    } catch (err) {
      toast.error(err.message || 'Erreur lors du chargement')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleRoleChange = async (userId, newRole) => {
    setUpdating(userId)
    try {
      const updated = await adminService.updateRole(userId, newRole)
      setUsers((prev) => prev.map((u) => (u.id === userId ? updated : u)))
      toast.success('Rôle mis à jour')
    } catch (err) {
      toast.error(err.message || 'Erreur')
    } finally {
      setUpdating(null)
    }
  }

  const handleToggleActive = async (userId) => {
    setUpdating(userId)
    try {
      const updated = await adminService.toggleActive(userId)
      setUsers((prev) => prev.map((u) => (u.id === userId ? updated : u)))
      toast.success(updated.est_actif ? 'Compte activé' : 'Compte désactivé')
    } catch (err) {
      toast.error(err.message || 'Erreur')
    } finally {
      setUpdating(null)
    }
  }

  const totalAdmins = users.filter((u) => u.role === 'admin').length
  const totalActifs = users.filter((u) => u.est_actif).length

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Shield className="w-6 h-6 text-amber-500" /> Administration
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Gestion des utilisateurs et des accès</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Utilisateurs',   value: users.length,  icon: Users,      color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' },
          { label: 'Admins',          value: totalAdmins,  icon: Shield,      color: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400' },
          { label: 'Comptes actifs',  value: totalActifs,  icon: UserCheck,   color: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' },
          { label: 'Inactifs',        value: users.length - totalActifs, icon: UserX, color: 'bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{value}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Table utilisateurs */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="font-semibold text-gray-900 dark:text-white">Liste des utilisateurs</h2>
          <button onClick={load} className="btn-secondary p-2" title="Actualiser">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {loading ? (
          <div className="divide-y divide-gray-50 dark:divide-gray-700">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4">
                <div className="skeleton w-10 h-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-4 w-40" /><div className="skeleton h-3 w-56" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800/60">
                <tr>
                  {['Utilisateur', 'Rôle', 'Statut', 'Inscription', 'Actions'].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                {users.map((u) => {
                  const isMe = u.id === me?.id
                  const busy = updating === u.id
                  const initials = u.nom_complet?.split(' ').slice(0,2).map((n)=>n[0]).join('').toUpperCase() || '?'

                  return (
                    <tr key={u.id} className={`transition-colors ${isMe ? 'bg-blue-50/40 dark:bg-blue-900/10' : 'hover:bg-gray-50/80 dark:hover:bg-gray-700/30'}`}>
                      {/* Avatar + nom */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full shrink-0 overflow-hidden">
                            {u.avatar_path
                              ? <img src={`/avatars/${u.avatar_path}`} alt="" className="w-full h-full object-cover" />
                              : <div className="w-full h-full bg-blue-800 flex items-center justify-center text-white text-xs font-bold">{initials}</div>
                            }
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 dark:text-white truncate max-w-40">
                              {u.nom_complet} {isMe && <span className="text-xs text-blue-500">(vous)</span>}
                            </p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{u.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Rôle selector */}
                      <td className="px-5 py-4">
                        {isMe ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 capitalize">
                            {u.role}
                          </span>
                        ) : (
                          <div className="relative inline-block">
                            <select
                              value={u.role}
                              disabled={busy}
                              onChange={(e) => handleRoleChange(u.id, e.target.value)}
                              className={`input py-1 pr-7 text-xs appearance-none cursor-pointer
                                ${u.role === 'admin'
                                  ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-400'
                                  : 'text-gray-700 dark:text-gray-200'
                                } ${busy ? 'opacity-50' : ''}`}
                            >
                              {ROLES.map((r) => (
                                <option key={r.value} value={r.value}>{r.label}</option>
                              ))}
                            </select>
                            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none text-gray-400" />
                          </div>
                        )}
                      </td>

                      {/* Statut */}
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                          u.est_actif
                            ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                            : 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                        }`}>
                          {u.est_actif ? 'Actif' : 'Inactif'}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="px-5 py-4 text-gray-500 dark:text-gray-400 text-xs whitespace-nowrap">
                        {fmtDate(u.date_creation)}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4">
                        {!isMe && (
                          <button
                            onClick={() => handleToggleActive(u.id)}
                            disabled={busy}
                            title={u.est_actif ? 'Désactiver ce compte' : 'Activer ce compte'}
                            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-all
                              ${u.est_actif
                                ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 dark:text-red-400'
                                : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 dark:text-emerald-400'
                              } ${busy ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            {busy
                              ? <Spinner />
                              : u.est_actif
                                ? <><ToggleRight className="w-4 h-4" /> Désactiver</>
                                : <><ToggleLeft className="w-4 h-4" /> Activer</>
                            }
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function Spinner() {
  return (
    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  )
}
