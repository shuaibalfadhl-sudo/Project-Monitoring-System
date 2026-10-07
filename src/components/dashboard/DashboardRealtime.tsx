'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function DashboardRealtime() {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // Subscribe to changes on the project_modules table
    const modulesSubscription = supabase
      .channel('dashboard-modules')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'project_modules' },
        (payload) => {
          console.log('Project modules changed, refreshing dashboard...', payload)
          router.refresh()
        }
      )
      .subscribe()

    // Subscribe to changes on the projects table
    const projectsSubscription = supabase
      .channel('dashboard-projects')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'projects' },
        (payload) => {
          console.log('Projects changed, refreshing dashboard...', payload)
          router.refresh()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(modulesSubscription)
      supabase.removeChannel(projectsSubscription)
    }
  }, [supabase, router])

  return null // This component works invisibly in the background
}
