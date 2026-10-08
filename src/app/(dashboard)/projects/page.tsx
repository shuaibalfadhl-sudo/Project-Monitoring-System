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
    // RLS will enforce that we only see projects created by this user
    let query = supabase
      .from('projects')
      .select('*, project_modules(id, status), project_members(user_id)')
      .order('created_at', { ascending: false })
      
    if (activeCompanyId) {
      query = query.eq('company_id', activeCompanyId)
    }
      
    const { data } = await query
    projects = data || []
  } else if (isAuditor || isDeveloper) {
    // For auditors and developers, get the projects they are a member of
    let query = supabase
      .from('project_members')
      .select('projects!inner(*, project_modules(id, status), project_members(user_id))')
      .eq('user_id', user.id)
      
    if (activeCompanyId) {
      query = query.eq('projects.company_id', activeCompanyId)
    }
      
    const { data } = await query
    
    let fetchedProjects = data?.map(d => d.projects).filter(Boolean) || []
    
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
