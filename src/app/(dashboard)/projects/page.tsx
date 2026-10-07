import { createClient } from '@/lib/supabase/server'
import { hasRole } from '@/lib/auth-utils'
import { redirect } from 'next/navigation'
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

  if (isSuperAdmin) {
    const { data: allProjects, error } = await supabase
      .from('projects')
      .select('*, project_modules(id, status)')
      .order('created_at', { ascending: false })
      
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
    const { data } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false })
    projects = data || []
  } else if (isAuditor || isDeveloper) {
    // For auditors and developers, get the projects they are a member of
    const { data } = await supabase
      .from('project_members')
      .select('projects(*, project_modules(id, status))')
      .eq('user_id', user.id)
    
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
