import api from './api'

export const usersService = {
  getMe:           ()       => api.get('/users/me'),
  updateMe:        (data)   => api.put('/users/me', data),
  changePassword:  (data)   => api.put('/users/me/password', data),
  uploadAvatar:    (fd)     => api.post('/users/me/avatar', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  getStats:        ()       => api.get('/users/me/stats'),
  /** Recherche d'utilisateurs par nom ou email (pour le modal de partage). */
  search:          (q)      => api.get('/users/search', { params: { q } }),
}
