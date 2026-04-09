import { useEffect, useRef, useState } from 'react'
import {
  X, Download, ChevronLeft, ChevronRight, ZoomIn, ZoomOut,
  FileX, Loader2, AlertCircle,
} from 'lucide-react'
import { documentsService, triggerDownload } from '../services/documents'
import FileIcon from './FileIcon'

// ── Détection du type d'aperçu ─────────────────────────────────────────────

function getPreviewType(mime) {
  if (!mime) return 'unsupported'
  const m = mime.toLowerCase()
  if (m.includes('pdf'))                                       return 'pdf'
  if (m.startsWith('image/'))                                  return 'image'
  if (m.startsWith('text/') || m.includes('plain') || m.includes('csv') || m.includes('markdown')) return 'text'
  return 'unsupported'
}

// ── Viewers spécialisés ────────────────────────────────────────────────────

function PdfViewer({ url }) {
  return (
    <iframe
      src={url}
      className="w-full h-full border-0 rounded-b-2xl"
      title="Aperçu PDF"
    />
  )
}

function ImageViewer({ url, name }) {
  const [zoomed, setZoomed] = useState(false)
  return (
    <div
      className={`w-full h-full flex items-center justify-center overflow-auto
        ${zoomed ? 'cursor-zoom-out' : 'cursor-zoom-in'}`}
      onClick={() => setZoomed((z) => !z)}
    >
      <img
        src={url}
        alt={name}
        className={`transition-all duration-200 rounded select-none
          ${zoomed
            ? 'max-w-none max-h-none'
            : 'max-w-full max-h-full object-contain'
          }`}
        draggable={false}
      />
      {/* Zoom indicator */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setZoomed((z) => !z) }}
        className="absolute bottom-4 right-4 flex items-center gap-1.5 text-xs font-medium
                   bg-black/60 text-white px-3 py-1.5 rounded-full backdrop-blur-sm
                   hover:bg-black/80 transition-colors z-10"
      >
        {zoomed
          ? <><ZoomOut className="w-3.5 h-3.5" /> Réduire</>
          : <><ZoomIn  className="w-3.5 h-3.5" /> Agrandir</>
        }
      </button>
    </div>
  )
}

function TextViewer({ content }) {
  return (
    <div className="w-full h-full overflow-auto p-0">
      <pre
        className="min-h-full p-6 text-sm font-mono leading-relaxed
                   text-gray-800 dark:text-gray-200
                   bg-gray-50 dark:bg-gray-950
                   whitespace-pre-wrap break-words"
      >
        {content}
      </pre>
    </div>
  )
}

function UnsupportedViewer({ doc, onDownload }) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-5 p-8 text-center">
      <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center">
        <FileX className="w-10 h-10 text-gray-400 dark:text-gray-500" />
      </div>
      <div>
        <p className="text-base font-semibold text-gray-700 dark:text-gray-200">
          Aperçu non disponible pour ce format
        </p>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
          Le format <span className="font-medium">{doc?.type_fichier?.split('/')[1]?.toUpperCase() || 'inconnu'}</span> ne peut pas être affiché dans le navigateur.
        </p>
      </div>
      <button onClick={onDownload} className="btn-primary gap-2">
        <Download className="w-4 h-4" /> Télécharger à la place
      </button>
    </div>
  )
}

// ── Composant principal ────────────────────────────────────────────────────

export default function DocumentPreview({ doc, docs = [], onClose, onNavigate }) {
  const [state, setState] = useState({ status: 'loading', type: null, url: null, text: null })
  const objectUrlRef = useRef(null)

  // Navigation prev/next
  const idx     = docs.findIndex((d) => d.id === doc?.id)
  const prevDoc = idx > 0                ? docs[idx - 1] : null
  const nextDoc = idx < docs.length - 1 ? docs[idx + 1] : null

  // Chargement du contenu à chaque changement de doc
  useEffect(() => {
    if (!doc) return

    const type = getPreviewType(doc.type_fichier)

    if (type === 'unsupported') {
      setState({ status: 'unsupported', type, url: null, text: null })
      return
    }

    setState({ status: 'loading', type, url: null, text: null })

    let cancelled = false

    const load = async () => {
      try {
        if (type === 'text') {
          const text = await documentsService.previewText(doc.id)
          if (!cancelled) setState({ status: 'ready', type, url: null, text: String(text) })
        } else {
          const blob = await documentsService.previewBlob(doc.id)
          const url  = URL.createObjectURL(blob)
          objectUrlRef.current = url
          if (!cancelled) setState({ status: 'ready', type, url, text: null })
        }
      } catch (err) {
        if (!cancelled) {
          // 415 ou autre erreur → aperçu non disponible
          setState({ status: 'unsupported', type: 'unsupported', url: null, text: null })
        }
      }
    }

    load()

    return () => {
      cancelled = true
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
        objectUrlRef.current = null
      }
    }
  }, [doc?.id])

  // Raccourcis clavier
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape')                      onClose()
      if (e.key === 'ArrowLeft'  && prevDoc)       onNavigate(prevDoc)
      if (e.key === 'ArrowRight' && nextDoc)       onNavigate(nextDoc)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [prevDoc, nextDoc, onClose, onNavigate])

  // Verrouillage du scroll body
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const handleDownload = async () => {
    try {
      const blob = await documentsService.download(doc.id)
      const ext  = doc.chemin_stockage?.split('.').pop() || ''
      triggerDownload(blob, `${doc.titre}${ext ? '.'+ext : ''}`)
    } catch { /* silently fail */ }
  }

  if (!doc) return null

  const { status, type, url, text } = state
  const typeLabel = doc.type_fichier?.split('/')[1]?.toUpperCase() || doc.type_fichier || '?'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/60 dark:bg-black/75 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="relative z-10 flex flex-col w-full max-w-5xl bg-white dark:bg-gray-900
                   rounded-2xl shadow-2xl overflow-hidden
                   animate-slide-up"
        style={{ height: 'min(90vh, 800px)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── En-tête ──────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-100 dark:border-gray-700 shrink-0">
          <FileIcon mimeOrExt={doc.type_fichier} size="sm" />

          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{doc.titre}</p>
            <span className="text-xs text-gray-400 dark:text-gray-500">{typeLabel}</span>
          </div>

          {/* Navigation */}
          {docs.length > 1 && (
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => prevDoc && onNavigate(prevDoc)}
                disabled={!prevDoc}
                title="Document précédent (←)"
                className="p-2 rounded-lg text-gray-400 dark:text-gray-500
                           hover:text-gray-700 dark:hover:text-gray-200
                           hover:bg-gray-100 dark:hover:bg-gray-800
                           disabled:opacity-30 disabled:cursor-not-allowed
                           transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-gray-400 dark:text-gray-500 px-1 font-mono">
                {idx + 1} / {docs.length}
              </span>
              <button
                onClick={() => nextDoc && onNavigate(nextDoc)}
                disabled={!nextDoc}
                title="Document suivant (→)"
                className="p-2 rounded-lg text-gray-400 dark:text-gray-500
                           hover:text-gray-700 dark:hover:text-gray-200
                           hover:bg-gray-100 dark:hover:bg-gray-800
                           disabled:opacity-30 disabled:cursor-not-allowed
                           transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Télécharger + fermer */}
          <button
            onClick={handleDownload}
            title="Télécharger"
            className="p-2 rounded-lg text-gray-400 dark:text-gray-500
                       hover:text-blue-600 dark:hover:text-blue-400
                       hover:bg-blue-50 dark:hover:bg-blue-900/20
                       transition-all shrink-0"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            title="Fermer (Échap)"
            className="p-2 rounded-lg text-gray-400 dark:text-gray-500
                       hover:text-gray-700 dark:hover:text-gray-200
                       hover:bg-gray-100 dark:hover:bg-gray-800
                       transition-all shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Corps ────────────────────────────────────────────────────── */}
        <div className="flex-1 relative overflow-hidden bg-gray-50 dark:bg-gray-950">
          {/* Chargement */}
          {status === 'loading' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              <p className="text-sm text-gray-500 dark:text-gray-400">Chargement de l'aperçu…</p>
            </div>
          )}

          {/* Erreur */}
          {status === 'error' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <AlertCircle className="w-8 h-8 text-red-400" />
              <p className="text-sm text-gray-500 dark:text-gray-400">Impossible de charger l'aperçu</p>
            </div>
          )}

          {/* Contenu prêt */}
          {status === 'ready' && type === 'pdf'   && <PdfViewer   url={url} />}
          {status === 'ready' && type === 'image' && <ImageViewer url={url} name={doc.titre} />}
          {status === 'ready' && type === 'text'  && <TextViewer  content={text} />}

          {/* Non supporté */}
          {status === 'unsupported' && (
            <UnsupportedViewer doc={doc} onDownload={handleDownload} />
          )}
        </div>
      </div>
    </div>
  )
}
