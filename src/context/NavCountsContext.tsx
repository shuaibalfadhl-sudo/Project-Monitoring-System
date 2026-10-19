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
  qaApproveCount: number
  deploymentCount: number
  notificationCount: number
  developmentCount: number
  revisionCount: number
  revisingCount: number
  notifications: NotificationItem[]
  refreshCounts: () => Promise<void>
}

const NavCountsContext = createContext<NavCountsContextType>({
  forQaCount: 0,
  qaRevisionCount: 0,
  pmReviewCount: 0,
  qaApproveCount: 0,
  deploymentCount: 0,
  developmentCount: 0,
  revisionCount: 0,
  revisingCount: 0,
  notificationCount: 0,
  notifications: [],
  refreshCounts: async () => { },
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
  initialQaApproveCount?: number
  initialDeploymentCount?: number
  initialDevelopmentCount?: number
  initialRevisionCount?: number
  initialRevisingCount?: number
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
  initialQaApproveCount = 0,
  initialDeploymentCount = 0,
  initialDevelopmentCount = 0,
  initialRevisionCount = 0,
  initialRevisingCount = 0,
  initialNotificationCount,
  initialNotifications,
  profile,
  activeCompanyId,
}: NavCountsProviderProps) {
  const [forQaCount, setForQaCount] = useState(initialForQaCount);
  const [qaRevisionCount, setQaRevisionCount] = useState(initialQaRevisionCount);
  const [pmReviewCount, setPmReviewCount] = useState(initialPmReviewCount);
  const [qaApproveCount, setQaApproveCount] = useState(initialQaApproveCount);
  const [deploymentCount, setDeploymentCount] = useState(initialDeploymentCount);
  const [notificationCount, setNotificationCount] = useState(initialNotificationCount);
  const [notifications, setNotifications] = useState<NotificationItem[]>(initialNotifications);
  const [developmentCount, setDevelopmentCount] = useState(initialDevelopmentCount);
  const [revisionCount, setRevisionCount] = useState(initialRevisionCount);
  const [revisingCount, setRevisingCount] = useState(initialRevisingCount);

  const prevNotifCountRef = useRef(initialNotificationCount)
  const router = useRouter()
  const supabase = createClient()
  const isFetchingRef = useRef(false)

  // Sync state if initial props change
  useEffect(() => {
    setForQaCount(initialForQaCount)
    setQaRevisionCount(initialQaRevisionCount)
    setPmReviewCount(initialPmReviewCount)
    setQaApproveCount(initialQaApproveCount)
    setDeploymentCount(initialDeploymentCount)
    setDevelopmentCount(initialDevelopmentCount)
    setRevisionCount(initialRevisionCount)
    setRevisingCount(initialRevisingCount)
    setNotificationCount(initialNotificationCount)
    setNotifications(initialNotifications)
  }, [
    initialForQaCount,
    initialQaRevisionCount,
    initialPmReviewCount,
    initialQaApproveCount,
    initialDeploymentCount,
    initialDevelopmentCount,
    initialRevisionCount,
    initialRevisingCount,
    initialNotificationCount,
    initialNotifications,
  ])

  const fetchCounts = useCallback(async () => {
    if (isFetchingRef.current) return
    isFetchingRef.current = true

    try {
      let notifCount = 0
      let notifs: NotificationItem[] = []
      let fQaCount = 0
      let qRevCount = 0
      let pmRevCount = 0
      let qaApprCount = 0
      let depCount = 0

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
            if (m.status === 'for revision' || m.status === 'for_revision') {
              count++
            }
            if (m.status === 'pm_review') {
              pmRevCount++
            }
            if (m.status === 'qa_approved') {
              qaApprCount++
            }
          })
        })
        if (count > 0) {
          notifCount += count
          qRevCount = count
          notifs.push({ label: 'QA Revision', count, href: '/qa-revision' })
        }
        if (pmRevCount > 0) {
          notifCount += pmRevCount
          notifs.push({ label: 'Module Review', count: pmRevCount, href: '/module-review' })
        }
        if (qaApprCount > 0) {
          notifCount += qaApprCount
          notifs.push({ label: 'QA Approved', count: qaApprCount, href: '/qa-approve' })
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
            if (m.assigned_developer_id === profile.id && ['development', 'pending', 'revision', 'revising'].includes(m.status)) {
              devModules.push(m)
            }
          })
        })

        if (devModules.length > 0) {
          const devCount = devModules.filter(m => m.status === 'development').length
          const penCount = devModules.filter(m => m.status === 'pending').length
          const revCount = devModules.filter(m => m.status === 'revision').length
          const revisingCount = devModules.filter(m => m.status === 'revising').length

          const devWorkspaceCount = devCount + revCount + revisingCount
          if (devWorkspaceCount > 0) {
            notifs.push({ label: 'Dev Workspace', count: devWorkspaceCount, href: '/dev-workspace' })
            notifCount += devWorkspaceCount
          }
          if (penCount > 0) {
            notifs.push({ label: 'Pending', count: penCount, href: '/modules' })
            notifCount += penCount
          }

          setDevelopmentCount(devCount)
          setRevisionCount(revCount)
          setRevisingCount(revisingCount)
        } else {
          setDevelopmentCount(0)
          setRevisionCount(0)
          setRevisingCount(0)
        }
      }

      // Super admin Dev Workspace count (all dev/revision/revising modules)
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
        let revisingCount = 0
        data?.forEach((p: any) => {
          p.project_modules?.forEach((m: any) => {
            if (m.status === 'development') devCount++
            else if (m.status === 'revision') revCount++
            else if (m.status === 'revising') revisingCount++
          })
        })
        setDevelopmentCount(devCount)
        setRevisionCount(revCount)
        setRevisingCount(revisingCount)
        const devWorkspaceCount = devCount + revCount + revisingCount
        if (devWorkspaceCount > 0) {
          notifs.push({ label: 'Dev Workspace', count: devWorkspaceCount, href: '/dev-workspace' })
          notifCount += devWorkspaceCount
        }
      }

      // DevOps Dev Workspace count — only modules assigned to them, across their
      // companies' projects (RLS-scoped).
      if (profile.role === 'devops') {
        let query = supabase
          .from('projects')
          .select('project_modules(id, status, assigned_developer_id)')
        if (activeCompanyId) {
          query = query.eq('company_id', activeCompanyId)
        }
        const { data } = await query
        let devCount = 0
        let revCount = 0
        let revisingCount = 0
        data?.forEach((p: any) => {
          p.project_modules?.forEach((m: any) => {
            if (m.assigned_developer_id !== profile.id) return
            if (m.status === 'development') devCount++
            else if (m.status === 'revision') revCount++
            else if (m.status === 'revising') revisingCount++
          })
        })
        setDevelopmentCount(devCount)
        setRevisionCount(revCount)
        setRevisingCount(revisingCount)
        const devWorkspaceCount = devCount + revCount + revisingCount
        if (devWorkspaceCount > 0) {
          notifs.push({ label: 'Dev Workspace', count: devWorkspaceCount, href: '/dev-workspace' })
          notifCount += devWorkspaceCount
        }
      }

      // DevOps (and Super Admin) "For Deployment" count — modules in 'deployment' status.
      // DevOps sees all projects in their companies (RLS-scoped); not filtered by created_by.
      if (profile.role === 'devops' || profile.role === 'super_admin') {
        let query = supabase
          .from('projects')
          .select('project_modules(id, status)')
        if (activeCompanyId) {
          query = query.eq('company_id', activeCompanyId)
        }
        const { data } = await query
        let count = 0
        data?.forEach((p: any) => {
          p.project_modules?.forEach((m: any) => {
            if (m.status === 'deployment') count++
          })
        })
        if (count > 0) {
          notifCount += count
          notifs.push({ label: 'For Deployment', count, href: '/deployment' })
        }
        depCount = count
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
      setQaApproveCount(qaApprCount)
      setDeploymentCount(depCount)
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
      }, 300)
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
        qaApproveCount,
        deploymentCount,
        notificationCount,
        developmentCount,
        revisionCount,
        revisingCount,
        notifications,
        refreshCounts: fetchCounts,
      }}
    >
      {children}
    </NavCountsContext.Provider>
  )
}
