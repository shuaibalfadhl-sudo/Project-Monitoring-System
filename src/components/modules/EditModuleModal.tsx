'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { ProjectModule, ModuleStatus } from '@/types/project'

export default function EditModuleModal({ module }: { module: ProjectModule }) {
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  
  const [isLoading, setIsLoading] = useState(false)
  const [developers, setDevelopers] = useState<{ id: string, full_name: string }[]>([])
  const [isDevDropdownOpen, setIsDevDropdownOpen] = useState(false)
  const [devSearch, setDevSearch] = useState('')
  
  const [formData, setFormData] = useState({
    name: module.name,
    description: module.description || '',
    priority: module.priority,
    status: module.status || 'pending',
    module_document_url: module.module_document_url || '',
    assigned_developer_id: module.assigned_developer_id || '',
    category: module.category || 'new_module'
  })

  useEffect(() => {
    setMounted(true)
    if (isOpen) {
      // Fetch developers assigned to this project
      const fetchDevelopers = async () => {
        const { data, error } = await supabase
          .from('project_members')
          .select('user_id, profiles!inner(id, full_name, role)')
          .eq('project_id', module.project_id)
          .eq('profiles.role', 'developer');
          
        if (!error && data) {
          const devs = data.map((d: any) => ({
            id: d.profiles.id,
            full_name: d.profiles.full_name || 'Unnamed Developer'
          }));
          setDevelopers(devs);
        }
      };
      
      fetchDevelopers();
    }
  }, [isOpen, module.project_id, supabase])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)

    const dataToSubmit = { ...formData };
    if (dataToSubmit.assigned_developer_id === '') {
      dataToSubmit.assigned_developer_id = null as any;
    }

    const { error } = await supabase
      .from('project_modules')
      .update(dataToSubmit)
      .eq('id', module.id)

    if (error) {
      toast.error(error.message)
      setIsLoading(false)
    } else {
      toast.success('Module updated successfully!')
      setIsOpen(false)
      router.refresh()
      setIsLoading(false)
    }
  }

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="text-sm font-semibold text-blue-600 hover:text-blue-800"
      >
        Edit
      </button>

      {isOpen && mounted && createPortal(
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50/50 dark:bg-slate-900">
              <h2 className="text-xl font-extrabold text-[var(--sys-primary)]">Edit Module</h2>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 transition-colors p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 text-left">
              <form id="edit-module-form" onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">Module Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--sys-primary)] font-medium dark:text-white"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
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
                    <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">Priority</label>
                    <select
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--sys-primary)] font-medium dark:text-white"
                      value={formData.priority}
                      onChange={(e) => setFormData({...formData, priority: e.target.value})}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">Category</label>
                    <select
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--sys-primary)] font-medium dark:text-white"
                      value={formData.category}
                      onChange={(e) => setFormData({...formData, category: e.target.value})}
                    >
                      <option value="new_module">New Module</option>
                      <option value="revise_module">Revise Module</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">Status</label>
                    <select
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--sys-primary)] font-medium dark:text-white"
                      value={formData.status}
                      onChange={(e) => setFormData({...formData, status: e.target.value as ModuleStatus})}
                    >
                      <option value="pending">Pending</option>
                      <option value="development">Development</option>
                      <option value="pm_review">PM Review</option>
                      <option value="for_qa">For QA</option>
                      <option value="auditing">Auditing</option>
                      <option value="revision">Revision</option>
                      <option value="revising">Revising</option>
                      <option value="qa_approved">QA Approved</option>
                      <option value="deployment">Deployment</option>
                      <option value="deployed">Deployed</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">Assign Developer</label>
                  <div className="relative">
                    <button 
                      type="button" 
                      onClick={() => setIsDevDropdownOpen(!isDevDropdownOpen)}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--sys-primary)] font-medium text-left flex justify-between items-center dark:text-white"
                    >
                      {formData.assigned_developer_id 
                        ? developers.find(d => d.id === formData.assigned_developer_id)?.full_name || 'Unknown' 
                        : 'Unassigned'}
                      <svg className={`w-4 h-4 text-gray-500 transition-transform ${isDevDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </button>
                    {isDevDropdownOpen && (
                      <div className="absolute z-10 w-full mt-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl shadow-xl max-h-60 flex flex-col overflow-hidden">
                        <div className="p-2 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/50">
                          <input 
                            type="text" 
                            placeholder="Search developer..." 
                            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--sys-primary)] dark:text-white"
                            value={devSearch}
                            onChange={(e) => setDevSearch(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            autoFocus
                          />
                        </div>
                        <div className="overflow-y-auto flex-1 p-1">
                          <button 
                            type="button"
                            onClick={() => { setFormData({...formData, assigned_developer_id: ''}); setIsDevDropdownOpen(false); setDevSearch(''); }}
                            className={`w-full text-left px-3 py-2.5 text-sm rounded-lg transition-colors ${!formData.assigned_developer_id ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-bold' : 'text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800'}`}
                          >
                            Unassigned
                          </button>
                          {developers.filter(d => d.full_name.toLowerCase().includes(devSearch.toLowerCase())).map(dev => (
                            <button 
                              key={dev.id}
                              type="button"
                              onClick={() => { setFormData({...formData, assigned_developer_id: dev.id}); setIsDevDropdownOpen(false); setDevSearch(''); }}
                              className={`w-full text-left px-3 py-2.5 text-sm rounded-lg transition-colors ${formData.assigned_developer_id === dev.id ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-bold' : 'text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800'}`}
                            >
                              {dev.full_name}
                            </button>
                          ))}
                          {developers.length > 0 && developers.filter(d => d.full_name.toLowerCase().includes(devSearch.toLowerCase())).length === 0 && (
                            <div className="px-3 py-4 text-center text-sm text-gray-500 dark:text-slate-400 italic">No developers found.</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  {developers.length === 0 && (
                    <p className="text-xs text-orange-500 mt-2 font-medium">No developers are assigned to this project yet.</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">Module Document Link (Optional)</label>
                  <input
                    type="url"
                    placeholder="https://..."
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--sys-primary)] font-medium dark:text-white"
                    value={formData.module_document_url}
                    onChange={(e) => setFormData({...formData, module_document_url: e.target.value})}
                  />
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-2">Provide a link to Google Drive, SharePoint, etc.</p>
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
                form="edit-module-form"
                type="submit"
                disabled={isLoading}
                className="px-6 py-2.5 text-white bg-[var(--sys-primary)] hover:bg-[#1a2333] rounded-xl font-bold transition-colors shadow-lg disabled:opacity-50"
              >
                {isLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      , document.body)}
    </>
  )
}
