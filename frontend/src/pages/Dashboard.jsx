import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FileText, HardDrive, Calendar, Tag, UploadCloud, ArrowRight, Download } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useDocuments } from '../hooks/useDocuments'
import FileIcon from '../components/FileIcon'
import { documentsService, triggerDownload } from '../services/documents'
import toast from 'react-hot-toast'

const fmtSize = (b) => {
  if (!b) return '0 o'
  if (b < 1024) return `${b} o`
  if (b < 1024 ** 2) return `${(b / 1024).toFixed(1)} Ko`
  return `${(b / 1024 ** 2).toFixed(1)} Mo`
}

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

function StatCard({ icon: Icon, value, label, bg, iconColor, loading }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-11 h-11 ${bg} rounded-xl flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
      </div>
      {loading
        ? <div className="skeleton h-8 w-20 mb-1" />
        : <p className="text-3xl font-bold text-gray-900 dark:text-white">{value}</p>}
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{label}</p>
    </div>
  )
}

export default function Dashboard() {
  const { user }                                    = useAuth()
  const { documents, total, loading, fetchDocuments } = useDocuments()
  const navigate                                    = useNavigate()

  useEffect(() => { fetchDocuments({ limit: 20 }) }, [fetchDocuments])

  const totalSize  = documents.reduce((s, d) => s + (d.taille_fichier || 0), 0)
  const now        = new Date()
  const thisMo     = documents.filter((d) => {
    const dt = new Date(d.date_upload)
    return dt.getMonth() === now.getMonth() && dt.getFullYear() === now.getFullYear()
  }).length
  const allTags    = new Set(documents.flatMap((d) => d.tags?.map((t) => t.nom) ?? []))

  const handleDownload = async (doc) => {
    try {
      const blob = await documentsService.download(doc.id)
      const ext  = doc.chemin_stockage?.split('.').pop() || ''
      triggerDownload(blob, `${doc.titre}${ext ? '.' + ext : ''}`)
      toast.success('Téléchargement démarré')
    } catch {
      toast.error('Erreur lors du téléchargement')
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* En-tête */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Bonjour, {user?.nom_complet?.split(' ')[0]} 👋
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-0.5">Voici un aperçu de votre espace documentaire</p>
        </div>
        <button onClick={() => navigate('/upload')} className="btn-primary gap-2">
          <UploadCloud className="w-4 h-4" />
          Nouveau document
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={FileText}  value={total}              label="Documents totaux"   bg="bg-blue-50 dark:bg-blue-900/20"    iconColor="text-blue-600 dark:text-blue-400"    loading={loading} />
        <StatCard icon={HardDrive} value={fmtSize(totalSize)} label="Espace utilisé"     bg="bg-purple-50 dark:bg-purple-900/20" iconColor="text-purple-600 dark:text-purple-400" loading={loading} />
        <StatCard icon={Calendar}  value={thisMo}             label="Ce mois-ci"          bg="bg-emerald-50 dark:bg-emerald-900/20" iconColor="text-emerald-600 dark:text-emerald-400" loading={loading} />
        <StatCard icon={Tag}       value={allTags.size}       label="Tags distincts"      bg="bg-orange-50 dark:bg-orange-900/20"  iconColor="text-orange-600 dark:text-orange-400"  loading={loading} />
      </div>

      {/* Documents récents */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="font-semibold text-gray-900 dark:text-white">Documents récents</h2>
          <Link to="/documents" className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 font-medium hover:text-blue-700 dark:hover:text-blue-300 transition-colors">
            Voir tout <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-4">
                <div className="skeleton w-10 h-10 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-4 w-48" />
                  <div className="skeleton h-3 w-32" />
                </div>
              </div>
            ))}
          </div>
        ) : documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="w-12 h-12 text-gray-200 dark:text-gray-700 mb-3" />
            <p className="text-gray-500 dark:text-gray-400 font-medium">Aucun document</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Commencez par importer un fichier</p>
            <button onClick={() => navigate('/upload')} className="btn-primary mt-4 text-sm">
              Importer un document
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {documents.slice(0, 6).map((doc) => (
              <div
                key={doc.id}
                className="flex items-center gap-4 px-6 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors group"
              >
                <FileIcon mimeOrExt={doc.type_fichier} size="sm" />
                <div className="flex-1 min-w-0">
                  <Link
                    to={`/documents/${doc.id}`}
                    className="font-medium text-gray-900 dark:text-white truncate block hover:text-blue-700 dark:hover:text-blue-400 transition-colors"
                  >
                    {doc.titre}
                  </Link>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{fmtDate(doc.date_upload)} · {fmtSize(doc.taille_fichier)}</p>
                </div>
                {doc.tags?.length > 0 && (
                  <div className="hidden sm:flex items-center gap-1 flex-wrap max-w-32">
                    {doc.tags.slice(0, 2).map((t) => (
                      <span key={t.id} className="badge bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">{t.nom}</span>
                    ))}
                  </div>
                )}
                <button
                  onClick={() => handleDownload(doc)}
                  className="p-2 rounded-lg text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all opacity-0 group-hover:opacity-100"
                  title="Télécharger"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
