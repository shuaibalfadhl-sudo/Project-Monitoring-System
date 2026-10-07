'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

export default function SettingsPage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [isLoading, setIsLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
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

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!e.target.files || e.target.files.length === 0) return
      
      const file = e.target.files[0]
      setIsUploading(true)
      
      const fileExt = file.name.split('.').pop()
      const fileName = `logo-${Math.random().toString(36).substring(2, 9)}.${fileExt}`
      const filePath = `logos/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('system-assets')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data } = supabase.storage
        .from('system-assets')
        .getPublicUrl(filePath)

      setFormData(prev => ({ ...prev, system_logo_url: data.publicUrl }))
      toast.success('Logo uploaded successfully! Remember to save settings.')
    } catch (error: any) {
      toast.error(error.message || 'Error uploading logo')
    } finally {
      setIsUploading(false)
    }
  }

  if (isFetching || !isSuperAdmin) {
    return <div className="text-center py-12 text-gray-500 font-medium">Checking permissions...</div>
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8 sm:p-10 transition-colors duration-300">
        <h1 className="text-3xl font-extrabold text-[var(--sys-primary)] mb-2">System Settings</h1>
        <p className="text-gray-500 dark:text-slate-400 mb-8 font-medium">Manage global system configurations. This page is only visible to Super Administrators.</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">System Name</label>
            <input
              type="text"
              required
              className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium dark:text-white transition-colors"
              value={formData.system_name}
              onChange={(e) => setFormData({...formData, system_name: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">System Logo</label>
            <div className="flex items-center gap-4">
              {formData.system_logo_url && (
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 dark:bg-slate-800 flex items-center justify-center shrink-0 border border-gray-200 dark:border-slate-700">
                  <img src={formData.system_logo_url} alt="Logo" className="w-full h-full object-contain" />
                </div>
              )}
              <div className="flex-1">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  disabled={isUploading}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--sys-primary)] font-medium dark:text-white file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 dark:file:bg-blue-900/30 file:text-blue-700 dark:file:text-blue-400 hover:file:bg-blue-100 cursor-pointer disabled:opacity-50 transition-colors"
                />
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-2">
                  {isUploading ? 'Uploading...' : 'Upload a PNG, JPG, or SVG.'}
                </p>
              </div>
            </div>
            
            <div className="mt-4">
              <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-2">Or paste a URL directly</label>
              <input
                type="url"
                placeholder="https://example.com/logo.png"
                className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--sys-primary)] font-medium dark:text-white transition-colors"
                value={formData.system_logo_url}
                onChange={(e) => setFormData({...formData, system_logo_url: e.target.value})}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">Primary Color</label>
              <div className="flex gap-4 items-center">
                <input
                  type="color"
                  className="w-14 h-14 p-1 rounded-xl cursor-pointer border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  value={formData.primary_color}
                  onChange={(e) => setFormData({...formData, primary_color: e.target.value})}
                />
                <input
                  type="text"
                  className="flex-1 px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium font-mono dark:text-white transition-colors"
                  value={formData.primary_color}
                  onChange={(e) => setFormData({...formData, primary_color: e.target.value})}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">Theme</label>
              <select
                className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium dark:text-white transition-colors"
                value={formData.theme}
                onChange={(e) => setFormData({...formData, theme: e.target.value})}
              >
                <option value="light">Light Mode</option>
                <option value="dark">Dark Mode</option>
                <option value="system">System Default</option>
              </select>
            </div>
          </div>

          <div className="pt-6 border-t border-gray-100 dark:border-slate-800 flex justify-end">
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
