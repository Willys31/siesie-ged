import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search as SearchIcon, Filter, ChevronDown, FileText, Calendar, Tag, X } from 'lucide-react'
import { documentsService } from '../services/documents'
import FileIcon from '../components/FileIcon'
import toast from 'react-hot-toast'

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { day:'2-digit', month:'short', year:'numeric' }) : null

const TYPE_OPTS = [
  { value:'', label:'Tous les types' },
  { value:'pdf', label:'PDF' },
  { value:'word', label:'Word (DOCX)' },
  { value:'spreadsheet', label:'Excel (XLSX)' },
  { value:'image', label:'Images' },
]

export default function Search() {
  const [query,       setQuery]       = useState('')
  const [typeF,       setTypeF]       = useState('')
  const [dateDebut,   setDateDebut]   = useState('')
  const [dateFin,     setDateFin]     = useState('')
  const [tagInput,    setTagInput]    = useState('')
  const [tags,        setTags]        = useState([])
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [results,     setResults]     = useState(null)
  const [loading,     setLoading]     = useState(false)
  const inputRef = useRef(null)

  const addTag = (raw) => {
    const v = raw.trim().toLowerCase()
    if (v && !tags.includes(v)) setTags([...tags, v])
    setTagInput('')
  }

  const doSearch = async (e) => {
    e?.preventDefault()
    if (!query.trim()) return
    setLoading(true)
    try {
      const params = { q: query.trim() }
      if (typeF)     params.type       = typeF
      if (dateDebut) params.date_debut = dateDebut
      if (dateFin)   params.date_fin   = dateFin
      if (tags.length) params.tags     = tags.join(',')

      const data = await documentsService.search(params)
      setResults(data)
    } catch (err) {
      toast.error(err.message || 'Erreur de recherche')
    } finally {
      setLoading(false)
    }
  }

  const reset = () => {
    setQuery(''); setTypeF(''); setDateDebut(''); setDateFin('')
    setTags([]); setResults(null); inputRef.current?.focus()
  }

  const hasFilters = typeF || dateDebut || dateFin || tags.length > 0

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Recherche</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Recherchez dans le titre, la description et les tags de vos documents</p>
      </div>

      {/* Grande barre de recherche */}
      <form onSubmit={doSearch} className="card p-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
            <input
              ref={inputRef}
              className="input pl-11 pr-4 h-12 text-base"
              placeholder="Rechercher dans vos documents…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
          </div>
          <button type="button" onClick={() => setFiltersOpen(!filtersOpen)}
            className={`btn-secondary gap-1.5 ${hasFilters ? 'border-blue-300 dark:border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20' : ''}`}>
            <Filter className="w-4 h-4" />
            Filtres
            {hasFilters && <span className="w-5 h-5 bg-blue-600 text-white rounded-full text-xs flex items-center justify-center">{[typeF,dateDebut,dateFin,...tags].filter(Boolean).length}</span>}
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${filtersOpen ? 'rotate-180' : ''}`} />
          </button>
          <button type="submit" disabled={!query.trim() || loading} className="btn-primary px-6 h-12">
            {loading ? <Spinner /> : <><SearchIcon className="w-4 h-4" />Chercher</>}
          </button>
        </div>

        {/* Filtres dépliables */}
        {filtersOpen && (
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 grid grid-cols-1 sm:grid-cols-2 gap-4 animate-slide-up">
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" /> Type de fichier
              </label>
              <select className="input" value={typeF} onChange={(e) => setTypeF(e.target.value)}>
                {TYPE_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" /> Plage de dates
              </label>
              <div className="flex items-center gap-2">
                <input type="date" className="input text-sm" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} />
                <span className="text-gray-400 dark:text-gray-500 text-sm shrink-0">→</span>
                <input type="date" className="input text-sm" value={dateFin} onChange={(e) => setDateFin(e.target.value)} />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5" /> Tags
              </label>
              <div className="flex flex-wrap gap-1.5 items-center p-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 min-h-[42px]">
                {tags.map((t) => (
                  <span key={t} className="inline-flex items-center gap-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2.5 py-0.5 rounded-full text-xs font-medium">
                    {t}
                    <button type="button" onClick={() => setTags(tags.filter((x) => x !== t))}>
                      <X className="w-3 h-3 hover:text-blue-900 dark:hover:text-blue-200" />
                    </button>
                  </span>
                ))}
                <input
                  className="flex-1 min-w-24 outline-none bg-transparent text-sm placeholder-gray-400 dark:placeholder-gray-500 text-gray-900 dark:text-white"
                  placeholder="Ajouter un tag…"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key==='Enter'||e.key===',') { e.preventDefault(); addTag(tagInput) } }}
                  onBlur={() => tagInput && addTag(tagInput)}
                />
              </div>
            </div>

            {hasFilters && (
              <div className="sm:col-span-2">
                <button type="button" onClick={reset} className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 underline">
                  Réinitialiser tous les filtres
                </button>
              </div>
            )}
          </div>
        )}
      </form>

      {/* Résultats */}
      {results !== null && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            {results.total > 0
              ? <><span className="text-blue-700 dark:text-blue-400">{results.total}</span> document{results.total > 1 ? 's' : ''} trouvé{results.total > 1 ? 's' : ''} pour « {results.query} »</>
              : <>Aucun résultat pour « {results.query} »</>}
          </p>

          {results.items.length === 0 ? (
            <div className="card flex flex-col items-center justify-center py-16 text-center">
              <SearchIcon className="w-12 h-12 text-gray-200 dark:text-gray-600 mb-3" />
              <p className="text-gray-500 dark:text-gray-400 font-medium">Aucun document trouvé</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Essayez d'autres mots-clés ou vérifiez les filtres</p>
            </div>
          ) : (
            results.items.map((hit) => <SearchResultCard key={hit.id} hit={hit} />)
          )}
        </div>
      )}

      {/* État initial */}
      {results === null && !loading && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center mb-4">
            <SearchIcon className="w-10 h-10 text-blue-300 dark:text-blue-600" />
          </div>
          <p className="text-gray-500 dark:text-gray-400 font-medium">Commencez votre recherche</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Utilisez des mots-clés présents dans le titre ou la description</p>
        </div>
      )}
    </div>
  )
}

function SearchResultCard({ hit }) {
  const titleHighlight = hit.highlights?.titre?.[0]
  const descHighlight  = hit.highlights?.description?.[0]

  return (
    <Link to={`/documents/${hit.id}`}
      className="card p-5 flex gap-4 hover:shadow-md dark:hover:shadow-gray-950/30 transition-all duration-200 group block">
      <FileIcon mimeOrExt={hit.type_fichier} size="md" />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors">
            {titleHighlight
              ? <span className="search-highlight" dangerouslySetInnerHTML={{ __html: titleHighlight }} />
              : hit.titre}
          </h3>
          <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-full shrink-0">
            {Math.round(hit.score * 100) / 100}
          </span>
        </div>

        {(descHighlight || hit.description) && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
            {descHighlight
              ? <span className="search-highlight" dangerouslySetInnerHTML={{ __html: descHighlight }} />
              : hit.description}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3 mt-2.5">
          {hit.date_upload && (
            <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
              <Calendar className="w-3 h-3" /> {fmtDate(hit.date_upload)}
            </span>
          )}
          {hit.type_fichier && (
            <span className="text-xs text-gray-400 dark:text-gray-500">{hit.type_fichier.split('/')[1]?.toUpperCase() || hit.type_fichier}</span>
          )}
          {hit.tags?.map((t) => (
            <span key={t} className="badge bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">{t}</span>
          ))}
        </div>
      </div>
    </Link>
  )
}

function Spinner() {
  return (
    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
    </svg>
  )
}
