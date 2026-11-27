'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { STATUS_GROUPS, statusesIn } from '@/lib/moduleStatuses'
import { PLATFORM_OPTIONS, WORKSTREAM_OPTIONS } from '@/lib/moduleClassifications'
import { buildPrototypePath, deletePrototypeObject, uploadPrototypeWithProgress, validatePrototypeFile } from '@/lib/prototypes'

const inputClass = 'w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[var(--sys-primary)] focus:ring-4 focus:ring-[var(--sys-primary)]/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100'
const labelClass = 'mb-2 block text-xs font-extrabold uppercase tracking-wide text-slate-600 dark:text-slate-300'

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
    const fetchAssignments = async () => {
      const { data, error } = await supabase
        .from('project_members')
        .select('user_id, profiles!inner(id, full_name, role)')
        .eq('project_id', projectId)
        .in('profiles.role', ['developer', 'devops', 'trainee'])

      if (!error && data) {
        setDevelopers(data.map((d: any) => ({
          id: d.profiles.id,
          full_name: d.profiles.full_name || 'Unnamed Developer'
        })))
      }
    }
    fetchAssignments()
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
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-bold text-[var(--sys-primary-text)] shadow-sm transition-all hover:border-gray-300 hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 sm:w-auto"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v14M5 12h14" />
        </svg>
        Add Module
      </button>

      {isOpen && mounted && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-3 backdrop-blur-sm sm:p-6">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-module-title"
            className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-gray-100 bg-gray-50/70 px-5 py-5 dark:border-slate-800 dark:bg-slate-900 sm:px-8">
              <div className="flex items-center gap-3.5">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--sys-primary)]/10 text-[var(--sys-primary-text)]">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5v-9Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="m4 7.5 8 4.5 8-4.5M12 12v9M8 5.25l8 4.5" />
                  </svg>
                </span>
                <div>
                  <h2 id="create-module-title" className="text-xl font-extrabold tracking-tight text-[var(--sys-primary-text)]">Add Module</h2>
                  <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400 sm:text-sm">Create a module and set its initial workflow details.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close add module dialog"
                className="shrink-0 rounded-full p-2 text-slate-400 transition-colors hover:bg-gray-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto bg-slate-50/60 px-5 py-6 dark:bg-slate-950/30 sm:px-8 sm:py-8">
              <form id="create-module-form" onSubmit={handleSubmit} className="space-y-6">
                <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800/60 sm:p-6">
                  <div className="mb-5">
                    <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-100">Module Details</h3>
                    <p className="mt-1 text-xs font-medium text-slate-400">Give the module a clear name and describe its scope.</p>
                  </div>
                  <div className="grid gap-5 lg:grid-cols-12">
                    <div className="lg:col-span-8">
                      <label htmlFor="create-module-name" className={labelClass}>Module Name <span className="text-red-500">*</span></label>
                      <input
                        id="create-module-name"
                        type="text"
                        required
                        autoFocus
                        className={inputClass}
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g. Customer Portal Dashboard"
                      />
                    </div>
                    <div className="lg:col-span-4">
                      <label htmlFor="create-module-category" className={labelClass}>Category</label>
                      <select
                        id="create-module-category"
                        className={inputClass}
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      >
                        <option value="new_module">New Module</option>
                        <option value="revise_module">Revise Module</option>
                      </select>
                    </div>
                    <div className="lg:col-span-12">
                      <label htmlFor="create-module-description" className={labelClass}>Description</label>
                      <textarea
                        id="create-module-description"
                        rows={4}
                        className={`${inputClass} resize-none leading-6`}
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Summarize the module requirements, expected outcome, and important notes..."
                      />
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800/60 sm:p-6">
                  <div className="mb-5">
                    <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-100">Classification & Schedule</h3>
                    <p className="mt-1 text-xs font-medium text-slate-400">Set the module’s priority, workflow status, and target dates.</p>
                  </div>
                  <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                    <div>
                      <label htmlFor="create-module-priority" className={labelClass}>Priority</label>
                      <select
                        id="create-module-priority"
                        className={inputClass}
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
                      <label htmlFor="create-module-platform" className={labelClass}>Platform</label>
                      <select
                        id="create-module-platform"
                        className={inputClass}
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
                      <label htmlFor="create-module-workstream" className={labelClass}>Workstream</label>
                      <select
                        id="create-module-workstream"
                        className={inputClass}
                        value={formData.workstream}
                        onChange={(e) => setFormData({ ...formData, workstream: e.target.value })}
                      >
                        <option value="">Not set</option>
                        {WORKSTREAM_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="create-module-status" className={labelClass}>Status</label>
                      <select
                        id="create-module-status"
                        className={inputClass}
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      >
                        {statusesIn(isManager ? STATUS_GROUPS.createManager : STATUS_GROUPS.createAll).map((s) => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="create-module-deadline" className={labelClass}>Deadline <span className="text-red-500">*</span></label>
                      <input
                        id="create-module-deadline"
                        type="date"
                        required
                        className={inputClass}
                        value={formData.deadline}
                        onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                      />
                    </div>
                    <div>
                      <label htmlFor="create-module-development-date" className={labelClass}>Development Date</label>
                      <input
                        id="create-module-development-date"
                        type="date"
                        className={inputClass}
                        value={formData.development_date}
                        onChange={(e) => setFormData({ ...formData, development_date: e.target.value })}
                      />
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800/60 sm:p-6">
                  <div className="mb-5">
                    <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-100">Assignment & Resources</h3>
                    <p className="mt-1 text-xs font-medium text-slate-400">Assign the developer and attach the links or prototype needed to start.</p>
                  </div>
                  <div className="grid gap-5 lg:grid-cols-2">
                    <div>
                      <label htmlFor="create-module-developer" className={labelClass}>Assign Developer</label>
                      <div className="relative">
                        <button
                          id="create-module-developer"
                          type="button"
                          aria-haspopup="listbox"
                          aria-expanded={isDevDropdownOpen}
                          aria-controls="create-module-developer-options"
                          onClick={() => setIsDevDropdownOpen(!isDevDropdownOpen)}
                          className={`${inputClass} flex items-center justify-between gap-3 text-left`}
                        >
                          <span className="flex min-w-0 items-center gap-2.5">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300">
                              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21a8 8 0 0 1 16 0" />
                              </svg>
                            </span>
                            <span className="truncate">
                              {formData.assigned_developer_id
                                ? developers.find(d => d.id === formData.assigned_developer_id)?.full_name || 'Unknown'
                                : 'Unassigned'}
                            </span>
                          </span>
                          <svg className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${isDevDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        {isDevDropdownOpen && (
                          <div className="absolute z-30 mt-2 flex max-h-64 w-full flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
                            <div className="border-b border-gray-100 bg-gray-50/70 p-2 dark:border-slate-800 dark:bg-slate-800/70">
                              <input
                                type="text"
                                aria-label="Search developers"
                                placeholder="Search developer..."
                                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[var(--sys-primary)] focus:ring-2 focus:ring-[var(--sys-primary)]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                                value={devSearch}
                                onChange={(e) => setDevSearch(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                autoFocus
                              />
                            </div>
                            <div id="create-module-developer-options" role="listbox" className="no-scrollbar flex-1 overflow-y-auto p-1">
                              <button
                                type="button"
                                role="option"
                                aria-selected={!formData.assigned_developer_id}
                                onClick={() => { setFormData({ ...formData, assigned_developer_id: '' }); setIsDevDropdownOpen(false); setDevSearch(''); }}
                                className={`w-full rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition-colors ${!formData.assigned_developer_id ? 'bg-[var(--sys-primary)]/10 text-[var(--sys-primary-text)]' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'}`}
                              >
                                Unassigned
                              </button>
                              {developers.filter(d => d.full_name.toLowerCase().includes(devSearch.toLowerCase())).map(dev => (
                                <button
                                  key={dev.id}
                                  type="button"
                                  role="option"
                                  aria-selected={formData.assigned_developer_id === dev.id}
                                  onClick={() => { setFormData({ ...formData, assigned_developer_id: dev.id }); setIsDevDropdownOpen(false); setDevSearch(''); }}
                                  className={`w-full truncate rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition-colors ${formData.assigned_developer_id === dev.id ? 'bg-[var(--sys-primary)]/10 text-[var(--sys-primary-text)]' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'}`}
                                >
                                  {dev.full_name}
                                </button>
                              ))}
                              {developers.length > 0 && developers.filter(d => d.full_name.toLowerCase().includes(devSearch.toLowerCase())).length === 0 && (
                                <div className="px-3 py-4 text-center text-sm font-medium italic text-slate-400">No developers found.</div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      {developers.length === 0 && (
                        <p className="mt-2 text-xs font-medium text-amber-600 dark:text-amber-400">No developers are assigned to this project yet.</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="create-module-document" className={labelClass}>Module Document Link <span className="font-medium normal-case tracking-normal text-slate-400">(optional)</span></label>
                      <input
                        id="create-module-document"
                        type="url"
                        placeholder="https://..."
                        className={inputClass}
                        value={formData.module_document_url}
                        onChange={(e) => setFormData({ ...formData, module_document_url: e.target.value })}
                      />
                      <p className="mt-2 text-xs font-medium text-slate-400">Google Drive, SharePoint, or another shared document.</p>
                    </div>

                    <div className="lg:col-span-2">
                      <label htmlFor="create-module-website" className={labelClass}>Website Link <span className="font-medium normal-case tracking-normal text-slate-400">(testing)</span></label>
                      <input
                        id="create-module-website"
                        type="url"
                        placeholder="https://..."
                        className={inputClass}
                        value={formData.website_link}
                        onChange={(e) => setFormData({ ...formData, website_link: e.target.value })}
                      />
                      <p className="mt-2 text-xs font-medium text-slate-400">Staging or local URL used to test the module.</p>
                    </div>

                    {canUploadPrototype && (
                      <div className="rounded-2xl border border-dashed border-gray-300 bg-slate-50/80 p-4 dark:border-slate-600 dark:bg-slate-900/50 lg:col-span-2">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--sys-primary)]/10 text-[var(--sys-primary-text)]">
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 3h6l4 4v14H5V3h4Z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 3v5h6V3M8 14l2.5 2.5L16 11" />
                            </svg>
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-extrabold uppercase tracking-wide text-slate-600 dark:text-slate-300">Prototype <span className="font-medium normal-case tracking-normal text-slate-400">(HTML, optional)</span></p>
                            {prototypeFile ? (
                              <div className="mt-2 flex min-w-0 items-center gap-2">
                                <span className="truncate text-sm font-semibold text-slate-700 dark:text-slate-200" title={prototypeFile.name}>{prototypeFile.name}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPrototypeFile(null)
                                    if (prototypeInputRef.current) prototypeInputRef.current.value = ''
                                  }}
                                  disabled={isLoading}
                                  className="shrink-0 text-xs font-bold text-red-500 hover:text-red-700 disabled:opacity-50 dark:text-red-400 dark:hover:text-red-300"
                                >
                                  Remove
                                </button>
                              </div>
                            ) : (
                              <p className="mt-1 text-xs font-medium text-slate-400">HTML only, up to 10 MB. The assigned developer can preview it in Dev Workspace.</p>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => prototypeInputRef.current?.click()}
                            disabled={isLoading}
                            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-bold text-[var(--sys-primary-text)] transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 16V4m-4 4 4-4 4 4M4 16v4h16v-4" />
                            </svg>
                            {prototypeFile ? 'Replace file' : 'Choose HTML file'}
                          </button>
                          <input
                            ref={prototypeInputRef}
                            type="file"
                            accept=".html,.htm,text/html"
                            className="hidden"
                            onChange={handlePrototypeFile}
                            disabled={isLoading}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </section>
              </form>
            </div>

            <div className="flex shrink-0 flex-col-reverse gap-4 border-t border-gray-100 bg-white px-5 py-5 dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between sm:px-8">
              <p className="text-center text-xs font-medium text-slate-400 sm:text-left">Fields marked with <span className="font-bold text-red-500">*</span> are required.</p>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex-1 rounded-xl bg-gray-100 px-6 py-3 text-sm font-bold text-slate-600 transition-colors hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 sm:flex-none"
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button
                  form="create-module-form"
                  type="submit"
                  disabled={isLoading}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--sys-primary)] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-[var(--sys-primary)]/15 transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
                >
                  {isLoading ? (
                    <>
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <circle className="opacity-25" cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4Z" />
                      </svg>
                      Adding...
                    </>
                  ) : (
                    <>
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v14M5 12h14" />
                      </svg>
                      Add Module
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
        , document.body)}
    </>
  )
}
