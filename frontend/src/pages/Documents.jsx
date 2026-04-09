import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Grid3x3, List, Download, Trash2, MoreVertical, Plus,
  RefreshCw, ChevronLeft, ChevronRight, Filter, Eye, Share2,
} from 'lucide-react'
import { useDocuments } from '../hooks/useDocuments'
import { useAuth } from '../hooks/useAuth'
import { documentsService, triggerDownload } from '../services/documents'
import FileIcon from '../components/FileIcon'
import ConfirmModal from '../components/ConfirmModal'
import DocumentPreview from '../components/DocumentPreview'
import ShareModal from '../components/ShareModal'
import toast from 'react-hot-toast'

const LIMIT   = 12
const fmtSize = (b) => { if (!b) return '—'; if (b < 1024**2) return `${(b/1024).toFixed(0)} Ko`; return `${(b/1024**2).toFixed(1)} Mo` }
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { day:'2-digit', month:'short', year:'numeric' }) : '—'
const fmtType = (t) => { if (!t) return '—'; const p = t.split('/'); return (p[1]||p[0]).toUpperCase().slice(0,6) }

const TYPE_OPTS = [
  { value:'', label:'Tous les types' },
  { value:'pdf', label:'PDF' },
  { value:'word', label:'Word' },
  { value:'spreadsheet', label:'Excel' },
  { value:'image', label:'Images' },
]

export default function Documents() {
  const { documents, total, loading, fetchDocuments } = useDocuments()
  const { user } = useAuth()
  const navigate = useNavigate()
  const isAdmin = user?.role === 'admin'

  const [view,       setView]      = useState(() => localStorage.getItem('docView') || 'grid')
  const [search,     setSearch]    = useState('')
  const [typeF,      setTypeF]     = useState('')
  const [page,       setPage]      = useState(0)
  const [menuId,     setMenuId]    = useState(null)
  const [toArchive,  setToArchive] = useState(null)
  const [archiving,  setArchiving] = useState(false)
  const [previewDoc, setPreviewDoc]= useState(null)
  const [shareDoc,   setShareDoc]  = useState(null)

  const skip  = page * LIMIT
  const pages = Math.ceil(total / LIMIT)

  useEffect(() => { fetchDocuments({ skip, limit: LIMIT }) }, [skip, fetchDocuments])
  useEffect(() => { localStorage.setItem('docView', view) }, [view])

  const filtered = documents.filter((d) => {
    const q = search.toLowerCase()
    return (
      (!q || d.titre.toLowerCase().includes(q) || d.description?.toLowerCase().includes(q)) &&
      (!typeF || d.type_fichier?.toLowerCase().includes(typeF))
    )
  })

  const handleDownload = async (doc) => {
    try {
      const blob = await documentsService.download(doc.id)
      const ext  = doc.chemin_stockage?.split('.').pop() || ''
      triggerDownload(blob, `${doc.titre}${ext ? '.'+ext : ''}`)
      toast.success('Téléchargement démarré')
    } catch { toast.error('Erreur lors du téléchargement') }
  }

  const handleArchive = async () => {
    if (!toArchive) return
    setArchiving(true)
    try {
      await documentsService.archive(toArchive.id)
      toast.success('Document archivé')
      setToArchive(null)
      fetchDocuments({ skip, limit: LIMIT })
    } catch (err) { toast.error(err.message || 'Erreur') }
    finally { setArchiving(false) }
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {isAdmin ? 'Tous les documents' : 'Mes documents'}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {total} document{total !== 1 ? 's' : ''}{isAdmin ? ' (tous utilisateurs)' : ''}
          </p>
        </div>
        <button onClick={() => navigate('/upload')} className="btn-primary">
          <Plus className="w-4 h-4" /> Nouveau
        </button>
      </div>

      {/* Filtres */}
      <div className="card px-4 py-3 flex flex-wrap items-center gap-3">
        <input className="input flex-1 min-w-44" placeholder="Recherche rapide…"
          value={search} onChange={(e) => { setSearch(e.target.value); setPage(0) }} />
        <select className="input w-44" value={typeF}
          onChange={(e) => { setTypeF(e.target.value); setPage(0) }}>
          {TYPE_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <button onClick={() => fetchDocuments({ skip, limit: LIMIT })} className="btn-secondary p-2.5" title="Actualiser">
          <RefreshCw className="w-4 h-4" />
        </button>
        <div className="flex bg-gray-100 dark:bg-gray-700 rounded-xl p-1 gap-0.5">
          {[['grid', Grid3x3],['list', List]].map(([v, Icon]) => (
            <button key={v} onClick={() => setView(v)}
              className={`p-2 rounded-lg transition-all ${view===v ? 'bg-white dark:bg-gray-600 shadow-sm text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'}`}>
              <Icon className="w-4 h-4" />
            </button>
          ))}
        </div>
      </div>

      {/* Liste */}
      {loading ? (
        <SkeletonGrid view={view} />
      ) : filtered.length === 0 ? (
        <EmptyState />
      ) : view === 'grid' ? (
        <GridView docs={filtered} onDownload={handleDownload} onArchive={setToArchive}
          onPreview={setPreviewDoc} onShare={setShareDoc} menuId={menuId} setMenuId={setMenuId} />
      ) : (
        <ListView docs={filtered} onDownload={handleDownload} onArchive={setToArchive}
          onPreview={setPreviewDoc} onShare={setShareDoc} />
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500 dark:text-gray-400">{skip+1}–{Math.min(skip+LIMIT,total)} sur {total}</p>
          <div className="flex gap-2 items-center">
            <button onClick={() => setPage((p) => p-1)} disabled={page===0}
              className="btn-secondary p-2 disabled:opacity-40"><ChevronLeft className="w-4 h-4" /></button>
            <span className="px-3 text-sm font-medium text-gray-700 dark:text-gray-300">{page+1} / {pages}</span>
            <button onClick={() => setPage((p) => p+1)} disabled={page>=pages-1}
              className="btn-secondary p-2 disabled:opacity-40"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      )}

      <ConfirmModal open={!!toArchive} title="Archiver ce document ?"
        message={`"${toArchive?.titre}" sera archivé et n'apparaîtra plus dans votre liste.`}
        confirmLabel="Archiver" loading={archiving} onConfirm={handleArchive} onCancel={() => setToArchive(null)} />

      <ShareModal doc={shareDoc} isOpen={!!shareDoc} onClose={() => setShareDoc(null)} />

      {previewDoc && (
        <DocumentPreview
          doc={previewDoc}
          docs={filtered}
          onClose={() => setPreviewDoc(null)}
          onNavigate={setPreviewDoc}
        />
      )}
    </div>
  )
}

function SkeletonGrid({ view }) {
  return view === 'grid' ? (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {[...Array(8)].map((_,i) => (
        <div key={i} className="card p-4 space-y-3">
          <div className="skeleton w-10 h-10 rounded-xl" />
          <div className="skeleton h-4 w-3/4" /><div className="skeleton h-3 w-1/2" />
        </div>
      ))}
    </div>
  ) : (
    <div className="card overflow-hidden divide-y divide-gray-50 dark:divide-gray-700">
      {[...Array(6)].map((_,i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3.5">
          <div className="skeleton w-9 h-9 rounded-xl" />
          <div className="flex-1 space-y-2"><div className="skeleton h-4 w-48" /><div className="skeleton h-3 w-32" /></div>
        </div>
      ))}
    </div>
  )
}

function EmptyState() {
  const navigate = useNavigate()
  return (
    <div className="card flex flex-col items-center justify-center py-20 text-center">
      <Filter className="w-12 h-12 text-gray-200 dark:text-gray-600 mb-3" />
      <p className="font-medium text-gray-500 dark:text-gray-400">Aucun document trouvé</p>
      <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Modifiez vos filtres ou importez un document</p>
      <button onClick={() => navigate('/upload')} className="btn-primary mt-5 text-sm">Importer</button>
    </div>
  )
}

function DocMenu({ doc, onDownload, onArchive, onPreview, onShare, open, onToggle }) {
  return (
    <div className="relative">
      <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggle() }}
        className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all">
        <MoreVertical className="w-4 h-4" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={(e) => { e.stopPropagation(); onToggle() }} />
          <div className="absolute right-0 top-7 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 py-1.5 z-20 animate-fade-in">
            <button onClick={(e) => { e.stopPropagation(); onPreview(doc); onToggle() }}
              className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700">
              <Eye className="w-4 h-4 text-blue-400 dark:text-blue-500" /> Aperçu
            </button>
            <Link to={`/documents/${doc.id}`}
              className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700">
              <Eye className="w-4 h-4 text-gray-400 dark:text-gray-500" /> Voir le détail
            </Link>
            <button onClick={() => { onDownload(doc); onToggle() }}
              className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700">
              <Download className="w-4 h-4 text-gray-400 dark:text-gray-500" /> Télécharger
            </button>
            <button onClick={() => { onShare(doc); onToggle() }}
              className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700">
              <Share2 className="w-4 h-4 text-purple-400 dark:text-purple-500" /> Partager
            </button>
            <div className="border-t border-gray-100 dark:border-gray-700 my-1" />
            <button onClick={() => { onArchive(doc); onToggle() }}
              className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
              <Trash2 className="w-4 h-4" /> Archiver
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function GridView({ docs, onDownload, onArchive, onPreview, onShare, menuId, setMenuId }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {docs.map((doc) => (
        <div
          key={doc.id}
          className="card p-4 flex flex-col gap-3 hover:shadow-md dark:hover:shadow-gray-950/30 transition-all duration-200 group"
          onDoubleClick={() => onPreview(doc)}
          title="Double-clic pour aperçu"
        >
          <div className="flex items-start justify-between">
            <button
              onClick={() => onPreview(doc)}
              className="focus:outline-none"
              title="Aperçu"
            >
              <FileIcon mimeOrExt={doc.type_fichier} size="md"
                className="hover:ring-2 hover:ring-blue-400/50 transition-all" />
            </button>
            <DocMenu doc={doc} onDownload={onDownload} onArchive={onArchive} onPreview={onPreview} onShare={onShare}
              open={menuId===doc.id} onToggle={() => setMenuId(menuId===doc.id ? null : doc.id)} />
          </div>
          <div className="flex-1 min-w-0">
            <Link to={`/documents/${doc.id}`}
              className="font-semibold text-gray-900 dark:text-white text-sm block truncate hover:text-blue-700 dark:hover:text-blue-400 transition-colors">
              {doc.titre}
            </Link>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{fmtDate(doc.date_upload)}</p>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400 dark:text-gray-500">{fmtSize(doc.taille_fichier)}</span>
            {doc.type_fichier && <span className="badge bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">{fmtType(doc.type_fichier)}</span>}
          </div>
          {doc.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {doc.tags.slice(0,3).map((t) => <span key={t.id} className="badge bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">{t.nom}</span>)}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function ListView({ docs, onDownload, onArchive, onPreview, onShare }) {
  return (
    <div className="card overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-700">
          <tr>
            {['Document','Type','Date','Taille',''].map((h) => (
              <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
          {docs.map((doc) => (
            <tr
              key={doc.id}
              className="hover:bg-gray-50/80 dark:hover:bg-gray-700/30 transition-colors group"
              onDoubleClick={() => onPreview(doc)}
              title="Double-clic pour aperçu"
            >
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <FileIcon mimeOrExt={doc.type_fichier} size="sm" />
                  <div className="min-w-0">
                    <Link to={`/documents/${doc.id}`}
                      className="font-medium text-gray-900 dark:text-white truncate block max-w-48 hover:text-blue-700 dark:hover:text-blue-400 transition-colors">
                      {doc.titre}
                    </Link>
                    {doc.tags?.length > 0 && (
                      <div className="flex gap-1 mt-0.5">
                        {doc.tags.slice(0,2).map((t) => <span key={t.id} className="badge bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">{t.nom}</span>)}
                      </div>
                    )}
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{fmtType(doc.type_fichier)}</td>
              <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{fmtDate(doc.date_upload)}</td>
              <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{fmtSize(doc.taille_fichier)}</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => onPreview(doc)}
                    title="Aperçu"
                    className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all">
                    <Eye className="w-4 h-4" />
                  </button>
                  <button onClick={() => onDownload(doc)}
                    title="Télécharger"
                    className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all">
                    <Download className="w-4 h-4" />
                  </button>
                  <button onClick={() => onShare(doc)}
                    title="Partager"
                    className="p-1.5 rounded-lg text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all">
                    <Share2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => onArchive(doc)}
                    title="Archiver"
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
