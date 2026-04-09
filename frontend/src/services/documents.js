import api from './api'

export const documentsService = {
  // ── Liste & détail ──────────────────────────────────────────────────────────
  list: (params = {}) => api.get('/documents/', { params }),

  get: (id) => api.get(`/documents/${id}`),

  // ── Upload ──────────────────────────────────────────────────────────────────
  upload: (formData, onProgress) =>
    api.post('/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) =>
        onProgress && onProgress(Math.round((e.loaded * 100) / e.total)),
    }),

  // ── Mise à jour & archivage ─────────────────────────────────────────────────
  update: (id, data) => api.put(`/documents/${id}`, data),

  archive: (id) => api.delete(`/documents/${id}`),

  // ── Remplacement de fichier ─────────────────────────────────────────────────
  replaceFile: (id, formData, onProgress) =>
    api.put(`/documents/${id}/replace`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) =>
        onProgress && onProgress(Math.round((e.loaded * 100) / e.total)),
    }),

  // ── Téléchargement ──────────────────────────────────────────────────────────
  download: (id) =>
    api.get(`/documents/${id}/download`, { responseType: 'blob' }),

  // ── Versions ────────────────────────────────────────────────────────────────
  versions: (id) => api.get(`/documents/${id}/versions`),

  downloadVersion: (id, versionId) =>
    api.get(`/documents/${id}/versions/${versionId}/download`, { responseType: 'blob' }),

  // ── Aperçu inline ───────────────────────────────────────────────────────────
  /** Retourne un Blob pour PDF et images (utilisé pour créer un object URL). */
  previewBlob: (id) =>
    api.get(`/documents/${id}/preview`, { responseType: 'blob' }),

  /** Retourne le texte brut pour les fichiers texte. */
  previewText: (id) =>
    api.get(`/documents/${id}/preview`, { responseType: 'text' }),

  // ── Corbeille ───────────────────────────────────────────────────────────────
  listTrash: (params = {}) => api.get('/documents/trash', { params }),

  restore: (id) => api.put(`/documents/${id}/restore`),

  deletePermanently: (id) => api.delete(`/documents/${id}/permanent`),

  emptyTrash: () => api.delete('/documents/trash'),

  // ── Recherche full-text ─────────────────────────────────────────────────────
  search: (params) => api.get('/search/', { params }),
}

// Déclenche le téléchargement d'un Blob côté navigateur
export function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
