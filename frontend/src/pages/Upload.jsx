import { useCallback, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { UploadCloud, X, CheckCircle } from 'lucide-react'
import { documentsService } from '../services/documents'
import FileIcon, { getFileConfig } from '../components/FileIcon'
import TagInput from '../components/TagInput'
import toast from 'react-hot-toast'

const fmtSize = (b) => {
  if (!b) return ''
  if (b < 1024 ** 2) return `${(b / 1024).toFixed(1)} Ko`
  return `${(b / 1024 ** 2).toFixed(1)} Mo`
}

const ALLOWED = ['pdf','docx','doc','xlsx','xls','png','jpg','jpeg']

export default function Upload() {
  const [file, setFile]         = useState(null)
  const [titre, setTitre]       = useState('')
  const [description, setDesc]  = useState('')
  const [tags, setTags]         = useState([])
  const [dragging, setDragging] = useState(false)
  const [progress, setProgress] = useState(0)
  const [loading, setLoading]   = useState(false)
  const [done, setDone]         = useState(false)

  const fileRef  = useRef(null)
  const navigate = useNavigate()

  const pickFile = (f) => {
    if (!f) return
    const ext = f.name.split('.').pop().toLowerCase()
    if (!ALLOWED.includes(ext)) {
      toast.error(`Extension .${ext} non autorisée. Formats acceptés : ${ALLOWED.map(e => '.'+e).join(', ')}`)
      return
    }
    if (f.size > 50 * 1024 * 1024) {
      toast.error('Fichier trop volumineux. Limite : 50 Mo')
      return
    }
    setFile(f)
    if (!titre) setTitre(f.name.replace(/\.[^.]+$/, ''))
    setDone(false)
    setProgress(0)
  }

  const onDrop = useCallback((e) => {
    e.preventDefault()
    setDragging(false)
    pickFile(e.dataTransfer.files[0])
  }, [titre])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!file) { toast.error('Veuillez sélectionner un fichier'); return }
    if (!titre.trim()) { toast.error('Le titre est obligatoire'); return }

    const fd = new FormData()
    fd.append('file', file)
    fd.append('titre', titre.trim())
    if (description) fd.append('description', description)
    fd.append('tags', tags.join(','))

    setLoading(true)
    setProgress(0)
    try {
      await documentsService.upload(fd, (pct) => setProgress(pct))
      setDone(true)
      toast.success('Document importé avec succès !')
      setTimeout(() => navigate('/documents'), 1200)
    } catch (err) {
      toast.error(err.message || 'Erreur lors de l\'import')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Importer un document</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">PDF, Word, Excel, images — max 50 Mo</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Zone drag & drop */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => !file && fileRef.current?.click()}
          className={`
            relative border-2 border-dashed rounded-2xl transition-all duration-200 cursor-pointer
            ${dragging
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
              : file
                ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/10 cursor-default'
                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50/40 dark:hover:bg-blue-900/10'}
          `}
        >
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            accept={ALLOWED.map((e) => `.${e}`).join(',')}
            onChange={(e) => pickFile(e.target.files[0])}
          />

          {file ? (
            <div className="flex items-center gap-4 p-5">
              <FileIcon mimeOrExt={file.type || file.name.split('.').pop()} size="lg" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 dark:text-white truncate">{file.name}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{fmtSize(file.size)}</p>
                {done && (
                  <div className="flex items-center gap-1.5 mt-1 text-emerald-600 dark:text-emerald-400 text-sm font-medium">
                    <CheckCircle className="w-4 h-4" /> Importé avec succès
                  </div>
                )}
              </div>
              {!loading && !done && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setFile(null); setTitre(''); setProgress(0) }}
                  className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-14 gap-3 text-center px-6">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-colors
                ${dragging ? 'bg-blue-100 dark:bg-blue-900/40' : 'bg-gray-100 dark:bg-gray-700'}`}>
                <UploadCloud className={`w-8 h-8 transition-colors ${dragging ? 'text-blue-600' : 'text-gray-400 dark:text-gray-500'}`} />
              </div>
              <div>
                <p className="font-semibold text-gray-700 dark:text-gray-200">
                  {dragging ? 'Déposez le fichier ici' : 'Glissez votre fichier ici'}
                </p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                  ou <span className="text-blue-600 dark:text-blue-400 font-medium">cliquez pour parcourir</span>
                </p>
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                {ALLOWED.map((e) => e.toUpperCase()).join(' · ')}
              </p>
            </div>
          )}
        </div>

        {/* Barre de progression */}
        {(loading || (progress > 0 && progress < 100)) && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>Import en cours…</span><span>{progress}%</span>
            </div>
            <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-blue-700 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Métadonnées */}
        <div className="card p-5 space-y-4">
          <h2 className="font-semibold text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Informations</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Titre <span className="text-red-400">*</span>
            </label>
            <input
              className="input"
              placeholder="Ex: Contrat de prestation Q1 2024"
              value={titre}
              onChange={(e) => setTitre(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Description</label>
            <textarea
              className="input resize-none"
              rows={3}
              placeholder="Description facultative du document…"
              value={description}
              onChange={(e) => setDesc(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Tags <span className="text-gray-400 dark:text-gray-500 font-normal">(Entrée ou virgule pour valider)</span>
            </label>
            <TagInput tags={tags} onChange={setTags} placeholder="facture, 2024, client-xyz…" />
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <button type="button" onClick={() => navigate('/documents')} className="btn-secondary">
            Annuler
          </button>
          <button type="submit" disabled={loading || !file} className="btn-primary px-6">
            {loading ? (
              <span className="flex items-center gap-2"><Spinner />Import…</span>
            ) : (
              <><UploadCloud className="w-4 h-4" />Importer</>
            )}
          </button>
        </div>
      </form>
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
