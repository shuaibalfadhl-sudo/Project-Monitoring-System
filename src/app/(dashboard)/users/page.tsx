import { createClient } from '@/lib/supabase/server'
import { getUserProfile } from '@/lib/auth-utils'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import UsersClient from '@/components/users/UsersClient'

export default async function UsersPage() {
  const profile = await getUserProfile()

  if (!profile || profile.role !== 'super_admin') {
    redirect('/dashboard')
  }

  const cookieStore = await cookies()
  const activeCompanyId = cookieStore.get('activeCompanyId')?.value || null;

  const supabase = await createClient()
  let users: any[] = []
  
  if (activeCompanyId) {
    const { data: members, error } = await supabase
      .from('company_members')
      .select('profiles!inner(*)')
      .eq('company_id', activeCompanyId)
      
    if (error) console.error('Error fetching company members:', error)
    if (members) users = members.map((m: any) => m.profiles)
  } else {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
      
    if (error) console.error('Error fetching users:', error)
    if (data) users = data
  }


  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">
          User Management
        </h1>
      </div>

      <UsersClient initialUsers={users || []} />
    </div>
  )
}
