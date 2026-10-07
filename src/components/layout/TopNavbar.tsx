'use client'

import { useState, useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

export default function TopNavbar({ profileName }: { profileName: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  
  const [isDarkMode, setIsDarkMode] = useState(false)

  // Initialize theme from local storage
  useEffect(() => {
    const localTheme = localStorage.getItem('local-theme')
    const html = document.documentElement
    if (localTheme === 'dark' || (!localTheme && html.classList.contains('dark'))) {
      html.classList.add('dark')
      setIsDarkMode(true)
    } else {
      html.classList.remove('dark')
      setIsDarkMode(false)
    }
  }, [])

  // Generate breadcrumbs from pathname
  const pathSegments = pathname.split('/').filter(p => p !== '')
  const breadcrumbs = pathSegments.map((segment, index) => {
    const url = `/${pathSegments.slice(0, index + 1).join('/')}`
    const isLast = index === pathSegments.length - 1
    const name = segment.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    return { name, url, isLast }
  })

  const toggleTheme = () => {
    const html = document.documentElement
    if (isDarkMode) {
      html.classList.remove('dark')
      localStorage.setItem('local-theme', 'light')
      setIsDarkMode(false)
      toast.success("Switched to Light Mode")
    } else {
      html.classList.add('dark')
      localStorage.setItem('local-theme', 'dark')
      setIsDarkMode(true)
      toast.success("Switched to Dark Mode")
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 h-16 flex items-center justify-between px-6 sticky top-0 z-10 shadow-sm transition-colors duration-300">
      {/* Breadcrumbs */}
      <nav className="flex" aria-label="Breadcrumb">
        <ol className="inline-flex items-center space-x-1 md:space-x-3">
          <li className="inline-flex items-center">
            <Link href="/dashboard" className="text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
              Home
            </Link>
          </li>
          {breadcrumbs.map((crumb, idx) => (
            <li key={crumb.url}>
              <div className="flex items-center">
                <svg className="w-4 h-4 text-gray-400 mx-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                {crumb.isLast ? (
                  <span className="text-sm font-bold text-slate-900 dark:text-white ml-1 md:ml-2">
                    {crumb.name}
                  </span>
                ) : (
                  <Link href={crumb.url} className="text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white ml-1 md:ml-2">
                    {crumb.name}
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ol>
      </nav>

      {/* User Dropdown */}
      <div className="relative group">
        <button 
          className="flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800 p-2 rounded-xl transition-colors focus:outline-none cursor-pointer"
        >
          <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold text-sm shrink-0">
            {(profileName || 'U').charAt(0).toUpperCase()}
          </div>
          <span className="text-sm font-bold text-slate-700 dark:text-slate-200 hidden sm:block">{profileName}</span>
          <svg className="w-4 h-4 text-slate-400 transition-transform group-hover:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-100 dark:border-slate-700 py-1 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform origin-top-right">
          <Link 
            href="/profile" 
            className="block px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-[var(--sys-primary)] font-medium"
          >
            Profile
          </Link>
          <button 
            onClick={toggleTheme}
            className="w-full text-left block px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-[var(--sys-primary)] font-medium"
          >
            {isDarkMode ? 'Light Mode' : 'Dark Mode'}
          </button>
          <div className="border-t border-slate-100 dark:border-slate-700 my-1"></div>
          <button 
            onClick={handleLogout}
            className="w-full text-left block px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 font-bold"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  )
}
