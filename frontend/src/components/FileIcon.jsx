import { FileText, FileSpreadsheet, Image, File, FileCode } from 'lucide-react'

const CONFIGS = [
  { match: 'pdf',                 icon: FileText,        color: 'text-red-500',    bg: 'bg-red-50',    label: 'PDF'  },
  { match: 'word',                icon: FileText,        color: 'text-blue-500',   bg: 'bg-blue-50',   label: 'DOC'  },
  { match: 'docx',                icon: FileText,        color: 'text-blue-500',   bg: 'bg-blue-50',   label: 'DOCX' },
  { match: 'msword',              icon: FileText,        color: 'text-blue-500',   bg: 'bg-blue-50',   label: 'DOC'  },
  { match: 'excel',               icon: FileSpreadsheet, color: 'text-emerald-500',bg: 'bg-emerald-50',label: 'XLS'  },
  { match: 'spreadsheet',        icon: FileSpreadsheet, color: 'text-emerald-500',bg: 'bg-emerald-50',label: 'XLSX' },
  { match: 'image',               icon: Image,           color: 'text-purple-500', bg: 'bg-purple-50', label: 'IMG'  },
  { match: 'png',                 icon: Image,           color: 'text-purple-500', bg: 'bg-purple-50', label: 'PNG'  },
  { match: 'jpg',                 icon: Image,           color: 'text-purple-500', bg: 'bg-purple-50', label: 'JPG'  },
  { match: 'jpeg',                icon: Image,           color: 'text-purple-500', bg: 'bg-purple-50', label: 'JPG'  },
  { match: 'json',                icon: FileCode,        color: 'text-yellow-500', bg: 'bg-yellow-50', label: 'JSON' },
]

const DEFAULT = { icon: File, color: 'text-gray-500', bg: 'bg-gray-100', label: 'FILE' }

export function getFileConfig(mimeOrExt) {
  if (!mimeOrExt) return DEFAULT
  const s = mimeOrExt.toLowerCase()
  return CONFIGS.find((c) => s.includes(c.match)) || DEFAULT
}

/**
 * Affiche une icône colorée selon le type de fichier.
 * @param {string}  mimeOrExt  — type MIME ou extension
 * @param {'sm'|'md'|'lg'} size
 */
export default function FileIcon({ mimeOrExt, size = 'md', className = '' }) {
  const { icon: Icon, color, bg } = getFileConfig(mimeOrExt)

  const sizes = {
    sm: { wrap: 'w-8 h-8',  icon: 'w-4 h-4'  },
    md: { wrap: 'w-10 h-10', icon: 'w-5 h-5' },
    lg: { wrap: 'w-14 h-14', icon: 'w-7 h-7' },
  }

  const { wrap, icon: iconSize } = sizes[size] || sizes.md

  return (
    <div className={`${wrap} ${bg} rounded-xl flex items-center justify-center shrink-0 ${className}`}>
      <Icon className={`${iconSize} ${color}`} />
    </div>
  )
}
