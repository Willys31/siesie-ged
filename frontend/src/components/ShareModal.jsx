import { useCallback, useEffect, useState } from 'react'
import { Loader2, Share2, Shield, Users, X } from 'lucide-react'
import { sharesService } from '../services/shares'
import { usersService } from '../services/users'
import toast from 'react-hot-toast'

// ── Composant principal ────────────────────────────────────────────────────────

export default function ShareModal({ doc, isOpen, onClose }) {
  const [query,        setQuery]        = useState('')
  const [suggestions,  setSuggestions]  = useState([])
  const [selectedUser, setSelectedUser] = useState(null)
  const [permission,   setPermission]   = useState('lecture')
  const [shares,       setShares]       = useState([])
  const [sharing,      setSharing]      = useState(false)
  const [revoking,     setRevoking]     = useState(null)  // shareId en cours

  const fetchShares = useCallback(async () => {
    if (!doc?.id) return
    try {
      const data = await sharesService.getShares(doc.id)
      setShares(data)
    } catch {}
  }, [doc?.id])

  // Charger les partages existants à l'ouverture
  useEffect(() => {
    if (isOpen) {
      fetchShares()
      setQuery('')
      setSelectedUser(null)
      setSuggestions([])
      setPermission('lecture')
    }
  }, [isOpen, fetchShares])

  // Autocomplete avec debounce
  useEffect(() => {
    if (!query.trim() || selectedUser) {
      setSuggestions([])
      return
    }
    const timer = setTimeout(async () => {
      try {
        const results = await usersService.search(query)
        // Filtrer les utilisateurs déjà partagés
        const sharedIds = new Set(shares.map((s) => s.shared_with_id))
        setSuggestions(results.filter((u) => !sharedIds.has(u.id)))
      } catch {}
    }, 300)
    return () => clearTimeout(timer)
  }, [query, selectedUser, shares])

  const handleSelectUser = (user) => {
    setSelectedUser(user)
    setQuery(user.nom_complet)
    setSuggestions([])
  }

  const handleClearUser = () => {
    setSelectedUser(null)
    setQuery('')
    setSuggestions([])
  }

  const handleShare = async () => {
    if (!selectedUser || !doc) return
    setSharing(true)
    try {
      await sharesService.shareDocument(doc.id, { user_id: selectedUser.id, permission })
      toast.success(`Document partagé avec ${selectedUser.nom_complet}`)
      handleClearUser()
      fetchShares()
    } catch (err) {
      toast.error(err.message || 'Erreur lors du partage')
    } finally {
      setSharing(false)
    }
  }

  const handleRevoke = async (shareId) => {
    if (!doc) return
    setRevoking(shareId)
    try {
      await sharesService.revokeShare(doc.id, shareId)
      toast.success('Partage révoqué')
      fetchShares()
    } catch (err) {
      toast.error(err.message || 'Erreur lors de la révocation')
    } finally {
      setRevoking(null)
    }
  }

  if (!isOpen || !doc) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md border border-gray-100 dark:border-gray-700">
        {/* En-tête */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <Share2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">Partager le document</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-56">« {doc.titre} »</p>
            </div>
          </div>
          <button onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-4">
          {/* Champ de recherche utilisateur */}
          <div className="relative">
            <div className="relative">
              <input
                type="text"
                placeholder="Rechercher par nom ou email…"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setSelectedUser(null) }}
                className="input w-full pr-8"
                autoComplete="off"
              />
              {selectedUser && (
                <button
                  onClick={handleClearUser}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Suggestions */}
            {suggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 z-10 bg-white dark:bg-gray-700
                              border border-gray-100 dark:border-gray-600 rounded-xl shadow-lg overflow-hidden">
                {suggestions.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => handleSelectUser(u)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors text-left"
                  >
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-700 dark:text-blue-400 text-xs font-bold shrink-0">
                      {u.nom_complet?.[0]?.toUpperCase() ?? '?'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{u.nom_complet}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{u.email}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Permission + bouton */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Shield className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={permission}
                onChange={(e) => setPermission(e.target.value)}
                className="input w-full pl-8"
              >
                <option value="lecture">Lecture seule</option>
                <option value="modification">Modification</option>
              </select>
            </div>
            <button
              onClick={handleShare}
              disabled={!selectedUser || sharing}
              className="btn-primary shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sharing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Partager'}
            </button>
          </div>

          {/* Liste des partages existants */}
          {shares.length > 0 && (
            <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
              <div className="flex items-center gap-1.5 mb-3">
                <Users className="w-3.5 h-3.5 text-gray-400" />
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Partagé avec ({shares.length})
                </p>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {shares.map((share) => (
                  <div key={share.id} className="flex items-center justify-between gap-3 py-1">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center text-gray-600 dark:text-gray-300 text-xs font-bold shrink-0">
                        {share.shared_with_nom?.[0]?.toUpperCase() ?? '?'}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm text-gray-800 dark:text-gray-200 truncate">{share.shared_with_nom}</p>
                        <span className={`text-xs font-medium ${share.permission === 'modification' ? 'text-orange-500 dark:text-orange-400' : 'text-blue-500 dark:text-blue-400'}`}>
                          {share.permission === 'modification' ? 'Modification' : 'Lecture seule'}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRevoke(share.id)}
                      disabled={revoking === share.id}
                      className="text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400 transition-colors shrink-0 disabled:opacity-50"
                    >
                      {revoking === share.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Révoquer'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
