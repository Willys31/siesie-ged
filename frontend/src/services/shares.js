import api from './api'

export const sharesService = {
  /** Partager un document (body: { user_id, permission }). */
  shareDocument: (docId, data) => api.post(`/documents/${docId}/share`, data),

  /** Liste des partages d'un document. */
  getShares: (docId) => api.get(`/documents/${docId}/shares`),

  /** Révoquer un partage. */
  revokeShare: (docId, shareId) => api.delete(`/documents/${docId}/shares/${shareId}`),

  /** Documents partagés avec l'utilisateur connecté. */
  listSharedWithMe: (params = {}) => api.get('/documents/shared-with-me', { params }),
}
