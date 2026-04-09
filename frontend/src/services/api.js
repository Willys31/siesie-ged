import axios from 'axios'

// En production (Render static site), VITE_API_URL pointe vers le backend.
// En développement, le proxy Vite redirige /api → localhost:8000.
export const API_BASE_URL = import.meta.env.VITE_API_URL || ''

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 30000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

const HTTP_ERRORS = {
  400: 'Données invalides. Vérifiez les informations saisies.',
  403: 'Accès non autorisé à cette ressource.',
  404: 'Ressource introuvable.',
  409: 'Conflit : cette ressource existe déjà.',
  413: 'Fichier trop volumineux (limite : 50 Mo).',
  422: 'Données invalides. Vérifiez les champs requis.',
  429: 'Trop de requêtes. Veuillez patienter.',
  500: 'Erreur serveur. Réessayez ultérieurement.',
  503: 'Service temporairement indisponible.',
}

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const status = error.response?.status
    if (status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    const detail = error.response?.data?.detail
    const fallback = HTTP_ERRORS[status] || 'Une erreur est survenue'
    return Promise.reject(new Error(detail || fallback))
  }
)

export default api
