import { useState } from 'react'

const inputStyle = {
  width: '100%',
  padding: '0.5rem 0.75rem',
  border: '1px solid #d1d5db',
  borderRadius: '6px',
  fontSize: '0.9rem',
  outline: 'none',
}

export default function UploadModal({ onUpload, onClose }) {
  const [form, setForm] = useState({ title: '', description: '', category: '', tags: '' })
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!file) return setError('Veuillez sélectionner un fichier')
    setLoading(true)
    setError('')
    try {
      const formData = new FormData()
      Object.entries(form).forEach(([k, v]) => v && formData.append(k, v))
      formData.append('file', file)
      await onUpload(formData)
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
      onClick={onClose}
    >
      <div className="card" style={{ width: '500px', maxWidth: '90vw' }} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ marginBottom: '1.5rem', fontSize: '1.1rem' }}>Importer un document</h2>

        {error && (
          <p style={{ color: '#dc2626', background: '#fee2e2', padding: '0.5rem 0.75rem', borderRadius: '4px', marginBottom: '1rem', fontSize: '0.9rem' }}>
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500, fontSize: '0.9rem' }}>Titre *</label>
            <input style={inputStyle} value={form.title} onChange={set('title')} required />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500, fontSize: '0.9rem' }}>Description</label>
            <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: '72px' }} value={form.description} onChange={set('description')} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500, fontSize: '0.9rem' }}>Catégorie</label>
              <input style={inputStyle} value={form.category} onChange={set('category')} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500, fontSize: '0.9rem' }}>Tags</label>
              <input style={inputStyle} placeholder="tag1, tag2" value={form.tags} onChange={set('tags')} />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500, fontSize: '0.9rem' }}>Fichier *</label>
            <input
              type="file"
              style={inputStyle}
              onChange={(e) => setFile(e.target.files[0])}
              accept=".pdf,.docx,.doc,.xlsx,.xls,.png,.jpg,.jpeg"
            />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Annuler
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Import en cours...' : 'Importer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
