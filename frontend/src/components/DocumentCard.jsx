import { documentService } from '../services/documents'

const formatSize = (bytes) => {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function DocumentCard({ document, onDelete }) {
  const handleDownload = async () => {
    const blob = await documentService.download(document.id)
    const url = URL.createObjectURL(blob)
    const a = window.document.createElement('a')
    a.href = url
    a.download = document.original_filename
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="card" style={{ marginBottom: '0.75rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
        <div style={{ minWidth: 0 }}>
          <h3 style={{ marginBottom: '0.25rem', fontSize: '1rem' }}>{document.title}</h3>
          <p style={{ color: '#6b7280', fontSize: '0.82rem' }}>
            {document.original_filename} · {formatSize(document.file_size)}
            {document.category && ` · ${document.category}`}
          </p>
          {document.description && (
            <p style={{ marginTop: '0.4rem', color: '#4b5563', fontSize: '0.9rem' }}>
              {document.description}
            </p>
          )}
          {document.tags && (
            <div style={{ marginTop: '0.4rem', display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {document.tags.split(',').map((tag) => (
                <span key={tag.trim()} style={{ background: '#eff6ff', color: '#2563eb', padding: '0.15rem 0.5rem', borderRadius: '999px', fontSize: '0.78rem' }}>
                  {tag.trim()}
                </span>
              ))}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
          <button className="btn btn-primary" onClick={handleDownload} style={{ padding: '0.3rem 0.7rem', fontSize: '0.85rem' }}>
            Télécharger
          </button>
          <button className="btn btn-danger" onClick={() => onDelete(document.id)} style={{ padding: '0.3rem 0.7rem', fontSize: '0.85rem' }}>
            Supprimer
          </button>
        </div>
      </div>
    </div>
  )
}
