import { createContext, useEffect, useState } from 'react'
import { authService } from '../services/auth'

export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)

  // Restaure la session depuis le token en localStorage
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      authService
        .getMe()
        .then(setUser)
        .catch(() => localStorage.removeItem('token'))
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (email, password) => {
    const data = await authService.login(email, password)
    localStorage.setItem('token', data.access_token)
    const me = await authService.getMe()
    setUser(me)
    return me
  }

  const register = async (email, nom_complet, password) => {
    const me = await authService.register(email, nom_complet, password)
    // Après inscription, connecte directement
    const data = await authService.login(email, password)
    localStorage.setItem('token', data.access_token)
    setUser(me)
    return me
  }

  const logout = () => {
    localStorage.removeItem('token')
    setUser(null)
  }

  const refreshUser = async () => {
    const me = await authService.getMe()
    setUser(me)
    return me
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}
