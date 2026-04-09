import api from './api'

export const notificationsService = {
  /** Liste paginée des notifications. */
  list: (params = {}) => api.get('/notifications/', { params }),

  /** Nombre de notifications non lues (polling). */
  getUnreadCount: () => api.get('/notifications/unread-count'),

  /** Marquer une notification comme lue. */
  markRead: (id) => api.put(`/notifications/${id}/read`),

  /** Marquer toutes les notifications comme lues. */
  markAllRead: () => api.put('/notifications/read-all'),
}
