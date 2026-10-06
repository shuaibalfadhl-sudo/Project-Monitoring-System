'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

export default function CreateProjectPage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    start_date: '',
    target_date: '',
    status: 'planning'
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      toast.error('Authentication error')
      setIsLoading(false)
      return
    }

    // DEBUG: Check what the database actually thinks your role is
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (!profile || profile.role !== 'project_manager') {
      toast.error(`RLS BLOCKED: Your database profile role is "${profile?.role}". It must be "project_manager" to insert.`)
      console.error('Profile check failed:', profile)
      setIsLoading(false)
      return
    }

    const { error } = await supabase
      .from('projects')
      .insert({
        ...formData,
        created_by: user.id // Force the current user to be the creator
      })

    if (error) {
      console.error('SUPABASE INSERT ERROR FULL OBJECT:', JSON.stringify(error, null, 2))
      toast.error(`Error: ${error.message} (Code: ${error.code})`)
      setIsLoading(false)
    } else {
      toast.success('Project created successfully!')
      router.push('/projects')
      router.refresh()
    }
  }

  return (
    <div className="max-w-2xl mx-auto bg-white p-8 sm:p-10 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
      <h1 className="text-3xl font-extrabold text-[#2d3748] mb-8">Create Project</h1>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Project Name <span className="text-red-500">*</span></label>
          <input
            type="text"
            required
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2d3748] font-medium"
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
          <textarea
            rows={3}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2d3748] font-medium"
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Start Date</label>
            <input
              type="date"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2d3748] font-medium"
              value={formData.start_date}
              onChange={(e) => setFormData({...formData, start_date: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Target Date</label>
            <input
              type="date"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2d3748] font-medium"
              value={formData.target_date}
              onChange={(e) => setFormData({...formData, target_date: e.target.value})}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
          <select
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2d3748] font-medium"
            value={formData.status}
            onChange={(e) => setFormData({...formData, status: e.target.value})}
          >
            <option value="planning">Planning</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="on_hold">On Hold</option>
          </select>
        </div>

        <div className="pt-4 flex gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 py-3.5 px-4 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-xl font-bold transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 py-3.5 px-4 text-white bg-[#263148] hover:bg-[#1a2333] rounded-xl font-bold transition-colors shadow-lg disabled:opacity-50"
          >
            {isLoading ? 'Creating...' : 'Create Project'}
          </button>
        </div>
      </form>
    </div>
  )
}
