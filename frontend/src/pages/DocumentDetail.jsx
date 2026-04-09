import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, Download, Trash2, Clock, User, HardDrive,
  FileText, Calendar, Tag, History, ChevronRight, Pencil, Check, X, Eye, Share2,
} from 'lucide-react'
import { documentsService, triggerDownload } from '../services/documents'
import FileIcon from '../components/FileIcon'
import ConfirmModal from '../components/ConfirmModal'
import TagInput from '../components/TagInput'
import DocumentPreview from '../components/DocumentPreview'
import ShareModal from '../components/ShareModal'
import { useAuth } from '../hooks/useAuth'
import toast from 'react-hot-toast'

const fmtSize = (b) => { if (!b) return '—'; if (b < 1024**2) return `${(b/1024).toFixed(1)} Ko`; return `${(b/1024**2).toFixed(1)} Mo` }
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { day:'2-digit', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '—'

export default function DocumentDetail() {
  const { id }      = useParams()
  const navigate    = useNavigate()
  const { user: currentUser } = useAuth()

  const [doc,      setDoc]      = useState(null)
  const [versions, setVersions] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [editing,  setEditing]  = useState(false)
  const [form,     setForm]     = useState({ titre: '', description: '', tags: [] })
  const [saving,   setSaving]   = useState(false)
  const [confirm,  setConfirm]  = useState(false)
  const [archiving,setArchiving]= useState(false)
  const [preview,  setPreview]  = useState(false)
  const [sharing,  setSharing]  = useState(false)

  useEffect(() => {
    (async () => {
      try {
        const [d, v] = await Promise.all([
          documentsService.get(id),
          documentsService.versions(id),
        ])
        setDoc(d)
        setVersions(v)
        setForm({ titre: d.titre, description: d.description || '', tags: d.tags?.map((t) => t.nom) || [] })
      } catch (err) {
        toast.error('Document introuvable')
        navigate('/documents')
      } finally { setLoading(false) }
    })()
  }, [id])

  const handleDownload = async () => {
    try {
      const blob = await documentsService.download(doc.id)
      const ext  = doc.chemin_stockage?.split('.').pop() || ''
      triggerDownload(blob, `${doc.titre}${ext ? '.'+ext : ''}`)
      toast.success('Téléchargement démarré')
    } catch { toast.error('Erreur lors du téléchargement') }
  }

  const handleDownloadVersion = async (v) => {
    try {
      const blob = await documentsService.downloadVersion(doc.id, v.id)
      const ext  = v.chemin_fichier?.split('.').pop() || ''
      triggerDownload(blob, `v${v.numero_version}_${doc.titre}${ext ? '.'+ext : ''}`)
      toast.success(`Version ${v.numero_version} téléchargée`)
    } catch { toast.error('Erreur lors du téléchargement de la version') }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const updated = await documentsService.update(doc.id, {
        titre: form.titre,
        description: form.description || undefined,
        tags: form.tags,
      })
      setDoc(updated)
      setEditing(false)
      toast.success('Document mis à jour')
    } catch (err) { toast.error(err.message || 'Erreur') }
    finally { setSaving(false) }
  }

  const handleArchive = async () => {
    setArchiving(true)
    try {
      await documentsService.archive(doc.id)
      toast.success('Document archivé')
      navigate('/documents')
    } catch (err) { toast.error(err.message || 'Erreur') }
    finally { setArchiving(false) }
  }

  const canEdit  = doc && (currentUser?.role === 'admin' || currentUser?.id === doc.uploaded_par_id)
  const canShare = canEdit  // seul le propriétaire ou l'admin peut partager

  if (loading) return <DetailSkeleton />

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start gap-4 flex-wrap">
        <button onClick={() => navigate('/documents')}
          className="p-2 rounded-xl hover:bg-white dark:hover:bg-gray-800 border border-transparent hover:border-gray-200 dark:hover:border-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-all mt-1">
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="flex-1 min-w-0 flex items-start gap-4">
          <FileIcon mimeOrExt={doc.type_fichier} size="lg" />
          <div className="flex-1 min-w-0">
            {canEdit && editing ? (
              <input className="input text-xl font-bold w-full mb-1"
                value={form.titre} onChange={(e) => setForm((f) => ({...f, titre: e.target.value}))} />
            ) : (
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white break-words">{doc.titre}</h1>
            )}
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {doc.type_fichier && (
                <span className="badge bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                  {doc.type_fichier.split('/')[1]?.toUpperCase() || doc.type_fichier}
                </span>
              )}
              {doc.est_archive && <span className="badge bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">Archivé</span>}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {canEdit && editing ? (
            <>
              <button onClick={() => setEditing(false)} className="btn-secondary p-2.5"><X className="w-4 h-4" /></button>
              <button onClick={handleSave} disabled={saving} className="btn-primary gap-1.5">
                {saving ? <Spinner /> : <Check className="w-4 h-4" />} Enregistrer
              </button>
            </>
          ) : (
            <>
              {canEdit && (
                <button onClick={() => setEditing(true)} className="btn-secondary gap-1.5">
                  <Pencil className="w-4 h-4" /> Modifier
                </button>
              )}
              {canShare && (
                <button onClick={() => setSharing(true)} className="btn-secondary gap-1.5">
                  <Share2 className="w-4 h-4" /> Partager
                </button>
              )}
              <button onClick={() => setPreview(true)} className="btn-secondary gap-1.5">
                <Eye className="w-4 h-4" /> Aperçu
              </button>
              <button onClick={handleDownload} className="btn-primary gap-1.5">
                <Download className="w-4 h-4" /> Télécharger
              </button>
              {canEdit && (
                <button onClick={() => setConfirm(true)}
                  className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-400 hover:text-red-500 hover:border-red-200 dark:hover:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colonne principale */}
        <div className="lg:col-span-2 space-y-5">
          {/* Description */}
          <div className="card p-5">
            <h2 className="font-semibold text-gray-900 dark:text-white mb-3">Description</h2>
            {canEdit && editing ? (
              <textarea className="input resize-none" rows={4}
                placeholder="Ajouter une description…"
                value={form.description}
                onChange={(e) => setForm((f) => ({...f, description: e.target.value}))} />
            ) : (
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                {doc.description || <span className="text-gray-400 dark:text-gray-500 italic">Aucune description</span>}
              </p>
            )}
          </div>

          {/* Tags */}
          <div className="card p-5">
            <h2 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <Tag className="w-4 h-4 text-gray-400 dark:text-gray-500" /> Tags
            </h2>
            {canEdit && editing ? (
              <TagInput tags={form.tags} onChange={(t) => setForm((f) => ({...f, tags: t}))} />
            ) : doc.tags?.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {doc.tags.map((t) => (
                  <span key={t.id} className="badge bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-sm px-3 py-1">{t.nom}</span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 dark:text-gray-500 italic">Aucun tag</p>
            )}
          </div>

          {/* Versions */}
          {versions.length > 0 && (
            <div className="card p-5">
              <h2 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <History className="w-4 h-4 text-gray-400 dark:text-gray-500" /> Historique des versions
                <span className="badge bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 ml-1">{versions.length}</span>
              </h2>
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-100 dark:bg-gray-700" />
                <div className="space-y-4">
                  {versions.map((v) => (
                    <div key={v.id} className="flex items-start gap-4 pl-10 relative">
                      <div className="absolute left-2.5 top-1.5 w-3 h-3 rounded-full bg-white dark:bg-gray-800 border-2 border-blue-300 dark:border-blue-600" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div>
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">Version {v.numero_version}</p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{fmtDate(v.date_modification)}</p>
                          </div>
                          <button onClick={() => handleDownloadVersion(v)}
                            className="flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors">
                            <Download className="w-3.5 h-3.5" /> Télécharger
                          </button>
                        </div>
                        {v.commentaire && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 bg-gray-50 dark:bg-gray-700/50 px-3 py-2 rounded-lg">{v.commentaire}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Colonne méta */}
        <div className="space-y-5">
          <div className="card p-5">
            <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Informations</h2>
            <dl className="space-y-4">
              {[
                { icon: User,       label: 'Uploadé par',    value: `Utilisateur #${doc.uploaded_par_id}` },
                { icon: Calendar,   label: 'Date d\'import', value: fmtDate(doc.date_upload) },
                { icon: Clock,      label: 'Modifié le',     value: fmtDate(doc.date_modification) },
                { icon: HardDrive,  label: 'Taille',         value: fmtSize(doc.taille_fichier) },
                { icon: FileText,   label: 'Type',           value: doc.type_fichier || '—' },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-start gap-3">
                  <div className="w-7 h-7 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                    <Icon className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                  </div>
                  <div className="min-w-0">
                    <dt className="text-xs text-gray-400 dark:text-gray-500 font-medium">{label}</dt>
                    <dd className="text-sm text-gray-900 dark:text-white mt-0.5 break-all">{value}</dd>
                  </div>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>

      <ConfirmModal open={confirm} title="Archiver ce document ?"
        message={`"${doc.titre}" sera archivé et disparaîtra de votre liste.`}
        confirmLabel="Archiver" loading={archiving}
        onConfirm={handleArchive} onCancel={() => setConfirm(false)} />

      {preview && (
        <DocumentPreview
          doc={doc}
          docs={[doc]}
          onClose={() => setPreview(false)}
          onNavigate={() => {}}
        />
      )}

      <ShareModal doc={doc} isOpen={sharing} onClose={() => setSharing(false)} />
    </div>
  )
}

function DetailSkeleton() {
  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-pulse">
      <div className="flex items-center gap-4">
        <div className="skeleton w-9 h-9 rounded-xl" />
        <div className="skeleton w-14 h-14 rounded-xl" />
        <div className="space-y-2 flex-1"><div className="skeleton h-7 w-64" /><div className="skeleton h-5 w-24" /></div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="card p-5 space-y-3"><div className="skeleton h-5 w-24" /><div className="skeleton h-16" /></div>
          <div className="card p-5 space-y-3"><div className="skeleton h-5 w-16" /><div className="flex gap-2"><div className="skeleton h-6 w-16 rounded-full" /><div className="skeleton h-6 w-20 rounded-full" /></div></div>
        </div>
        <div className="card p-5 space-y-4"><div className="skeleton h-5 w-24" />{[...Array(5)].map((_,i) => <div key={i} className="skeleton h-10" />)}</div>
      </div>
    </div>
  )
}

function Spinner() {
  return <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
  </svg>
}
