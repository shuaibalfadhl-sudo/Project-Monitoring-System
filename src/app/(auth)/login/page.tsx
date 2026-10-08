import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { AuthClient } from '@/components/auth/AuthClient'

export const metadata: Metadata = {
  title: 'Login - Project Monitoring System',
  description: 'Sign in to your account',
}

export default async function LoginPage() {
  const supabase = await createClient()
  const { data: settings } = await supabase
    .from('system_details')
    .select('*')
    .eq('id', 1)
    .single()

  const systemName = settings?.system_name || 'Project Monitoring System'
  const logoUrl = settings?.system_logo_url || null
  const description = 'Performance highlights across projects and development activity.'
  
  return (
    <AuthClient 
      defaultMode="login"
      systemName={systemName}
      logoUrl={logoUrl}
      description={description}
    />
  )
}
