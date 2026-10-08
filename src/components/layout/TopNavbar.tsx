'use client'

import { useState, useEffect, useRef, useTransition } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import SidebarNav from '@/components/layout/SidebarNav'

export default function TopNavbar({ 
  profileName,
  avatarUrl = null,
  companies = [],
  initialActiveCompanyId = null,
  notificationCount = 0,
  notifications = [],
  role,
  userId
}: { 
  profileName: string;
  avatarUrl?: string | null;
  companies?: any[];
  initialActiveCompanyId?: string | null;
  notificationCount?: number;
  notifications?: { label: string, count: number, href: string }[];
  role?: string;
  userId?: string;
}) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [uuidNames, setUuidNames] = useState<Record<string, string>>({})
  const [isPending, startTransition] = useTransition()
  const [switchingTo, setSwitchingTo] = useState<string | null>(null)
  
  // Mobile menu state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  
  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [pathname])
  
  const activeCompany = companies.find(c => c.id === initialActiveCompanyId) || null

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

  // Realtime notifications
  const [prevNotifCount, setPrevNotifCount] = useState(notificationCount)

  useEffect(() => {
    if (notificationCount > prevNotifCount) {
      toast.info('You have new tasks that need your attention!')
    }
    setPrevNotifCount(notificationCount)
  }, [notificationCount, prevNotifCount])

  useEffect(() => {
    const channel = supabase
      .channel('modules_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'project_modules'
        },
        (payload) => {
          // Check if this update might be relevant based on role
          let isRelevant = false
          const newRow = payload.new as any
          
          if (newRow && newRow.status) {
            if (role === 'system_auditor' && newRow.status === 'for_qa') isRelevant = true
            if (role === 'project_manager' && (newRow.status === 'revision' || newRow.status === 'revising')) isRelevant = true
            if (role === 'developer' && newRow.assigned_developer_id === userId && ['development', 'pending', 'revising'].includes(newRow.status)) isRelevant = true
          }

          if (isRelevant) {
            router.refresh()
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, router, role, userId])

  // Generate breadcrumbs from pathname
  const pathSegments = pathname.split('/').filter(p => p !== '')

  // Fetch project names if there are UUIDs in the path
  useEffect(() => {
    const fetchProjectNames = async () => {
      const uuids = pathSegments.filter(s => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s))
      if (uuids.length > 0) {
        // Find UUIDs that we haven't fetched yet
        const missingUuids = uuids.filter(uuid => !uuidNames[uuid])
        if (missingUuids.length > 0) {
          const newNames = { ...uuidNames }
          
          // Check projects
          const { data: pData } = await supabase
            .from('projects')
            .select('id, name')
            .in('id', missingUuids)
            
          if (pData) pData.forEach(p => newNames[p.id] = p.name)
            
          // Check modules
          const { data: mData } = await supabase
            .from('project_modules')
            .select('id, name')
            .in('id', missingUuids)
            
          if (mData) mData.forEach(m => newNames[m.id] = m.name)
          
          setUuidNames(newNames)
        }
      }
    }
    
    fetchProjectNames()
  }, [pathname])

  // Generate breadcrumbs from pathname
  const breadcrumbs = pathSegments.map((segment, index) => {
    const url = `/${pathSegments.slice(0, index + 1).join('/')}`
    const isLast = index === pathSegments.length - 1
    
    // Check if segment is a UUID
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(segment)
    
    let name = segment.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    if (isUuid) {
      name = uuidNames[segment] || 'Details'
    }
    
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

  const handleCompanySelect = (companyId: string) => {
    setSwitchingTo(companyId)
    document.cookie = `activeCompanyId=${companyId}; path=/; max-age=31536000` // 1 year expiry
    startTransition(() => {
      router.refresh()
    })
  }

  return (
    <>
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 h-16 flex items-center justify-between px-4 md:px-6 sticky top-0 z-40 shadow-sm transition-colors duration-300">
        <div className="flex items-center gap-2 md:gap-0">
          {/* Mobile Menu Toggle */}
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 -ml-2 mr-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg md:hidden transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          
          {/* Breadcrumbs */}
          <nav className="flex hidden sm:flex" aria-label="Breadcrumb">
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
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        {/* Company Dropdown */}
        <div className="relative group/company hidden sm:block">
          <button 
            className="flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 px-3 py-1.5 rounded-lg transition-colors focus:outline-none border border-slate-200 dark:border-slate-700"
          >
            <div className="w-5 h-5 rounded-md bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0">
              {activeCompany ? activeCompany.name.charAt(0).toUpperCase() : '?'}
            </div>
            <span className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate max-w-[120px]">
              {activeCompany ? activeCompany.name : 'No Company'}
            </span>
            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-100 dark:border-slate-700 py-1 z-50 opacity-0 invisible group-hover/company:opacity-100 group-hover/company:visible transition-all duration-200 transform origin-top-right">
            <div className="px-3 py-2 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Your Companies
            </div>
            <div className="max-h-60 overflow-y-auto">
              {companies.map(company => (
                <button 
                  key={company.id}
                  onClick={() => handleCompanySelect(company.id)}
                  disabled={isPending}
                  className={`w-full text-left flex items-center gap-2 px-4 py-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed ${
                    company.id === initialActiveCompanyId 
                      ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400' 
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                >
                  <div className="w-5 h-5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center font-bold text-xs shrink-0">
                    {company.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="truncate flex-1">{company.name}</span>
                  {company.id === initialActiveCompanyId && (
                    <svg className="w-4 h-4 ml-auto text-indigo-600 dark:text-indigo-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 border-l border-slate-200 dark:border-slate-700 pl-4">
          {/* Notification Bell */}
          <div className="relative group/notification">
            <button
              className="relative p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors block focus:outline-none"
              title="Tasks needing attention"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {notificationCount > 0 && (
                <span className="absolute top-0 right-0 inline-flex items-center justify-center min-w-[20px] h-[20px] px-1 text-[10px] font-bold text-white bg-red-500 rounded-full ring-2 ring-white dark:ring-slate-900 shadow-sm animate-pulse">
                  {notificationCount > 99 ? '99+' : notificationCount}
                </span>
              )}
            </button>
            
            {/* Notification Dropdown */}
            <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-100 dark:border-slate-700 py-1 z-50 opacity-0 invisible group-hover/notification:opacity-100 group-hover/notification:visible transition-all duration-200 transform origin-top-right">
              <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                <span className="text-sm font-bold text-slate-700 dark:text-white">Notifications</span>
                <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full font-bold">
                  {notificationCount} New
                </span>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length > 0 ? (
                  notifications.map((notif, idx) => (
                    <Link 
                      key={idx} 
                      href={notif.href}
                      className="block px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors border-b border-slate-50 dark:border-slate-700/50 last:border-0"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                            {notif.label}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            You have {notif.count} module{notif.count !== 1 ? 's' : ''} in {notif.label}
                          </p>
                        </div>
                        <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold text-blue-700 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400 rounded-md shrink-0">
                          {notif.count}
                        </span>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="px-4 py-8 text-center text-slate-500 dark:text-slate-400 text-sm">
                    No new notifications
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* User Dropdown */}
          <div className="relative group">
            <button 
              className="flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800 p-2 rounded-xl transition-colors focus:outline-none cursor-pointer"
            >
              <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  (profileName || 'U').charAt(0).toUpperCase()
                )}
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
              <Link 
                href="/companies" 
                className="block px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-[var(--sys-primary)] font-medium"
              >
                Companies
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
        </div>
      </div>
      </header>

      {/* Mobile Slide-over Sidebar */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity" onClick={() => setIsMobileMenuOpen(false)} />
          <div className="relative flex w-full max-w-xs flex-1 flex-col bg-white dark:bg-slate-950 pt-5 pb-4 transition-transform transform translate-x-0">
            <div className="absolute top-0 right-0 -mr-12 pt-2">
              <button
                type="button"
                className="ml-1 flex h-10 w-10 items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <span className="sr-only">Close sidebar</span>
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="px-6 mb-6">
              <h2 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
                Menu
              </h2>
              {role && (
                <p className="text-[11px] font-bold text-[var(--sys-primary)] mt-1 uppercase tracking-wider">
                  {role.replace('_', ' ')}
                </p>
              )}
            </div>
            
            <div className="h-full overflow-y-auto px-4">
              <SidebarNav role={role || ''} />
              
              <div className="mt-8 border-t border-slate-200 dark:border-slate-800 pt-6">
                <div className="px-2 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">
                  Your Companies
                </div>
                {companies.map(company => (
                  <button 
                    key={company.id}
                    onClick={() => {
                      handleCompanySelect(company.id)
                      setIsMobileMenuOpen(false)
                    }}
                    className={`w-full text-left flex items-center gap-3 px-3 py-2 mb-1 rounded-lg text-sm font-medium ${
                      company.id === initialActiveCompanyId 
                        ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400' 
                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
                      {company.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="truncate flex-1">{company.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Global Page Loading Overlay */}
      {isPending && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/20 dark:bg-slate-900/60 backdrop-blur-sm flex flex-col items-center justify-center transition-all duration-300">
          <div className="bg-white dark:bg-slate-800 px-8 py-6 rounded-2xl shadow-2xl flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-200">
            <svg className="animate-spin w-10 h-10 text-[var(--sys-primary)]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Loading company data...</p>
          </div>
        </div>
      )}
    </>
  )
}
