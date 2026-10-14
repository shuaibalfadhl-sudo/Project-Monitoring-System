'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function DashboardRealtime() {
  const router = useRouter()
  const supabase = createClient()
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const handleRefresh = () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current)
      }
      refreshTimerRef.current = setTimeout(() => {
        router.refresh()
      }, 150)
    }

    // Subscribe to changes on project_modules, projects, and project_members
    const channel = supabase
      .channel('global-dashboard-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'project_modules' },
        (payload) => {
          handleRefresh()
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'projects' },
        (payload) => {
          handleRefresh()
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'project_members' },
        (payload) => {
          handleRefresh()
        }
      )
      .subscribe()

    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current)
      }
      supabase.removeChannel(channel)
    }
  }, [supabase, router])

  return null // This component works invisibly in the background
}
