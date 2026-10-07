import { createClient } from '@/lib/supabase/server'
import { getUserProfile } from '@/lib/auth-utils'
import { redirect } from 'next/navigation'
import UsersClient from '@/components/users/UsersClient'

export default async function UsersPage() {
  const profile = await getUserProfile()

  if (!profile || profile.role !== 'super_admin') {
    redirect('/dashboard')
  }

  const supabase = await createClient()
  const { data: users, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching users:', error)
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
