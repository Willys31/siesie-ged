import api from './api'

export const authService = {
  // Le backend attend { email, mot_de_passe } en JSON
  login: (email, mot_de_passe) =>
    api.post('/auth/login', { email, mot_de_passe }),

  register: (email, nom_complet, mot_de_passe) =>
    api.post('/auth/register', { email, nom_complet, mot_de_passe }),

  getMe: () => api.get('/auth/me'),
}
