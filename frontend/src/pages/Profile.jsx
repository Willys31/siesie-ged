import { useEffect, useRef, useState } from 'react'
import { Camera, Check, Key, Mail, Save, User as UserIcon, FileText, HardDrive } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { usersService } from '../services/users'
import toast from 'react-hot-toast'

const fmtSize = (b) => {
  if (!b) return '0 Ko'
  if (b < 1024 ** 2) return `${(b / 1024).toFixed(1)} Ko`
  return `${(b / 1024 ** 2).toFixed(1)} Mo`
}
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'

export default function Profile() {
  const { user, refreshUser } = useAuth()
  const avatarRef = useRef(null)

  const [form,         setForm]         = useState({ nom_complet: '', email: '' })
  const [pwdForm,      setPwdForm]      = useState({ ancien: '', nouveau: '', confirm: '' })
  const [stats,        setStats]        = useState(null)
  const [savingInfo,   setSavingInfo]   = useState(false)
  const [savingPwd,    setSavingPwd]    = useState(false)
  const [uploadingAvt, setUploadingAvt] = useState(false)
  const [avatarPreview,setAvatarPreview]= useState(null)

  useEffect(() => {
    if (user) {
      setForm({ nom_complet: user.nom_complet, email: user.email })
      if (user.avatar_path) setAvatarPreview(`/avatars/${user.avatar_path}`)
    }
    usersService.getStats().then(setStats).catch(() => {})
  }, [user])

  const handleInfoSave = async (e) => {
    e.preventDefault()
    setSavingInfo(true)
    try {
      await usersService.updateMe({ nom_complet: form.nom_complet, email: form.email })
      await refreshUser()
      toast.success('Profil mis à jour')
    } catch (err) {
      toast.error(err.message || 'Erreur lors de la mise à jour')
    } finally {
      setSavingInfo(false)
    }
  }

  const handlePasswordSave = async (e) => {
    e.preventDefault()
    if (pwdForm.nouveau !== pwdForm.confirm) {
      toast.error('La confirmation ne correspond pas')
      return
    }
    setSavingPwd(true)
    try {
      await usersService.changePassword({
        ancien_mot_de_passe: pwdForm.ancien,
        nouveau_mot_de_passe: pwdForm.nouveau,
        confirmation: pwdForm.confirm,
      })
      toast.success('Mot de passe modifié')
      setPwdForm({ ancien: '', nouveau: '', confirm: '' })
    } catch (err) {
      toast.error(err.message || 'Erreur lors du changement de mot de passe')
    } finally {
      setSavingPwd(false)
    }
  }

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Seules les images sont acceptées')
      return
    }
    // Preview
    const reader = new FileReader()
    reader.onload = (ev) => setAvatarPreview(ev.target.result)
    reader.readAsDataURL(file)

    setUploadingAvt(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      await usersService.uploadAvatar(fd)
      await refreshUser()
      toast.success('Photo de profil mise à jour')
    } catch (err) {
      toast.error(err.message || 'Erreur lors de l\'upload')
      setAvatarPreview(user?.avatar_path ? `/avatars/${user.avatar_path}` : null)
    } finally {
      setUploadingAvt(false)
    }
  }

  const initials = user?.nom_complet
    ?.split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase() || '?'

  const roleBadge = user?.role === 'admin'
    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
    : 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Mon profil</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Gérez vos informations personnelles et votre mot de passe</p>
      </div>

      {/* Avatar + infos identité */}
      <div className="card p-6 flex flex-col sm:flex-row items-center sm:items-start gap-6">
        {/* Avatar cliquable */}
        <div className="relative shrink-0">
          <div
            className="w-24 h-24 rounded-full overflow-hidden cursor-pointer group"
            onClick={() => avatarRef.current?.click()}
          >
            {avatarPreview ? (
              <img src={avatarPreview} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-blue-800 flex items-center justify-center text-white text-2xl font-bold">
                {initials}
              </div>
            )}
            <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              {uploadingAvt
                ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <Camera className="w-6 h-6 text-white" />
              }
            </div>
          </div>
          <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
        </div>

        <div className="flex-1 min-w-0 text-center sm:text-left">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{user?.nom_complet}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{user?.email}</p>
          <div className="flex items-center justify-center sm:justify-start gap-2 mt-3 flex-wrap">
            <span className={`text-xs px-2.5 py-1 rounded-full font-semibold capitalize ${roleBadge}`}>
              {user?.role}
            </span>
            {user?.est_actif
              ? <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-semibold">Actif</span>
              : <span className="text-xs px-2.5 py-1 rounded-full bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-semibold">Inactif</span>
            }
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
            Membre depuis le {fmtDate(user?.date_creation)}
          </p>
        </div>

        {/* Stats */}
        {stats && (
          <div className="flex gap-6 shrink-0">
            <div className="flex flex-col items-center gap-1">
              <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{stats.document_count}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">documents</p>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="w-10 h-10 bg-purple-50 dark:bg-purple-900/20 rounded-xl flex items-center justify-center">
                <HardDrive className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{fmtSize(stats.total_size)}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">utilisés</p>
            </div>
          </div>
        )}
      </div>

      {/* Formulaire infos */}
      <form onSubmit={handleInfoSave} className="card p-6 space-y-5">
        <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <UserIcon className="w-4 h-4 text-gray-400 dark:text-gray-500" /> Informations personnelles
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Nom complet</label>
            <input
              className="input"
              value={form.nom_complet}
              onChange={(e) => setForm((f) => ({ ...f, nom_complet: e.target.value }))}
              required
              minLength={2}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> Adresse email</span>
            </label>
            <input
              type="email"
              className="input"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Rôle</label>
          <div className={`inline-flex items-center px-3 py-2 rounded-xl text-sm font-medium ${roleBadge}`}>
            <Check className="w-4 h-4 mr-1.5" />
            {user?.role === 'admin' ? 'Administrateur' : 'Utilisateur'}
            <span className="ml-2 text-xs opacity-70">(non modifiable)</span>
          </div>
        </div>

        <div className="flex justify-end">
          <button type="submit" disabled={savingInfo} className="btn-primary gap-2">
            {savingInfo
              ? <><Spinner /> Enregistrement…</>
              : <><Save className="w-4 h-4" /> Enregistrer</>
            }
          </button>
        </div>
      </form>

      {/* Formulaire mot de passe */}
      <form onSubmit={handlePasswordSave} className="card p-6 space-y-5">
        <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Key className="w-4 h-4 text-gray-400 dark:text-gray-500" /> Changer le mot de passe
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Mot de passe actuel</label>
            <input
              type="password"
              className="input"
              placeholder="••••••••"
              value={pwdForm.ancien}
              onChange={(e) => setPwdForm((f) => ({ ...f, ancien: e.target.value }))}
              required
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Nouveau mot de passe</label>
              <input
                type="password"
                className="input"
                placeholder="••••••••"
                value={pwdForm.nouveau}
                onChange={(e) => setPwdForm((f) => ({ ...f, nouveau: e.target.value }))}
                required
                minLength={8}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Confirmation</label>
              <input
                type="password"
                className={`input ${pwdForm.confirm && pwdForm.confirm !== pwdForm.nouveau ? 'border-red-400 dark:border-red-500' : ''}`}
                placeholder="••••••••"
                value={pwdForm.confirm}
                onChange={(e) => setPwdForm((f) => ({ ...f, confirm: e.target.value }))}
                required
              />
              {pwdForm.confirm && pwdForm.confirm !== pwdForm.nouveau && (
                <p className="text-xs text-red-500 mt-1">Les mots de passe ne correspondent pas</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={savingPwd || (pwdForm.confirm && pwdForm.confirm !== pwdForm.nouveau)}
            className="btn-primary gap-2"
          >
            {savingPwd
              ? <><Spinner /> Modification…</>
              : <><Key className="w-4 h-4" /> Modifier le mot de passe</>
            }
          </button>
        </div>
      </form>
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
