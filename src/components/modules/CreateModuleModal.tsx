'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { STATUS_GROUPS, statusesIn } from '@/lib/moduleStatuses'
import { PLATFORM_OPTIONS, WORKSTREAM_OPTIONS } from '@/lib/moduleClassifications'
import { buildPrototypePath, deletePrototypeObject, uploadPrototypeWithProgress, validatePrototypeFile } from '@/lib/prototypes'

export default function CreateModuleModal({ projectId, isManager, canUploadPrototype }: { projectId: string, isManager?: boolean, canUploadPrototype?: boolean }) {
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const [isLoading, setIsLoading] = useState(false)
  const [prototypeFile, setPrototypeFile] = useState<File | null>(null)
  const prototypeInputRef = useRef<HTMLInputElement>(null)
  const [developers, setDevelopers] = useState<{ id: string, full_name: string }[]>([])
  const [isDevDropdownOpen, setIsDevDropdownOpen] = useState(false)
  const [devSearch, setDevSearch] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    priority: 'medium',
    status: 'pending',
    module_document_url: '',
    assigned_developer_id: '',
    category: 'new_module',
    platform: '',
    workstream: '',
    deadline: '',
    development_date: '',
    website_link: ''
  })

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!isOpen) return
    const fetchDevelopers = async () => {
      const { data, error } = await supabase
        .from('project_members')
        .select('user_id, profiles!inner(id, full_name, role)')
        .eq('project_id', projectId)
        .in('profiles.role', ['developer', 'devops'])

      if (!error && data) {
        setDevelopers(data.map((d: any) => ({
          id: d.profiles.id,
          full_name: d.profiles.full_name || 'Unnamed Developer'
        })))
      }
    }
    fetchDevelopers()
  }, [isOpen, projectId, supabase])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!formData.deadline) {
      toast.error('Please insert a deadline time')
      return
    }

    setIsLoading(true)

    const payload: Record<string, any> = {
      ...formData,
      project_id: projectId,
    }
    if (payload.development_date === '') {
      payload.development_date = null
    }
    // Empty selects must be stored as NULL; the DB CHECK constraints reject ''.
    if (payload.platform === '') payload.platform = null
    if (payload.workstream === '') payload.workstream = null
    if (payload.assigned_developer_id === '') payload.assigned_developer_id = null

    const { data: created, error } = await supabase
      .from('project_modules')
      .insert(payload)
      .select('id')
      .single()

    if (error || !created) {
      toast.error(error?.message || 'The module could not be added. Please try again.')
      setIsLoading(false)
      return
    }

    let prototypeWarning = ''
    let uploadedPrototypePath = ''
    if (prototypeFile) {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.access_token) {
          throw new Error('Your session expired. Refresh the page and try again.')
        }

        const path = buildPrototypePath(projectId, created.id, prototypeFile.name)
        uploadedPrototypePath = path
        await uploadPrototypeWithProgress({
          path,
          file: prototypeFile,
          accessToken: session.access_token,
        })

        const { data: linked, error: linkError } = await supabase
          .from('project_modules')
          .update({ prototype: path })
          .eq('id', created.id)
          .select('id')

        if (linkError) {
          throw new Error(
            linkError.code === '42501'
              ? 'You do not have permission to attach the prototype.'
              : linkError.message,
          )
        }
        if (!linked || linked.length === 0) {
          throw new Error('You do not have permission to attach the prototype.')
        }
      } catch (err) {
        console.error('Prototype upload during module creation failed', err)
        if (uploadedPrototypePath) {
          await deletePrototypeObject(supabase, uploadedPrototypePath)
        }
        prototypeWarning = err instanceof Error && err.message
          ? err.message
          : 'The prototype could not be uploaded.'
      }
    }

    if (prototypeWarning) {
      toast.error(`Module added, but the prototype was not attached: ${prototypeWarning}`)
    } else {
      toast.success('Module added successfully!')
    }

    setIsOpen(false)
    setPrototypeFile(null)
    if (prototypeInputRef.current) prototypeInputRef.current.value = ''

    setFormData({
      name: '',
      description: '',
      priority: 'medium',
      status: 'pending',
      module_document_url: '',
      assigned_developer_id: '',
      category: 'new_module',
      platform: '',
      workstream: '',
      deadline: '',
      development_date: '',
      website_link: ''
    })
    router.refresh()
    setIsLoading(false)
  }

  const handlePrototypeFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    const validationError = validatePrototypeFile(file)
    if (validationError) {
      toast.error(validationError)
      return
    }
    setPrototypeFile(file)
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="w-full sm:w-auto py-2 px-5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-[var(--sys-primary-text)] hover:bg-gray-50 dark:hover:bg-slate-700 hover:border-gray-300 dark:hover:border-slate-600 rounded-xl font-bold transition-all shadow-sm text-sm text-center"
      >
        + Add
      </button>

      {isOpen && mounted && createPortal(
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50/50 dark:bg-slate-900">
              <h2 className="text-xl font-extrabold text-[var(--sys-primary-text)]">Add Module</h2>
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
              <form id="create-module-form" onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">Module Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--sys-primary)] font-medium dark:text-white"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">Description</label>
                  <textarea
                    rows={3}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--sys-primary)] font-medium dark:text-white"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">Priority</label>
                    <select
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--sys-primary)] font-medium dark:text-white"
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
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
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    >
                      <option value="new_module">New Module</option>
                      <option value="revise_module">Revise Module</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">Platform</label>
                    <select
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--sys-primary)] font-medium dark:text-white"
                      value={formData.platform}
                      onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                    >
                      <option value="">Not set</option>
                      {PLATFORM_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">Workstream</label>
                    <select
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--sys-primary)] font-medium dark:text-white"
                      value={formData.workstream}
                      onChange={(e) => setFormData({ ...formData, workstream: e.target.value })}
                    >
                      <option value="">Not set</option>
                      {WORKSTREAM_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">Status</label>
                    <select
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--sys-primary)] font-medium dark:text-white"
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    >
                      {statusesIn(isManager ? STATUS_GROUPS.createManager : STATUS_GROUPS.createAll).map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">Deadline <span className="text-red-500">*</span></label>
                    <input
                      type="date"
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--sys-primary)] font-medium dark:text-white"
                      value={formData.deadline}
                      onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">Development Date</label>
                    <input
                      type="date"
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--sys-primary)] font-medium dark:text-white"
                      value={formData.development_date}
                      onChange={(e) => setFormData({ ...formData, development_date: e.target.value })}
                    />
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
                            onClick={() => { setFormData({ ...formData, assigned_developer_id: '' }); setIsDevDropdownOpen(false); setDevSearch(''); }}
                            className={`w-full text-left px-3 py-2.5 text-sm rounded-lg transition-colors ${!formData.assigned_developer_id ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-bold' : 'text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800'}`}
                          >
                            Unassigned
                          </button>
                          {developers.filter(d => d.full_name.toLowerCase().includes(devSearch.toLowerCase())).map(dev => (
                            <button
                              key={dev.id}
                              type="button"
                              onClick={() => { setFormData({ ...formData, assigned_developer_id: dev.id }); setIsDevDropdownOpen(false); setDevSearch(''); }}
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
                    onChange={(e) => setFormData({ ...formData, module_document_url: e.target.value })}
                  />
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-2">Provide a link to Google Drive, SharePoint, etc.</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">Website Link (Testing)</label>
                  <input
                    type="url"
                    placeholder="https://..."
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--sys-primary)] font-medium dark:text-white"
                    value={formData.website_link}
                    onChange={(e) => setFormData({ ...formData, website_link: e.target.value })}
                  />
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-2">Link for testing the module (e.g., staging or local URL).</p>
                </div>

                {canUploadPrototype && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">Prototype (HTML)</label>
                    <input
                      ref={prototypeInputRef}
                      type="file"
                      accept=".html,.htm,text/html"
                      className="hidden"
                      onChange={handlePrototypeFile}
                      disabled={isLoading}
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => prototypeInputRef.current?.click()}
                        disabled={isLoading}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white dark:bg-slate-800 text-[var(--sys-primary-text)] border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 transition-all disabled:opacity-60"
                      >
                        {prototypeFile ? 'Choose a different file' : 'Choose file'}
                      </button>
                      {prototypeFile ? (
                        <>
                          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[220px]" title={prototypeFile.name}>
                            {prototypeFile.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setPrototypeFile(null)
                              if (prototypeInputRef.current) prototypeInputRef.current.value = ''
                            }}
                            disabled={isLoading}
                            className="text-xs font-bold text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-60"
                          >
                            Remove
                          </button>
                        </>
                      ) : (
                        <span className="text-sm font-semibold text-gray-400 dark:text-slate-500 italic">No file selected</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-2">HTML only, up to 10 MB. The assigned developer can preview it in Dev Workspace.</p>
                  </div>
                )}
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
                form="create-module-form"
                type="submit"
                disabled={isLoading}
                className="px-6 py-2.5 text-white bg-[var(--sys-primary)] hover:bg-[#1a2333] rounded-xl font-bold transition-colors shadow-lg disabled:opacity-50"
              >
                {isLoading ? 'Adding...' : 'Add Module'}
              </button>
            </div>
          </div>
        </div>
        , document.body)}
    </>
  )
}
