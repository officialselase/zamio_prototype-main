import React, { createContext, useState, useEffect, useContext } from 'react'
type ThemeContextType = { theme: 'light'|'dark'; toggle: () => void }
const ThemeContext = createContext<ThemeContextType | undefined>(undefined)
export default function ThemeProvider({children}:{children:React.ReactNode}) {
  const [theme, setTheme] = useState<'light'|'dark'>(() => {
    // Check localStorage first, then default to dark
    const saved = localStorage.getItem('theme')
    return (saved as 'light'|'dark') || 'dark'
  })

  useEffect(()=>{
    // Apply theme to document
    document.documentElement.classList.toggle('dark', theme === 'dark')
    // Save to localStorage
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggle = ()=> setTheme(t => t === 'dark' ? 'light' : 'dark')

  return <ThemeContext.Provider value={{theme, toggle}}>{children}</ThemeContext.Provider>
}
export const useTheme = ()=> {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider')
  return ctx
}
