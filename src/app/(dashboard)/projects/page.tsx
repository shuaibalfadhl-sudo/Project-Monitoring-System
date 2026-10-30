import { createClient } from '@/lib/supabase/server'
import { hasRole } from '@/lib/auth-utils'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { Project } from '@/types/project'
import ProjectsClient from '@/components/projects/ProjectsClient'

export default async function ProjectsPage() {
  const isManager = await hasRole('project_manager')
  const isAuditor = await hasRole('system_auditor')
  const isSuperAdmin = await hasRole('super_admin')
  const isDeveloper = await hasRole('developer')
  
  if (!isManager && !isAuditor && !isSuperAdmin && !isDeveloper) {
    redirect('/dashboard')
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  let projects: any[] = []

  const cookieStore = await cookies()
  const activeCompanyId = cookieStore.get('activeCompanyId')?.value || null;

  if (isSuperAdmin) {
    let query = supabase
      .from('projects')
      .select('*, project_modules(id, status), project_members(user_id)')
      .order('created_at', { ascending: false })

    if (activeCompanyId) {
      query = query.eq('company_id', activeCompanyId)
    }

    const { data: allProjects, error } = await query

    if (error) {
      console.error('Error fetching all projects:', error)
    }

    // Manually fetch all profiles since there's no foreign key constraint
    const { data: allProfiles } = await supabase
      .from('profiles')
      .select('id, full_name')

    const profilesMap = new Map(allProfiles?.map(p => [p.id, p.full_name]) || [])

    projects = (allProjects || []).map(p => ({
      ...p,
      profiles: { full_name: profilesMap.get(p.created_by) }
    }))
  } else if (isManager) {
    // A PM sees projects they created AND projects they were invited to as a member.
    const baseSelect = '*, project_modules(id, status), project_members(user_id)'

    let createdQuery = supabase.from('projects').select(baseSelect)
    if (activeCompanyId) createdQuery = createdQuery.eq('company_id', activeCompanyId)
    const { data: createdProjects, error } = await createdQuery.order('created_at', { ascending: false })
    if (error) console.error('Error fetching manager-created projects:', error)

    let memberQuery = supabase
      .from('project_members')
      .select(`projects!inner(${baseSelect})`)
      .eq('user_id', user.id)
    if (activeCompanyId) memberQuery = memberQuery.eq('projects.company_id', activeCompanyId)
    const { data: memberRows } = await memberQuery
    const memberProjects = memberRows?.map(d => d.projects).filter(Boolean) || []

    const byId = new Map<string, any>()
    for (const p of [...(createdProjects || []), ...memberProjects]) {
      if (p?.id) byId.set(p.id, p)
    }
    projects = [...byId.values()].sort((a, b) =>
      (b.created_at || '').localeCompare(a.created_at || '')
    )
  } else if (isAuditor || isDeveloper) {
    // Auditors/devs see projects they are a member of. Developers can also create their
    // own projects, so include those even if the owner membership row is delayed/missing.
    const baseSelect = '*, project_modules(id, status), project_members(user_id)'

    let memberQuery = supabase
      .from('project_members')
      .select(`projects!inner(${baseSelect})`)
      .eq('user_id', user.id)

    if (activeCompanyId) {
      memberQuery = memberQuery.eq('projects.company_id', activeCompanyId)
    }

    const { data } = await memberQuery

    const byId = new Map<string, any>()
    const memberProjects = (data?.map(d => d.projects).filter(Boolean) || []) as any[]
    for (const p of memberProjects) {
      if (p?.id) byId.set(p.id, p)
    }

    if (isDeveloper) {
      let createdQuery = supabase.from('projects').select(baseSelect).eq('created_by', user.id)
      if (activeCompanyId) {
        createdQuery = createdQuery.eq('company_id', activeCompanyId)
      }
      const { data: createdProjects } = await createdQuery
      for (const p of createdProjects || []) {
        if (p?.id) byId.set(p.id, p)
      }
    }

    const fetchedProjects = [...byId.values()].sort((a, b) =>
      (b.created_at || '').localeCompare(a.created_at || '')
    )

    const { data: allProfiles } = await supabase
      .from('profiles')
      .select('id, full_name')

    const profilesMap = new Map(allProfiles?.map(p => [p.id, p.full_name]) || [])

    projects = fetchedProjects.map((p: any) => ({
      ...p,
      profiles: { full_name: profilesMap.get(p.created_by) }
    }))
  }

  return (
    <ProjectsClient 
      initialProjects={projects || []} 
      isManager={isManager} 
      isAuditor={isAuditor} 
      isSuperAdmin={isSuperAdmin} 
      isDeveloper={isDeveloper}
    />
  )
}
