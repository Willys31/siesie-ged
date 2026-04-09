import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ChevronLeft, ChevronRight, Download, Eye, Shield, Users,
} from 'lucide-react'
import { sharesService } from '../services/shares'
import { documentsService, triggerDownload } from '../services/documents'
import FileIcon from '../components/FileIcon'
import DocumentPreview from '../components/DocumentPreview'
import toast from 'react-hot-toast'

const LIMIT   = 12
const fmtSize = (b) => { if (!b) return '—'; if (b < 1024 ** 2) return `${(b / 1024).toFixed(0)} Ko`; return `${(b / 1024 ** 2).toFixed(1)} Mo` }
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

export default function SharedWithMe() {
  const navigate = useNavigate()

  const [docs,       setDocs]       = useState([])
  const [total,      setTotal]      = useState(0)
  const [loading,    setLoading]    = useState(true)
  const [page,       setPage]       = useState(0)
  const [previewDoc, setPreviewDoc] = useState(null)

  const fetchShared = useCallback(async () => {
    setLoading(true)
    try {
      const data = await sharesService.listSharedWithMe({ skip: page * LIMIT, limit: LIMIT })
      setDocs(data.items)
      setTotal(data.total)
    } catch {
      toast.error('Erreur lors du chargement des documents partagés')
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => { fetchShared() }, [fetchShared])

  const handleDownload = async (doc) => {
    try {
      const blob = await documentsService.download(doc.id)
      const ext  = doc.type_fichier?.split('/')[1] || ''
      triggerDownload(blob, `${doc.titre}${ext ? '.' + ext : ''}`)
      toast.success('Téléchargement démarré')
    } catch { toast.error('Erreur lors du téléchargement') }
  }

  const totalPages = Math.ceil(total / LIMIT)

  return (
    <div className="space-y-5 animate-fade-in">
      {/* En-tête */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Users className="w-6 h-6 text-gray-400 dark:text-gray-500" />
          Partagés avec moi
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          {total} document{total !== 1 ? 's' : ''} partagé{total !== 1 ? 's' : ''} avec vous
        </p>
      </div>

      {/* Contenu */}
      {loading ? (
        <SharedSkeleton />
      ) : docs.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-20 text-center">
          <Users className="w-12 h-12 text-gray-200 dark:text-gray-600 mb-3" />
          <p className="font-medium text-gray-500 dark:text-gray-400">Aucun document partagé</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
            Les documents partagés avec vous apparaîtront ici
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {docs.map((doc) => (
            <SharedDocCard
              key={doc.share_id}
              doc={doc}
              onDownload={handleDownload}
              onPreview={setPreviewDoc}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {page * LIMIT + 1}–{Math.min((page + 1) * LIMIT, total)} sur {total}
          </p>
          <div className="flex gap-2 items-center">
            <button onClick={() => setPage((p) => p - 1)} disabled={page === 0}
              className="btn-secondary p-2 disabled:opacity-40">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 text-sm font-medium text-gray-700 dark:text-gray-300">{page + 1} / {totalPages}</span>
            <button onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages - 1}
              className="btn-secondary p-2 disabled:opacity-40">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {previewDoc && (
        <DocumentPreview
          doc={previewDoc}
          docs={docs}
          onClose={() => setPreviewDoc(null)}
          onNavigate={setPreviewDoc}
        />
      )}
    </div>
  )
}

function SharedDocCard({ doc, onDownload, onPreview }) {
  return (
    <div className="card p-4 flex flex-col gap-3 hover:shadow-md dark:hover:shadow-gray-950/30 transition-all duration-200 group">
      {/* Icône + badge partagé */}
      <div className="flex items-start justify-between">
        <button onClick={() => onPreview(doc)} className="focus:outline-none" title="Aperçu">
          <FileIcon mimeOrExt={doc.type_fichier} size="md" />
        </button>
        <PermissionBadge permission={doc.permission} />
      </div>

      {/* Titre */}
      <div className="flex-1 min-w-0">
        <Link
          to={`/documents/${doc.id}`}
          className="font-semibold text-gray-900 dark:text-white text-sm block truncate hover:text-blue-700 dark:hover:text-blue-400 transition-colors"
        >
          {doc.titre}
        </Link>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
          Partagé par <span className="font-medium">{doc.shared_by_nom ?? 'Inconnu'}</span>
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500">{fmtDate(doc.date_partage)}</p>
      </div>

      {/* Taille + actions */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400 dark:text-gray-500">{fmtSize(doc.taille_fichier)}</span>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onPreview(doc)}
            title="Aperçu"
            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDownload(doc)}
            title="Télécharger"
            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Tags */}
      {doc.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {doc.tags.slice(0, 3).map((t) => (
            <span key={t.id} className="badge bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">{t.nom}</span>
          ))}
        </div>
      )}
    </div>
  )
}

function PermissionBadge({ permission }) {
  const isModif = permission === 'modification'
  return (
    <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full shrink-0
      ${isModif
        ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400'
        : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
      }`}>
      <Shield className="w-3 h-3" />
      {isModif ? 'Modif.' : 'Lecture'}
    </span>
  )
}

function SharedSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="card p-4 space-y-3 animate-pulse">
          <div className="skeleton w-10 h-10 rounded-xl" />
          <div className="skeleton h-4 w-3/4" />
          <div className="skeleton h-3 w-1/2" />
        </div>
      ))}
    </div>
  )
}
