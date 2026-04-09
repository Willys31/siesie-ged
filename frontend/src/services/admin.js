import api from './api'

export const adminService = {
  getUsers:       ()          => api.get('/admin/users'),
  updateRole:     (id, role)  => api.put(`/admin/users/${id}/role`, { role }),
  toggleActive:   (id)        => api.put(`/admin/users/${id}/toggle-active`),
  getAllDocuments: (params)    => api.get('/admin/documents', { params }),
}
