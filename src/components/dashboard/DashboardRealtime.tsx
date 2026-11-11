'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const REALTIME_TABLES = [
  'projects',
  'project_members',
  'project_modules',
  'project_module_status_history',
] as const

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
      }, 300)
    }

    let channel = supabase.channel('global-dashboard-realtime')
    for (const table of REALTIME_TABLES) {
      channel = channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        handleRefresh
      )
    }
    channel.subscribe()

    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current)
      }
      supabase.removeChannel(channel)
    }
  }, [supabase, router])

  return null
}
