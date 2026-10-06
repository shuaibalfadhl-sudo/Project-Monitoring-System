import { createClient } from '@/lib/supabase/server'
import { Profile } from '@/types/user'

export async function getUserProfile(): Promise<Profile | null> {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return null

  // Fetch profile from the database
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    // Graceful fallback if the profiles table doesn't exist yet or trigger failed.
    // Assigns a 'pending' role until the database assigns the proper role.
    return {
      id: user.id,
      email: user.email || '',
      full_name: user.user_metadata?.full_name || '',
      role: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  }

  return profile as Profile
}

export async function checkRole(allowedRoles: string[]) {
  const profile = await getUserProfile()
  if (!profile || !allowedRoles.includes(profile.role)) {
    return false
  }
  return true
}

export async function hasRole(role: string) {
  const profile = await getUserProfile()
  return profile?.role === role
}
