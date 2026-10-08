'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import SearchableSelect from '@/components/SearchableSelect'

export default function CreateProjectModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  
  const [isLoading, setIsLoading] = useState(false)
  const [companies, setCompanies] = useState<any[]>([])
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    start_date: '',
    target_date: '',
    status: 'planning',
    company_id: ''
  })

  useEffect(() => {
    setMounted(true)
    async function fetchCompanies() {
      const { data } = await supabase.from('companies').select('id, name').order('name')
      setCompanies(data || [])
      if (data && data.length > 0) {
        setFormData(prev => ({ ...prev, company_id: data[0].id }))
      }
    }
    fetchCompanies()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      toast.error('Authentication error')
      setIsLoading(false)
      return
    }

    const { error } = await supabase
      .from('projects')
      .insert({
        ...formData,
        created_by: user.id
      })

    if (error) {
      toast.error(`Error: ${error.message}`)
      setIsLoading(false)
    } else {
      toast.success('Project created successfully!')
      setIsOpen(false)
      setFormData({
        name: '',
        description: '',
        start_date: '',
        target_date: '',
        status: 'planning',
        company_id: companies.length > 0 ? companies[0].id : ''
      })
      router.refresh()
      setIsLoading(false)
    }
  }

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="py-2.5 px-6 bg-[var(--sys-primary)] text-white hover:bg-[#1a2333] rounded-xl font-bold transition-colors shadow-lg"
      >
        + Create Project
      </button>

      {isOpen && mounted && createPortal(
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50/50 dark:bg-slate-900">
              <h2 className="text-xl font-extrabold text-[var(--sys-primary)]">Create Project</h2>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 transition-colors p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <form id="create-project-form" onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">Project Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--sys-primary)] font-medium dark:text-white"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">Company <span className="text-red-500">*</span></label>
                  <SearchableSelect
                    options={companies}
                    value={formData.company_id}
                    onChange={(val) => setFormData({...formData, company_id: val})}
                    placeholder="Search and select a company..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">Description</label>
                  <textarea
                    rows={3}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--sys-primary)] font-medium dark:text-white"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">Start Date</label>
                    <input
                      type="date"
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--sys-primary)] font-medium dark:text-white"
                      value={formData.start_date}
                      onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">Target Date</label>
                    <input
                      type="date"
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--sys-primary)] font-medium dark:text-white"
                      value={formData.target_date}
                      onChange={(e) => setFormData({...formData, target_date: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">Status</label>
                  <select
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--sys-primary)] font-medium dark:text-white"
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                  >
                    <option value="planning">Planning</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="on_hold">On Hold</option>
                  </select>
                </div>
              </form>
            </div>

            <div className="p-6 border-t border-gray-100 dark:border-slate-800 flex justify-end gap-3 bg-white dark:bg-slate-900">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-6 py-2.5 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-xl font-bold transition-colors"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                form="create-project-form"
                type="submit"
                disabled={isLoading}
                className="px-6 py-2.5 text-white bg-[var(--sys-primary)] hover:bg-[#1a2333] rounded-xl font-bold transition-colors shadow-lg disabled:opacity-50"
              >
                {isLoading ? 'Creating...' : 'Create Project'}
              </button>
            </div>
          </div>
        </div>
      , document.body)}
    </>
  )
}
