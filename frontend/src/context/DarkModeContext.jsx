import { createContext, useContext, useEffect, useState } from 'react'

const DarkModeContext = createContext({ dark: false, toggleDark: () => {} })

export function DarkModeProvider({ children }) {
  const [dark, setDark] = useState(() => {
    const stored = localStorage.getItem('theme')
    if (stored) return stored === 'dark'
    // Respecte la préférence système si aucune préférence enregistrée
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark])

  return (
    <DarkModeContext.Provider value={{ dark, toggleDark: () => setDark((d) => !d) }}>
      {children}
    </DarkModeContext.Provider>
  )
}

export const useDarkMode = () => useContext(DarkModeContext)
