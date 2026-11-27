'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { requestRefresh, takePendingRefresh } from '@/lib/coalescedRefresh'
import { toast } from 'sonner'

interface NotificationItem {
  label: string
  count: number
  href: string
}

interface NavCountsContextType {
  forQaCount: number
  traineeApproveCount: number
  qaRevisionCount: number
  pmReviewCount: number
  qaApproveCount: number
  deploymentCount: number
  notificationCount: number
  developmentCount: number
  revisionCount: number
  revisingCount: number
  weeklyTasksCount: number
  doneTasksCount: number
  notifications: NotificationItem[]
  refreshCounts: () => Promise<void>
}

const NavCountsContext = createContext<NavCountsContextType>({
  forQaCount: 0,
  traineeApproveCount: 0,
  qaRevisionCount: 0,
  pmReviewCount: 0,
  qaApproveCount: 0,
  deploymentCount: 0,
  developmentCount: 0,
  revisionCount: 0,
  revisingCount: 0,
  weeklyTasksCount: 0,
  doneTasksCount: 0,
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
  initialTraineeApproveCount?: number
  initialQaRevisionCount: number
  initialPmReviewCount?: number
  initialQaApproveCount?: number
  initialDeploymentCount?: number
  initialDevelopmentCount?: number
  initialRevisionCount?: number
  initialRevisingCount?: number
  initialWeeklyTasksCount?: number
  initialDoneTasksCount?: number
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
  initialTraineeApproveCount = 0,
  initialQaRevisionCount,
  initialPmReviewCount = 0,
  initialQaApproveCount = 0,
  initialDeploymentCount = 0,
  initialDevelopmentCount = 0,
  initialRevisionCount = 0,
  initialRevisingCount = 0,
  initialWeeklyTasksCount = 0,
  initialDoneTasksCount = 0,
  initialNotificationCount,
  initialNotifications,
  profile,
  activeCompanyId,
}: NavCountsProviderProps) {
  const [forQaCount, setForQaCount] = useState(initialForQaCount);
  const [traineeApproveCount, setTraineeApproveCount] = useState(initialTraineeApproveCount);
  const [qaRevisionCount, setQaRevisionCount] = useState(initialQaRevisionCount);
  const [pmReviewCount, setPmReviewCount] = useState(initialPmReviewCount);
  const [qaApproveCount, setQaApproveCount] = useState(initialQaApproveCount);
  const [deploymentCount, setDeploymentCount] = useState(initialDeploymentCount);
  const [notificationCount, setNotificationCount] = useState(initialNotificationCount);
  const [notifications, setNotifications] = useState<NotificationItem[]>(initialNotifications);
  const [developmentCount, setDevelopmentCount] = useState(initialDevelopmentCount);
  const [revisionCount, setRevisionCount] = useState(initialRevisionCount);
  const [revisingCount, setRevisingCount] = useState(initialRevisingCount);
  const [weeklyTasksCount, setWeeklyTasksCount] = useState(initialWeeklyTasksCount);
  const [doneTasksCount, setDoneTasksCount] = useState(initialDoneTasksCount);

  const prevNotifCountRef = useRef(initialNotificationCount)
  const router = useRouter()
  const supabase = createClient()
  const isFetchingRef = useRef(false)

  // Sync state if initial props change
  useEffect(() => {
    setForQaCount(initialForQaCount)
    setTraineeApproveCount(initialTraineeApproveCount)
    setQaRevisionCount(initialQaRevisionCount)
    setPmReviewCount(initialPmReviewCount)
    setQaApproveCount(initialQaApproveCount)
    setDeploymentCount(initialDeploymentCount)
    setDevelopmentCount(initialDevelopmentCount)
    setRevisionCount(initialRevisionCount)
    setRevisingCount(initialRevisingCount)
    setWeeklyTasksCount(initialWeeklyTasksCount)
    setDoneTasksCount(initialDoneTasksCount)
    setNotificationCount(initialNotificationCount)
    setNotifications(initialNotifications)
  }, [
    initialForQaCount,
    initialTraineeApproveCount,
    initialQaRevisionCount,
    initialPmReviewCount,
    initialQaApproveCount,
    initialDeploymentCount,
    initialDevelopmentCount,
    initialRevisionCount,
    initialRevisingCount,
    initialWeeklyTasksCount,
    initialDoneTasksCount,
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
      let traineeApprCount = 0
      let qRevCount = 0
      let pmRevCount = 0
      let qaApprCount = 0
      let depCount = 0

      // System auditor or Super Admin QA counts
      if (profile.role === 'system_auditor' || profile.role === 'super_admin') {
        const statuses: string[] = []

        if (profile.role === 'super_admin') {
          const { data } = await supabase
            .from('projects')
            .select('project_modules(id, status)')
          data?.forEach((project: any) => {
            project.project_modules?.forEach((module: any) => statuses.push(module.status))
          })
        } else {
          let query = supabase
            .from('project_members')
            .select('projects!inner(id, company_id, project_modules(id, status))')
            .eq('user_id', profile.id)
          if (activeCompanyId) {
            query = query.eq('projects.company_id', activeCompanyId)
          }
          const { data } = await query
          data?.forEach((membership: any) => {
            membership.projects?.project_modules?.forEach((module: any) => statuses.push(module.status))
          })
        }

        fQaCount = statuses.filter((status) => status === 'for_qa' || status === 'auditing').length
        traineeApprCount = statuses.filter((status) => status === 'trainee_approve').length

        if (fQaCount > 0) {
          notifCount += fQaCount
          notifs.push({ label: 'For QA', count: fQaCount, href: '/qa-monitoring' })
        }
        if (traineeApprCount > 0) {
          notifCount += traineeApprCount
          notifs.push({ label: 'Trainee Approve', count: traineeApprCount, href: '/trainee-approve' })
        }
      }

      // Trainee QA and Dev Workspace counts — only modules assigned to them.
      if (profile.role === 'trainee') {
        let qaQuery = supabase
          .from('project_modules')
          .select('id, status, projects!inner(company_id)')
          .eq('assigned_auditor', profile.id)
          .in('status', ['for_qa', 'auditing'])
        if (activeCompanyId) {
          qaQuery = qaQuery.eq('projects.company_id', activeCompanyId)
        }
        const { data: qaModules } = await qaQuery
        let qaCount = 0

        if (qaModules && qaModules.length > 0) {
          const { data: approvedHistory } = await supabase
            .from('project_module_status_history')
            .select('module_id')
            .in('module_id', qaModules.map((module) => module.id))
            .eq('status', 'trainee_approve')

          const approvedModuleIds = new Set(approvedHistory?.map((entry) => entry.module_id) || [])
          qaCount = qaModules.filter((module) => !approvedModuleIds.has(module.id)).length
        }

        fQaCount = qaCount
        if (qaCount > 0) {
          notifCount += qaCount
          notifs.push({ label: 'QA Modules', count: qaCount, href: '/qa-monitoring' })
        }

        let devQuery = supabase
          .from('project_members')
          .select('projects!inner(id, company_id, project_modules(id, status, assigned_developer_id))')
          .eq('user_id', profile.id)
        if (activeCompanyId) {
          devQuery = devQuery.eq('projects.company_id', activeCompanyId)
        }
        const { data: devMemberships } = await devQuery
        const devModules: any[] = []
        devMemberships?.forEach((d: any) => {
          d.projects?.project_modules?.forEach((m: any) => {
            if (m.assigned_developer_id === profile.id && ['development', 'developing', 'revision', 'revising'].includes(m.status)) {
              devModules.push(m)
            }
          })
        })
        const devCount = devModules.filter(m => m.status === 'development' || m.status === 'developing').length
        const revCount = devModules.filter(m => m.status === 'revision').length
        const revisingCnt = devModules.filter(m => m.status === 'revising').length
        setDevelopmentCount(devCount)
        setRevisionCount(revCount)
        setRevisingCount(revisingCnt)
        const devWorkspaceCount = devCount + revCount + revisingCnt
        if (devWorkspaceCount > 0) {
          notifCount += devWorkspaceCount
          notifs.push({ label: 'Dev Workspace', count: devWorkspaceCount, href: '/dev-workspace' })
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

      // Weekly pipeline counts (all roles): tasks assigned to me that are not
      // done or completed, and done tasks I created.
      const weeklyTasksQuery = supabase
        .from('weekly_plans')
        .select('id', { count: 'exact', head: true })
        .eq('assigned_personnel', profile.id)
        .neq('status', 'done')
        .neq('status', 'completed')
      const doneTasksQuery = supabase
        .from('weekly_plans')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'done')
        .eq('created_by', profile.id)
      const [{ count: weeklyCount }, { count: doneCount }] = await Promise.all([
        weeklyTasksQuery,
        doneTasksQuery,
      ])
      setWeeklyTasksCount(weeklyCount ?? 0)
      setDoneTasksCount(doneCount ?? 0)

      // Check for toast notification on count increase
      if (notifCount > prevNotifCountRef.current) {
        toast.info('You have new tasks that need your attention!')
      }
      prevNotifCountRef.current = notifCount

      // Update state
      setForQaCount(fQaCount)
      setTraineeApproveCount(traineeApprCount)
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
      // Counts: refreshed here (a light browser query). The page itself: one shared refresh for all listeners.
      requestRefresh(router.refresh)
      if (document.visibilityState === 'hidden') return
      if (debounceTimer) clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => {
        fetchCounts()
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
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'weekly_plans' },
        () => {
          handleSync()
        }
      )
      .subscribe()

    // Polling fallback every 60 seconds (realtime keeps the counts current); skipped while the tab is hidden
    const interval = setInterval(() => {
      if (document.visibilityState !== 'hidden') fetchCounts()
    }, 60000)

    // Tab becomes visible again: update the counts, and refresh the page once if something changed while hidden
    // (or the tab was hidden over a minute, in case the browser dropped the realtime connection meanwhile)
    let hiddenAt = 0
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAt = Date.now()
        return
      }
      fetchCounts()
      const changed = takePendingRefresh()
      const longAway = hiddenAt > 0 && Date.now() - hiddenAt > 60000
      hiddenAt = 0
      if (changed || longAway) router.refresh()
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibility)
      supabase.removeChannel(channel)
    }
  }, [supabase, fetchCounts, router])

  return (
    <NavCountsContext.Provider
      value={{
        forQaCount,
        traineeApproveCount,
        qaRevisionCount,
        pmReviewCount,
        qaApproveCount,
        deploymentCount,
        notificationCount,
        developmentCount,
        revisionCount,
        revisingCount,
        weeklyTasksCount,
        doneTasksCount,
        notifications,
        refreshCounts: fetchCounts,
      }}
    >
      {children}
    </NavCountsContext.Provider>
  )
}
