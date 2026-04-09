import { Link } from 'react-router-dom'
import {
  FileText, Clock, Shield, Zap, Archive,
  ArrowRight, CheckCircle, Star, ChevronRight,
  Sun, Moon,
} from 'lucide-react'
import { useDarkMode } from '../context/DarkModeContext'

const BENEFITS = [
  {
    icon: Clock,
    color: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    title: 'Gain de temps',
    desc: 'Retrouvez n\'importe quel document en quelques secondes grâce à la recherche intelligente.',
  },
  {
    icon: Shield,
    color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    title: 'Sécurité renforcée',
    desc: 'Contrôle des accès par utilisateur, archivage automatique, aucune donnée ne se perd.',
  },
  {
    icon: Zap,
    color: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    title: 'Recherche instantanée',
    desc: 'Recherche dans le titre, la description et les tags pour trouver ce dont vous avez besoin.',
  },
  {
    icon: Archive,
    color: 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    title: 'Zéro papier',
    desc: 'Dématérialisez vos processus documentaires et réduisez le recours aux documents physiques.',
  },
]

const TESTIMONIALS = [
  {
    text: 'Depuis que nous utilisons SieSie, retrouver un contrat ou une facture prend quelques secondes. Un vrai gain de temps pour toute l\'équipe.',
    author: 'Marie L.',
    role: 'Directrice Administrative',
    company: 'Cabinet Conseil Nord',
  },
  {
    text: 'La simplicité de prise en main nous a séduits. En moins d\'une heure, toute notre équipe était opérationnelle et organisée.',
    author: 'Thomas B.',
    role: 'Responsable RH',
    company: 'Groupe Meridian PME',
  },
  {
    text: 'Nos dossiers clients sont enfin organisés et sécurisés. Fini les fichiers perdus sur les postes locaux !',
    author: 'Sophie M.',
    role: 'Gérante',
    company: 'Innovate Solutions',
  },
]

const WHY = [
  {
    title: 'Adapté aux PME',
    desc: 'Interface claire et intuitive, sans complexité inutile. Vos équipes sont opérationnelles en quelques minutes.',
    check: true,
  },
  {
    title: 'Accès sécurisé',
    desc: 'Chaque utilisateur accède uniquement à ses propres documents. Les administrateurs gèrent les droits.',
    check: true,
  },
  {
    title: 'Disponible partout',
    desc: 'Accessible depuis n\'importe quel navigateur, sur ordinateur ou tablette. Aucune installation requise.',
    check: true,
  },
  {
    title: 'Évolutif avec vous',
    desc: 'Ajoutez des utilisateurs, des documents et des catégories au rythme de la croissance de votre entreprise.',
    check: true,
  },
]

function DarkToggle() {
  const { dark, toggleDark } = useDarkMode()
  return (
    <button
      onClick={toggleDark}
      title={dark ? 'Mode clair' : 'Mode sombre'}
      className="p-2 rounded-xl text-gray-500 dark:text-gray-400
                 hover:bg-gray-100 dark:hover:bg-gray-800
                 transition-all duration-200"
    >
      <span className="relative w-5 h-5 block">
        <Sun
          className={`w-5 h-5 absolute inset-0 transition-all duration-300
            ${dark ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 rotate-90 scale-50'}`}
        />
        <Moon
          className={`w-5 h-5 absolute inset-0 transition-all duration-300
            ${dark ? 'opacity-0 -rotate-90 scale-50' : 'opacity-100 rotate-0 scale-100'}`}
        />
      </span>
    </button>
  )
}

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex flex-col transition-colors duration-300">

      {/* ── Navbar ──────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-40 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 transition-colors duration-300">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-800 rounded-xl flex items-center justify-center shadow-sm">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-gray-900 dark:text-white text-lg tracking-tight">SieSie</span>
          </div>
          <div className="flex items-center gap-2">
            <DarkToggle />
            <Link
              to="/login"
              className="inline-flex items-center gap-2 bg-blue-800 hover:bg-blue-900 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors shadow-sm"
            >
              Se connecter <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto w-full px-6 pt-20 pb-24 text-center">
        <h1 className="text-5xl lg:text-6xl font-black text-gray-900 dark:text-white leading-tight mb-5">
          Simplifiez la gestion de vos<br />
          <span className="text-blue-800 dark:text-blue-400">documents d'entreprise</span>
        </h1>
        <p className="text-xl text-gray-500 dark:text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          SieSie centralise, organise et sécurise tous vos documents en un seul endroit.
          Accessible à toute votre équipe, à tout moment.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/login"
            className="inline-flex items-center justify-center gap-2 bg-blue-800 hover:bg-blue-900 text-white font-bold px-8 py-4 rounded-xl transition-colors text-base shadow-lg shadow-blue-800/20"
          >
            Commencer gratuitement <ArrowRight className="w-5 h-5" />
          </Link>
          <Link
            to="/login"
            className="inline-flex items-center justify-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-600 text-gray-700 dark:text-gray-200 font-semibold px-8 py-4 rounded-xl transition-colors text-base"
          >
            Se connecter
          </Link>
        </div>
      </section>

      {/* ── Bénéfices ───────────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto w-full px-6 pb-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
            Tout ce dont vous avez besoin
          </h2>
          <p className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
            Une solution complète pour digitaliser et sécuriser la gestion documentaire de votre entreprise
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {BENEFITS.map(({ icon: Icon, color, title, desc }) => (
            <div
              key={title}
              className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-6 hover:shadow-lg dark:hover:shadow-gray-950/40 hover:-translate-y-1 transition-all duration-200 group"
            >
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${color} group-hover:scale-110 transition-transform duration-200`}>
                <Icon className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-gray-900 dark:text-white mb-2">{title}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Pourquoi SieSie ─────────────────────────────────────────────────── */}
      <section className="bg-white dark:bg-gray-900 border-y border-gray-100 dark:border-gray-800 transition-colors duration-300">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                Pourquoi choisir SieSie ?
              </h2>
              <p className="text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
                Une plateforme pensée pour les équipes qui veulent aller à l'essentiel :
                trouver le bon document, au bon moment, sans perdre de temps.
              </p>
              <div className="space-y-4">
                {WHY.map(({ title, desc }) => (
                  <div key={title} className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                      <CheckCircle className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white text-sm">{title}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-800 to-blue-900 rounded-3xl p-8 text-white">
              <p className="text-blue-200 text-sm font-semibold uppercase tracking-wider mb-6">Comptes de démonstration</p>
              <div className="space-y-4">
                {[
                  { role: 'Administrateur', email: 'admin@gedpme.com', pwd: 'admin123' },
                  { role: 'Utilisateur', email: 'user@gedpme.com', pwd: 'user123' },
                ].map(({ role, email, pwd }) => (
                  <div key={email} className="bg-blue-900/50 rounded-2xl p-4">
                    <p className="text-blue-300 text-xs font-semibold uppercase tracking-wide mb-1">{role}</p>
                    <p className="font-mono text-sm text-white">{email}</p>
                    <p className="font-mono text-sm text-blue-300 mt-0.5">Mot de passe : <span className="text-white">{pwd}</span></p>
                  </div>
                ))}
              </div>
              <Link
                to="/login"
                className="mt-6 w-full inline-flex items-center justify-center gap-2 bg-white text-blue-800 font-bold px-6 py-3 rounded-xl hover:bg-blue-50 transition-colors text-sm"
              >
                Accéder à la démo <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Témoignages ─────────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto w-full px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
            Ce que disent nos utilisateurs
          </h2>
          <p className="text-gray-500 dark:text-gray-400">Des équipes qui ont transformé leur gestion documentaire</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TESTIMONIALS.map(({ text, author, role, company }) => (
            <div
              key={author}
              className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-6 hover:shadow-md dark:hover:shadow-gray-950/30 transition-all duration-200"
            >
              <div className="flex gap-0.5 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed mb-5">"{text}"</p>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white text-sm">{author}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{role} · {company}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA final ───────────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto w-full px-6 pb-20">
        <div className="bg-blue-800 rounded-3xl p-10 lg:p-14 text-center text-white relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-700 rounded-full opacity-40" />
          <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-blue-900 rounded-full opacity-40" />
          <div className="relative z-10">
            <h2 className="text-3xl font-bold mb-3">Prêt à vous lancer ?</h2>
            <p className="text-blue-200 mb-8 max-w-lg mx-auto">
              Rejoignez les équipes qui ont simplifié leur gestion documentaire avec SieSie.
            </p>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 bg-white text-blue-800 font-bold px-8 py-4 rounded-xl hover:bg-blue-50 transition-colors text-base shadow-lg"
            >
              Commencer gratuitement <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="mt-auto border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 transition-colors duration-300">
        <div className="max-w-6xl mx-auto px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-800 rounded-lg flex items-center justify-center">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-bold text-gray-700 dark:text-gray-300">SieSie</span>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            © 2025 SieSie. Tous droits réservés.
          </p>
        </div>
      </footer>
    </div>
  )
}
