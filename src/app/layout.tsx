import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from 'sonner'
import NextTopLoader from 'nextjs-toploader'
import { createClient } from '@/lib/supabase/server'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Project Monitoring System',
  description: 'Project Monitoring System application',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: settings } = await supabase
    .from('system_details')
    .select('*')
    .eq('id', 1)
    .single()
    
  const primaryColor = settings?.primary_color || 'var(--sys-primary)'
  const systemName = settings?.system_name || 'Project Monitoring System'

  return (
    <html lang="en" className={settings?.theme === 'dark' ? 'dark' : ''}>
      <head>
        <title>{systemName}</title>
        <style dangerouslySetInnerHTML={{
          __html: `
            :root {
              --sys-primary: ${primaryColor};
            }
          `
        }} />
      </head>
      <body className={inter.className}>
        <NextTopLoader
          color="#3b82f6"
          initialPosition={0.08}
          crawlSpeed={200}
          height={3}
          crawl={true}
          showSpinner={true}
          easing="ease"
          speed={200}
          shadow="0 0 10px #3b82f6,0 0 5px #3b82f6"
        />
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  )
}
