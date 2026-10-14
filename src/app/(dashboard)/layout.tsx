import { getUserProfile } from '@/lib/auth-utils'
import { createClient } from '@/lib/supabase/server'
import { redirect as nextRedirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import CollapsibleSidebar from '@/components/layout/CollapsibleSidebar'
import TopNavbar from '@/components/layout/TopNavbar'
import DashboardRealtime from '@/components/dashboard/DashboardRealtime'
import { cookies } from 'next/headers'
import { NavCountsProvider } from '@/context/NavCountsContext'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const profile = await getUserProfile()

  if (!profile) {
    nextRedirect('/login')
  }

  const isManager = profile.role === 'project_manager'
  const isAuditor = profile.role === 'system_auditor'
  const isSuperAdmin = profile.role === 'super_admin'

  // Fetch settings for dynamic logo and name in the sidebar
  const supabaseServer = await createClient()
  const { data: settings } = await supabaseServer
    .from('system_details')
    .select('*')
    .eq('id', 1)
    .single()
  // Fetch user's companies (RLS automatically filters to ones they are a member of)
  const { data: companies } = await supabaseServer
    .from('companies')
    .select('id, name')
    .order('name')

  // Get active company from cookie
  const cookieStore = await cookies()
  let activeCompanyId = cookieStore.get('activeCompanyId')?.value || null

  // Auto-select first company if none is selected but user has companies
  if (!activeCompanyId && companies && companies.length > 0) {
    activeCompanyId = companies[0].id
  }

  // Calculate notifications based on role and active company
  let notificationCount = 0
  let notifications: { label: string, count: number, href: string }[] = []
  let forQaCount = 0
  let qaRevisionCount = 0

  if (profile.role === 'system_auditor' || profile.role === 'super_admin') {
    if (profile.role === 'super_admin') {
      let query = supabaseServer
        .from('projects')
        .select('project_modules(id, status)')
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
        notificationCount += count
        forQaCount = count
        notifications.push({ label: 'For QA', count, href: '/qa-monitoring' })
      }
    } else {
      let query = supabaseServer
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
          if (m.status === 'for_qa') count++
        })
      })
      if (count > 0) {
        notificationCount += count
        forQaCount = count
        notifications.push({ label: 'For QA', count, href: '/qa-monitoring' })
      }
    }
  }

  if (profile.role === 'project_manager' || profile.role === 'super_admin') {
    let query = supabaseServer
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
        if (
          m.status === 'revision' ||
          m.status === 'revising' ||
          (m.status === 'pm_review' && m.qa_result_document_url)
        ) {
          count++
        }
      })
    })
    if (count > 0) {
      notificationCount += count
      qaRevisionCount = count
      notifications.push({ label: 'Revision', count, href: '/qa-revision' })
    }
  }

  if (profile.role === 'developer') {
    let query = supabaseServer
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

      if (devCount > 0) notifications.push({ label: 'Development', count: devCount, href: '/modules' })
      if (penCount > 0) notifications.push({ label: 'Pending', count: penCount, href: '/modules' })
      if (revCount > 0) notifications.push({ label: 'Revising', count: revCount, href: '/modules' })

      notificationCount += devModules.length
    }
  }

  return (
    <NavCountsProvider
      profile={profile}
      activeCompanyId={activeCompanyId}
      initialForQaCount={forQaCount}
      initialQaRevisionCount={qaRevisionCount}
      initialNotificationCount={notificationCount}
      initialNotifications={notifications}
    >
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-row transition-colors duration-300">
        <DashboardRealtime />

        {/* Collapsible Sidebar */}
        <CollapsibleSidebar
          role={profile.role}
          systemName={settings?.system_name || null}
          systemLogoUrl={settings?.system_logo_url || null}
        />

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-h-screen min-w-0">
          <TopNavbar
            profileName={profile.full_name || 'User'}
            avatarUrl={profile.avatar_path || null}
            companies={companies || []}
            initialActiveCompanyId={activeCompanyId}
            notificationCount={notificationCount}
            notifications={notifications}
            role={profile.role}
            userId={profile.id}
            forQaCount={forQaCount}
            qaRevisionCount={qaRevisionCount}
          />

          <main className="flex-1 p-4 md:p-6 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </NavCountsProvider>
  )
}
