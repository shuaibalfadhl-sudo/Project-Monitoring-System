'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { requestRefresh } from '@/lib/coalescedRefresh'

const REALTIME_TABLES = [
  'projects',
  'project_members',
  'project_modules',
  'project_module_status_history',
] as const

export default function DashboardRealtime() {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // One shared refresh with the other listeners (see lib/coalescedRefresh)
    const handleRefresh = () => requestRefresh(router.refresh)

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
      supabase.removeChannel(channel)
    }
  }, [supabase, router])

  return null
}
