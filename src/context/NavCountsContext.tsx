'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface NotificationItem {
  label: string
  count: number
  href: string
}

interface NavCountsContextType {
  forQaCount: number
  qaRevisionCount: number
  pmReviewCount: number
  notificationCount: number
  developmentCount: number
  revisingCount: number
  notifications: NotificationItem[]
  refreshCounts: () => Promise<void>
}

const NavCountsContext = createContext<NavCountsContextType>({
  forQaCount: 0,
  qaRevisionCount: 0,
  pmReviewCount: 0,
  developmentCount: 0,
  revisingCount: 0,
  notificationCount: 0,
  notifications: [],
  refreshCounts: async () => {},
})

export function useNavCounts() {
  return useContext(NavCountsContext)
}

// Global broadcast function accessible from any component to trigger real-time sync
export const broadcastDataChanged = async () => {
  try {
    const supabase = createClient()
    const channel = supabase.channel('app-realtime-sync')
    await channel.send({
      type: 'broadcast',
      event: 'data_changed',
      payload: { timestamp: Date.now() },
    })
  } catch (err) {
    console.error('Error broadcasting data change:', err)
  }
}

interface NavCountsProviderProps {
  children: React.ReactNode
  initialForQaCount: number
  initialQaRevisionCount: number
  initialPmReviewCount?: number
  initialNotificationCount: number
  initialNotifications: NotificationItem[]
  profile: {
    id: string
    role: string
  }
  activeCompanyId: string | null
}

export function NavCountsProvider({
  children,
  initialForQaCount,
  initialQaRevisionCount,
  initialPmReviewCount = 0,
  initialNotificationCount,
  initialNotifications,
  profile,
  activeCompanyId,
}: NavCountsProviderProps) {
  const [forQaCount, setForQaCount] = useState(initialForQaCount);
  const [qaRevisionCount, setQaRevisionCount] = useState(initialQaRevisionCount);
  const [pmReviewCount, setPmReviewCount] = useState(initialPmReviewCount);
  const [notificationCount, setNotificationCount] = useState(initialNotificationCount);
  const [notifications, setNotifications] = useState<NotificationItem[]>(initialNotifications);
  const [developmentCount, setDevelopmentCount] = useState(0);
  const [revisingCount, setRevisingCount] = useState(0);
  
  const prevNotifCountRef = useRef(initialNotificationCount)
  const router = useRouter()
  const supabase = createClient()
  const isFetchingRef = useRef(false)

  // Sync state if initial props change
  useEffect(() => {
    setForQaCount(initialForQaCount)
    setQaRevisionCount(initialQaRevisionCount)
    setPmReviewCount(initialPmReviewCount)
    setNotificationCount(initialNotificationCount)
    setNotifications(initialNotifications)
  }, [initialForQaCount, initialQaRevisionCount, initialPmReviewCount, initialNotificationCount, initialNotifications])

  const fetchCounts = useCallback(async () => {
    if (isFetchingRef.current) return
    isFetchingRef.current = true

    try {
      let notifCount = 0
      let notifs: NotificationItem[] = []
      let fQaCount = 0
      let qRevCount = 0
      let pmRevCount = 0

      // System auditor or Super Admin QA count
      if (profile.role === 'system_auditor' || profile.role === 'super_admin') {
        if (profile.role === 'super_admin') {
          let query = supabase.from('projects').select('project_modules(id, status)')
          if (activeCompanyId) {
            query = query.eq('company_id', activeCompanyId)
          }
          const { data } = await query
          let count = 0
          data?.forEach((p: any) => {
            p.project_modules?.forEach((m: any) => {
              if (m.status === 'for_qa') count++
            })
          })
          if (count > 0) {
            notifCount += count
            fQaCount = count
            notifs.push({ label: 'For QA', count, href: '/qa-monitoring' })
          }
        } else {
          let query = supabase
            .from('project_members')
            .select('projects!inner(id, company_id, project_modules(id, status))')
            .eq('user_id', profile.id)
          if (activeCompanyId) {
            query = query.eq('projects.company_id', activeCompanyId)
          }
          const { data } = await query
          let count = 0
          data?.forEach((d: any) => {
            d.projects?.project_modules?.forEach((m: any) => {
              if (m.status === 'for_qa' || m.status === 'auditing') count++
            })
          })
          if (count > 0) {
            notifCount += count
            fQaCount = count
            notifs.push({ label: 'For QA', count, href: '/qa-monitoring' })
          }
        }
      }

      // Project Manager or Super Admin Revision count & PM Review count
      if (profile.role === 'project_manager' || profile.role === 'super_admin') {
        let query = supabase
          .from('projects')
          .select('project_modules(id, status, qa_result_document_url)')
        if (activeCompanyId) {
          query = query.eq('company_id', activeCompanyId)
        }
        if (profile.role !== 'super_admin') {
          query = query.eq('created_by', profile.id)
        }
        const { data } = await query
        let count = 0
        data?.forEach((p: any) => {
          p.project_modules?.forEach((m: any) => {
            if (m.status === 'revision') {
              count++
            }
            if (m.status === 'pm_review') {
              pmRevCount++
            }
          })
        })
        if (count > 0) {
          notifCount += count
          qRevCount = count
          notifs.push({ label: 'Revision', count, href: '/qa-revision' })
        }
        if (pmRevCount > 0) {
          notifCount += pmRevCount
          notifs.push({ label: 'Module Review', count: pmRevCount, href: '/module-review' })
        }
      }

      // Developer tasks
      if (profile.role === 'developer') {
        let query = supabase
          .from('project_members')
          .select('projects!inner(id, company_id, project_modules(id, status, assigned_developer_id))')
          .eq('user_id', profile.id)
        if (activeCompanyId) {
          query = query.eq('projects.company_id', activeCompanyId)
        }
        const { data } = await query
        let devModules: any[] = []
        data?.forEach((d: any) => {
          d.projects?.project_modules?.forEach((m: any) => {
            if (m.assigned_developer_id === profile.id && ['development', 'pending', 'revising'].includes(m.status)) {
              devModules.push(m)
            }
          })
        })

        if (devModules.length > 0) {
          const devCount = devModules.filter(m => m.status === 'development').length
          const penCount = devModules.filter(m => m.status === 'pending').length
          const revCount = devModules.filter(m => m.status === 'revising').length

          if (devCount > 0) notifs.push({ label: 'Development', count: devCount, href: '/dev-workspace' })
          if (penCount > 0) notifs.push({ label: 'Pending', count: penCount, href: '/modules' })
          if (revCount > 0) notifs.push({ label: 'Revising', count: revCount, href: '/dev-workspace' })

          notifCount += devModules.length

          setDevelopmentCount(devCount)
          setRevisingCount(revCount)
        } else {
          setDevelopmentCount(0)
          setRevisingCount(0)
        }
      }

      // Super admin Dev Workspace count (all dev/revising modules)
      if (profile.role === 'super_admin') {
        let query = supabase
          .from('projects')
          .select('project_modules(id, status)')
        if (activeCompanyId) {
          query = query.eq('company_id', activeCompanyId)
        }
        const { data } = await query
        let devCount = 0
        let revCount = 0
        data?.forEach((p: any) => {
          p.project_modules?.forEach((m: any) => {
            if (m.status === 'development') devCount++
            else if (m.status === 'revising') revCount++
          })
        })
        setDevelopmentCount(devCount)
        setRevisingCount(revCount)
        if (devCount + revCount > 0) {
          notifs.push({ label: 'Dev Workspace', count: devCount + revCount, href: '/dev-workspace' })
        }
      }

      // Check for toast notification on count increase
      if (notifCount > prevNotifCountRef.current) {
        toast.info('You have new tasks that need your attention!')
      }
      prevNotifCountRef.current = notifCount

      // Update state
      setForQaCount(fQaCount)
      setQaRevisionCount(qRevCount)
      setPmReviewCount(pmRevCount)
      setNotificationCount(notifCount)
      setNotifications(notifs)
    } catch (err) {
      console.error('Error fetching realtime nav counts:', err)
    } finally {
      isFetchingRef.current = false
    }
  }, [supabase, profile.id, profile.role, activeCompanyId])

  // Realtime listeners & broadcast channel
  useEffect(() => {
    let debounceTimer: NodeJS.Timeout | null = null

    const handleSync = () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => {
        fetchCounts()
        router.refresh()
      }, 150)
    }

    const channel = supabase
      .channel('app-realtime-sync')
      .on('broadcast', { event: 'data_changed' }, () => {
        handleSync()
      })
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'project_modules' },
        () => {
          handleSync()
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'projects' },
        () => {
          handleSync()
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'project_members' },
        () => {
          handleSync()
        }
      )
      .subscribe()

    // Polling fallback every 10 seconds
    const interval = setInterval(() => {
      fetchCounts()
    }, 10000)

    // Visibility / tab focus sync
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchCounts()
        router.refresh()
      }
    }
    window.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('focus', handleVisibility)

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      clearInterval(interval)
      window.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('focus', handleVisibility)
      supabase.removeChannel(channel)
    }
  }, [supabase, fetchCounts, router])

  return (
    <NavCountsContext.Provider
      value={{
        forQaCount,
        qaRevisionCount,
        pmReviewCount,
        notificationCount,
        developmentCount,
        revisingCount,
        notifications,
        refreshCounts: fetchCounts,
      }}
    >
      {children}
    </NavCountsContext.Provider>
  )
}
