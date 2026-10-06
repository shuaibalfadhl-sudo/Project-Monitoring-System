import { getUserProfile } from '@/lib/auth-utils'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'

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

  async function signOut() {
    'use server'
    const supabaseServer = await createClient()
    await supabaseServer.auth.signOut()
    revalidatePath('/')
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-[#f4f5f7] flex flex-col md:flex-row">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-[#263148] text-white p-6 shadow-xl flex flex-col">
        <div className="mb-10 text-center md:text-left">
          <h2 className="text-xl font-bold tracking-tight">Project System</h2>
          <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider">{profile.role.replace('_', ' ')}</p>
        </div>
        
        <nav className="flex-1 space-y-2">
          <Link href="/dashboard" className="block px-4 py-2.5 rounded-lg hover:bg-white/10 transition-colors bg-white/5 font-medium text-sm">
            Dashboard
          </Link>
          
          {isManager && (
            <>
              <Link href="/projects" className="block px-4 py-2.5 rounded-lg hover:bg-white/10 transition-colors font-medium text-sm text-slate-300">
                Projects
              </Link>
              <Link href="#" className="block px-4 py-2.5 rounded-lg hover:bg-white/10 transition-colors font-medium text-sm text-slate-300">
                Reports
              </Link>
            </>
          )}

          {isAuditor && (
            <>
              <Link href="/projects" className="block px-4 py-2.5 rounded-lg hover:bg-white/10 transition-colors font-medium text-sm text-slate-300">
                Assigned Projects
              </Link>
              <Link href="#" className="block px-4 py-2.5 rounded-lg hover:bg-white/10 transition-colors font-medium text-sm text-slate-300">
                QA Monitoring
              </Link>
              <Link href="#" className="block px-4 py-2.5 rounded-lg hover:bg-white/10 transition-colors font-medium text-sm text-slate-300">
                Project Progress
              </Link>
              <Link href="#" className="block px-4 py-2.5 rounded-lg hover:bg-white/10 transition-colors font-medium text-sm text-slate-300">
                Reports
              </Link>
            </>
          )}
        </nav>

        {/* User Profile & Logout at bottom */}
        <div className="pt-6 mt-6 border-t border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-300 flex items-center justify-center font-bold text-sm shrink-0">
                {(profile.full_name || 'U').charAt(0).toUpperCase()}
              </div>
              <div className="truncate">
                <p className="text-sm font-bold text-white truncate">{profile.full_name || 'User'}</p>
              </div>
            </div>
            
            <form action={signOut}>
              <button 
                type="submit" 
                className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors ml-2"
                title="Logout"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
