import { getUserProfile } from '@/lib/auth-utils'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import SidebarNav from '@/components/layout/SidebarNav'
import TopNavbar from '@/components/layout/TopNavbar'
import { cookies } from 'next/headers'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const profile = await getUserProfile()
  
  if (!profile) {
    redirect('/login')
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

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col md:flex-row transition-colors duration-300">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white p-6 shadow-xl flex flex-col md:sticky md:top-0 md:h-screen z-20 transition-colors duration-300">
        <div className="mb-10">
          <div className="flex flex-col md:flex-row items-center md:items-center gap-3 text-center md:text-left">
            {settings?.system_logo_url && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={settings.system_logo_url} alt="System Logo" className="h-10 w-10 object-contain shrink-0" />
            )}
            <div>
              <h2 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
                {settings?.system_name || 'Project System'}
              </h2>
              <p className="text-[11px] font-bold text-[var(--sys-primary)] mt-1 uppercase tracking-wider">
                {profile.role.replace('_', ' ')}
              </p>
            </div>
          </div>
        </div>
        
        <SidebarNav role={profile.role} />
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-screen">
        <TopNavbar 
          profileName={profile.full_name || 'User'} 
          companies={companies || []}
          initialActiveCompanyId={activeCompanyId}
        />
        
        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
