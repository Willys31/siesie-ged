import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Eye, EyeOff, Mail, Lock, User } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import toast from 'react-hot-toast'

function Field({ icon: Icon, type = 'text', placeholder, value, onChange, right }) {
  return (
    <div className="relative">
      <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="input pl-10 pr-10"
        required
      />
      {right && <div className="absolute right-3.5 top-1/2 -translate-y-1/2">{right}</div>}
    </div>
  )
}

export default function Login() {
  const [mode, setMode]         = useState('login')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [nom, setNom]           = useState('')
  const [confirm, setConfirm]   = useState('')
  const [showPwd, setShowPwd]   = useState(false)
  const [loading, setLoading]   = useState(false)

  const { login, register } = useAuth()
  const navigate             = useNavigate()

  const eyeBtn = (
    <button type="button" onClick={() => setShowPwd((v) => !v)}
      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
      {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
    </button>
  )

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (mode === 'register' && password !== confirm) {
      toast.error('Les mots de passe ne correspondent pas')
      return
    }
    if (mode === 'register' && password.length < 6) {
      toast.error('Le mot de passe doit contenir au moins 6 caractères')
      return
    }
    if (!email.includes('@')) {
      toast.error('Adresse e-mail invalide')
      return
    }
    setLoading(true)
    try {
      if (mode === 'login') {
        await login(email, password)
        toast.success('Connexion réussie !')
      } else {
        await register(email, nom, password)
        toast.success('Compte créé — bienvenue !')
      }
      navigate('/', { replace: true })
    } catch (err) {
      toast.error(err.message || 'Une erreur est survenue')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 transition-colors duration-300">
      <div className="w-full max-w-sm animate-slide-up">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-8 transition-colors duration-300">
          {/* Logo */}
          <div className="flex flex-col items-center mb-7">
            <div className="w-14 h-14 bg-blue-800 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-blue-200 dark:shadow-blue-900/40">
              <FileText className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">SieSie</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {mode === 'login' ? 'Connectez-vous à votre espace' : 'Créez votre compte'}
            </p>
          </div>

          {/* Toggle */}
          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-xl p-1 mb-6">
            {[['login','Connexion'],['register','Inscription']].map(([m, label]) => (
              <button key={m} type="button" onClick={() => setMode(m)}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-200
                  ${mode === m
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
                {label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Nom complet</label>
                <Field icon={User} placeholder="Jean Dupont" value={nom} onChange={(e) => setNom(e.target.value)} />
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Email</label>
              <Field icon={Mail} type="email" placeholder="vous@exemple.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Mot de passe</label>
              <Field icon={Lock} type={showPwd ? 'text' : 'password'} placeholder="••••••••"
                value={password} onChange={(e) => setPassword(e.target.value)} right={eyeBtn} />
            </div>
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Confirmer le mot de passe</label>
                <Field icon={Lock} type={showPwd ? 'text' : 'password'} placeholder="••••••••"
                  value={confirm} onChange={(e) => setConfirm(e.target.value)} />
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full py-3 mt-2 text-base">
              {loading
                ? <span className="flex items-center gap-2"><Spinner />{mode === 'login' ? 'Connexion…' : 'Création…'}</span>
                : mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
            </button>
          </form>
        </div>
        <p className="text-center text-xs text-gray-400 dark:text-gray-600 mt-5">© 2025 SieSie</p>
      </div>
    </div>
  )
}

function Spinner() {
  return (
    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  )
}
