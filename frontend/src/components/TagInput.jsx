import { useRef, useState } from 'react'
import { X } from 'lucide-react'

export default function TagInput({ tags = [], onChange, placeholder = 'Ajouter un tag…' }) {
  const [input, setInput] = useState('')
  const ref = useRef(null)

  const addTag = (raw) => {
    const val = raw.trim().toLowerCase()
    if (!val || tags.includes(val)) return
    onChange([...tags, val])
    setInput('')
  }

  const removeTag = (tag) => onChange(tags.filter((t) => t !== tag))

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(input)
    } else if (e.key === 'Backspace' && !input && tags.length) {
      removeTag(tags[tags.length - 1])
    }
  }

  return (
    <div
      className="flex flex-wrap gap-1.5 items-center px-3 py-2 rounded-xl
                 border border-gray-200 dark:border-gray-600
                 bg-white dark:bg-gray-700
                 focus-within:ring-2 focus-within:ring-blue-500/30 focus-within:border-blue-500 dark:focus-within:border-blue-400
                 transition-all duration-150 cursor-text min-h-[42px]"
      onClick={() => ref.current?.focus()}
    >
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2.5 py-0.5 rounded-full text-xs font-medium"
        >
          {tag}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); removeTag(tag) }}
            className="hover:text-blue-900 dark:hover:text-blue-200 transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
      <input
        ref={ref}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => input && addTag(input)}
        placeholder={tags.length === 0 ? placeholder : ''}
        className="flex-1 min-w-24 outline-none bg-transparent text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
      />
    </div>
  )
}
