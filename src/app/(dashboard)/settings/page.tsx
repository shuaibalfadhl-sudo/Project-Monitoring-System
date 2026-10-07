'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

export default function SettingsPage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(true)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [formData, setFormData] = useState({
    id: 1, // Single row id
    system_name: 'Project Monitoring System',
    system_logo_url: '',
    primary_color: '#2d3748',
    theme: 'light'
  })

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Check role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
        
      if (!profile || profile.role !== 'super_admin') {
        router.push('/dashboard')
        return
      }

      setIsSuperAdmin(true)

      // Fetch system settings
      const { data: settings } = await supabase
        .from('system_details')
        .select('*')
        .eq('id', 1)
        .single()
        
      if (settings) {
        setFormData({
          id: settings.id,
          system_name: settings.system_name || '',
          system_logo_url: settings.system_logo_url || '',
          primary_color: settings.primary_color || '#2d3748',
          theme: settings.theme || 'light'
        })
      }
      setIsFetching(false)
    }
    init()
  }, [supabase, router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)

    const { error } = await supabase
      .from('system_details')
      .upsert(formData)

    if (error) {
      toast.error(error.message)
    } else {
      // Clear local storage so global settings take precedence
      localStorage.removeItem('local-theme')
      
      // Immediately force the HTML tag to reflect the new theme
      const html = document.documentElement
      if (formData.theme === 'dark') {
        html.classList.add('dark')
      } else {
        html.classList.remove('dark')
      }

      toast.success('System settings updated successfully!')
      router.refresh()
    }
    setIsLoading(false)
  }

  if (isFetching || !isSuperAdmin) {
    return <div className="text-center py-12 text-gray-500 font-medium">Checking permissions...</div>
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8 sm:p-10">
        <h1 className="text-3xl font-extrabold text-[var(--sys-primary)] mb-2">System Settings</h1>
        <p className="text-gray-500 mb-8 font-medium">Manage global system configurations. This page is only visible to Super Administrators.</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">System Name</label>
            <input
              type="text"
              required
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              value={formData.system_name}
              onChange={(e) => setFormData({...formData, system_name: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">System Logo URL</label>
            <input
              type="url"
              placeholder="https://example.com/logo.png"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              value={formData.system_logo_url}
              onChange={(e) => setFormData({...formData, system_logo_url: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Primary Color</label>
              <div className="flex gap-4 items-center">
                <input
                  type="color"
                  className="w-14 h-14 p-1 rounded-xl cursor-pointer border border-gray-200"
                  value={formData.primary_color}
                  onChange={(e) => setFormData({...formData, primary_color: e.target.value})}
                />
                <input
                  type="text"
                  className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium font-mono"
                  value={formData.primary_color}
                  onChange={(e) => setFormData({...formData, primary_color: e.target.value})}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Theme</label>
              <select
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                value={formData.theme}
                onChange={(e) => setFormData({...formData, theme: e.target.value})}
              >
                <option value="light">Light Mode</option>
                <option value="dark">Dark Mode</option>
                <option value="system">System Default</option>
              </select>
            </div>
          </div>

          <div className="pt-6 border-t border-gray-100 flex justify-end">
            <button
              type="submit"
              disabled={isLoading}
              className="py-3 px-8 text-white bg-blue-600 hover:bg-blue-700 rounded-xl font-bold transition-colors shadow-lg shadow-blue-600/20 disabled:opacity-50"
            >
              {isLoading ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
