import api from './api'

export const activityLogsService = {
  /** Liste des logs avec filtres et pagination. */
  list: (params = {}) => api.get('/activity-logs/', { params }),

  /** Logs de l'utilisateur connecté uniquement. */
  listMine: (params = {}) => api.get('/activity-logs/me', { params }),
}
