import { useCallback, useEffect, useState } from 'react'
import { FolderOpen, RotateCcw, Trash2, X } from 'lucide-react'
import { documentsService } from '../services/documents'
import FileIcon from '../components/FileIcon'
import ConfirmModal from '../components/ConfirmModal'
import { useAuth } from '../hooks/useAuth'
import toast from 'react-hot-toast'

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'

const fmtSize = (b) => {
  if (!b) return '—'
  if (b < 1024 ** 2) return `${(b / 1024).toFixed(1)} Ko`
  return `${(b / 1024 ** 2).toFixed(1)} Mo`
}

export default function Corbeille() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'

  const [docs,         setDocs]         = useState([])
  const [total,        setTotal]        = useState(0)
  const [loading,      setLoading]      = useState(true)
  const [confirmEmpty, setConfirmEmpty] = useState(false)
  const [confirmDel,   setConfirmDel]   = useState(null)   // doc à supprimer définitivement
  const [processingId, setProcessingId] = useState(null)
  const [emptying,     setEmptying]     = useState(false)

  const fetchTrash = useCallback(async () => {
    setLoading(true)
    try {
      const res = await documentsService.listTrash({ limit: 100 })
      setDocs(res.items)
      setTotal(res.total)
    } catch {
      toast.error('Erreur lors du chargement de la corbeille')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchTrash() }, [fetchTrash])

  const handleRestore = async (doc) => {
    setProcessingId(doc.id)
    try {
      await documentsService.restore(doc.id)
      toast.success(`« ${doc.titre} » restauré`)
      fetchTrash()
    } catch {
      toast.error('Erreur lors de la restauration')
    } finally {
      setProcessingId(null)
    }
  }

  const handlePermanentDelete = async () => {
    const doc = confirmDel
    setConfirmDel(null)
    setProcessingId(doc.id)
    try {
      await documentsService.deletePermanently(doc.id)
      toast.success(`« ${doc.titre} » supprimé définitivement`)
      fetchTrash()
    } catch {
      toast.error('Erreur lors de la suppression')
    } finally {
      setProcessingId(null)
    }
  }

  const handleEmptyTrash = async () => {
    setConfirmEmpty(false)
    setEmptying(true)
    try {
      const res = await documentsService.emptyTrash()
      toast.success(`${res.count} document(s) supprimé(s) définitivement`)
      setDocs([])
      setTotal(0)
    } catch {
      toast.error('Erreur lors du vidage de la corbeille')
    } finally {
      setEmptying(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* En-tête */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Trash2 className="w-6 h-6 text-gray-400 dark:text-gray-500" />
            Corbeille
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {total} document{total !== 1 ? 's' : ''} archivé{total !== 1 ? 's' : ''}
          </p>
        </div>
        {total > 0 && (
          <button
            onClick={() => setConfirmEmpty(true)}
            disabled={emptying}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold
                       text-white bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600
                       transition-colors disabled:opacity-50 shrink-0"
          >
            <Trash2 className="w-4 h-4" />
            {isAdmin ? 'Vider la corbeille' : 'Tout supprimer'}
          </button>
        )}
      </div>

      {/* Contenu */}
      {loading ? (
        <TrashSkeleton />
      ) : docs.length === 0 ? (
        <div className="card p-16 flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center">
            <FolderOpen className="w-8 h-8 text-gray-300 dark:text-gray-500" />
          </div>
          <div>
            <p className="font-semibold text-gray-700 dark:text-gray-200">La corbeille est vide</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              Les documents archivés apparaîtront ici
            </p>
          </div>
        </div>
      ) : (
        <div className="card overflow-hidden divide-y divide-gray-100 dark:divide-gray-700">
          {docs.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
            >
              <FileIcon mimeOrExt={doc.type_fichier} size="sm" />

              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                  {doc.titre}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  Archivé le {fmtDate(doc.date_modification)} · {fmtSize(doc.taille_fichier)}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {/* Restaurer */}
                <button
                  onClick={() => handleRestore(doc)}
                  disabled={processingId === doc.id}
                  title="Restaurer"
                  className="flex items-center gap-1.5 text-xs font-semibold
                             text-green-700 dark:text-green-400
                             bg-green-50 dark:bg-green-900/20
                             hover:bg-green-100 dark:hover:bg-green-900/40
                             px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Restaurer
                </button>

                {/* Supprimer définitivement (admin uniquement) */}
                {isAdmin && (
                  <button
                    onClick={() => setConfirmDel(doc)}
                    disabled={processingId === doc.id}
                    title="Supprimer définitivement"
                    className="flex items-center gap-1.5 text-xs font-semibold
                               text-red-600 dark:text-red-400
                               bg-red-50 dark:bg-red-900/20
                               hover:bg-red-100 dark:hover:bg-red-900/40
                               px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <X className="w-3.5 h-3.5" />
                    Supprimer
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirmation — vider la corbeille */}
      <ConfirmModal
        open={confirmEmpty}
        title="Vider la corbeille ?"
        message={`Cette action supprimera définitivement ${total} document(s) ainsi que tous leurs fichiers. Impossible d'annuler.`}
        confirmLabel="Vider la corbeille"
        loading={emptying}
        onConfirm={handleEmptyTrash}
        onCancel={() => setConfirmEmpty(false)}
      />

      {/* Confirmation — supprimer un document */}
      <ConfirmModal
        open={!!confirmDel}
        title="Supprimer définitivement ?"
        message={
          confirmDel
            ? `« ${confirmDel.titre} » sera supprimé définitivement avec tous ses fichiers. Cette action est irréversible.`
            : ''
        }
        confirmLabel="Supprimer définitivement"
        loading={processingId === confirmDel?.id}
        onConfirm={handlePermanentDelete}
        onCancel={() => setConfirmDel(null)}
      />
    </div>
  )
}

function TrashSkeleton() {
  return (
    <div className="card overflow-hidden divide-y divide-gray-100 dark:divide-gray-700 animate-pulse">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-4">
          <div className="skeleton w-10 h-10 rounded-xl shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="skeleton h-4 w-56" />
            <div className="skeleton h-3 w-36" />
          </div>
          <div className="skeleton h-8 w-24 rounded-lg" />
        </div>
      ))}
    </div>
  )
}
